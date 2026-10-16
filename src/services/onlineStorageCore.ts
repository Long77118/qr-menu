/**
 * Online Storage & Synchronization Service using Firestore
 */
import {
  doc,
  getDoc,
  getDocFromServer,
  writeBatch,
  updateDoc,
  collection,
  query,
  where,
  getDocsFromServer,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { ShopData, MenuItem, MenuCategory, ShopSettings } from '../types/menu';
import { StorageService } from './storage';
import { sanitizeShopData } from '../utils/sanitizeShopData';
import { getPublicMenuItems } from '../utils/publicMenu';
import { menuDirectoryEntry } from '../utils/menuDirectory';
import { createOperationQueue } from '../utils/operationQueue';
import { OperationResult } from '../types/operations';
import { createCoalescedWrites } from '../utils/coalescedWrites';
import { assertDraftBudget, draftSignature } from './menuMediaCore';
import { dataMetrics, type DataMetrics } from './dataMetrics';

export interface CloudShopRecord {
  id: string;
  ownerId: string;
  name: string;
  draft: ShopData;
  hasPublished: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface CloudPublishedMenu {
  shopId: string;
  ownerId: string;
  shop: ShopSettings;
  categories: MenuCategory[];
  items: MenuItem[];
  publishedAt: string;
  version?: number;
}

export interface OnlineStorageDependencies {
  db: Firestore;
  auth: { currentUser: { uid: string; email?: string | null; displayName?: string | null } | null };
  isOnline?: () => boolean;
  prepareDraft?: (draft:ShopData, ownerId:string) => Promise<ShopData>;
  saveDelayMs?: number;
  metrics?: DataMetrics;
}

/** Bind a service to explicit dependencies; emulator tests never import production Firebase. */
export function createOnlineStorageService(dependencies: OnlineStorageDependencies) {
  const getActiveDb = () => dependencies.db;
  const getActiveUser = () => dependencies.auth.currentUser;
  const enqueue = createOperationQueue();
  const metrics=dependencies.metrics||dataMetrics;
  type SaveRequest = {snapshot:ShopData;cached:ReturnType<typeof StorageService.savePendingDraft>;ownerId:string};
  const coalesced=createCoalescedWrites<SaveRequest,OperationResult>(enqueue,dependencies.saveDelayMs??600);
  const acknowledgedDrafts=new Map<string,{signature:string;time:number}>();
  const prepare=async (snapshot:ShopData,ownerId:string)=>sanitizeShopData(dependencies.prepareDraft?await dependencies.prepareDraft(snapshot,ownerId):snapshot);
  const lastSave = new Map<string, OperationResult>();
  let replay: Promise<OperationResult[]> | undefined;
  const isOnline = () => dependencies.isOnline?.() ?? (typeof navigator === 'undefined' || navigator.onLine !== false);
  return {
  /**
   * Save Draft to Firestore under `/shops/{shopId}`
   * 
   * Semantics:
   * Replaces the entire `draft` snapshot so that when optional fields (such as logoUrl, coverUrl,
   * headerBackground, or item description/imageUrl) are removed, they are truly deleted from Firestore,
   * avoiding `setDoc(..., { merge: true })` leaving stale nested fields behind.
   * Preserves top-level metadata: id, ownerId, createdAt, hasPublished.
   */
  async saveDraft(shopId: string, draftData: ShopData): Promise<OperationResult> {
    metrics.record({draftSaveRequests:1});
    const user = getActiveUser();
    let snapshot: ShopData;
    try { snapshot = sanitizeShopData(draftData); }
    catch (error) {
      const result = { success: false, error: String(error) };
      if (user) { coalesced.flush(`${user.uid}:${shopId}`); return enqueue(`${user.uid}:${shopId}`, async () => {
        lastSave.set(`${user.uid}:${shopId}`, result);
        return result;
      }); }
      return result;
    }
    if (!user) return { ...StorageService.saveDraft(shopId, snapshot), storage: 'local' };
    const cached = StorageService.savePendingDraft(shopId, snapshot, user.uid);
    const key = `${user.uid}:${shopId}`;
    return coalesced.schedule(key,{snapshot,cached,ownerId:user.uid},async request => {
      let {snapshot,cached,ownerId}=request;
      let result: OperationResult;
      try {
        if (getActiveUser()?.uid !== ownerId) throw new Error('Phiên đăng nhập đã thay đổi.');
        if (!cached.success && StorageService.getPendingDraft(shopId, ownerId)) {
          throw new Error('Không lưu được nháp mới trên thiết bị. Hãy giảm dung lượng lưu trữ rồi lưu lại để tránh đồng bộ nhầm nháp cũ.');
        }
        if (!isOnline()) throw new Error(cached.success
          ? 'Đã lưu nháp trên thiết bị; đang chờ kết nối để đồng bộ.'
          : 'Mất kết nối và không lưu được bản nháp trên thiết bị.');
        snapshot=await prepare(snapshot,ownerId);
        if(getActiveUser()?.uid!==ownerId)throw new Error('Phiên đăng nhập đã thay đổi.');
        assertDraftBudget(snapshot);
        const signature=draftSignature(snapshot),last=acknowledgedDrafts.get(key);
        // Short-lived deduplication only; manual saves later still reach the server.
        const unchanged=last?.signature===signature && Date.now()-last.time<2000;
        if(!unchanged){
          await updateDoc(doc(getActiveDb(), 'shops', shopId), {
            name: snapshot.shop.name || 'Quán ăn', draft: snapshot, updatedAt: serverTimestamp(),
          });
          acknowledgedDrafts.set(key,{signature,time:Date.now()});
          metrics.record({draftWriteAcks:1});
        }
        else metrics.record({unchangedDraftWrites:1});
        const acknowledged = cached.success ? StorageService.acknowledgeDraft(shopId, ownerId, cached.token, snapshot) : cached;
        result = { success: true, storage: 'cloud', savedDraft:snapshot, unchanged, cacheWarning: acknowledged.success ? undefined : acknowledged.error };
      } catch (error) {
        metrics.record({syncFailures:1});
        result = { success: false, pending: cached.success, error: error instanceof Error ? error.message : String(error) };
      }
      lastSave.set(key, result);
      return result;
    });
  },

  /** Capture the requested snapshot; public menu/private draft/status commit atomically. */
  async publishShop(shopId: string, requestedDraft?: ShopData): Promise<OperationResult> {
    const user = getActiveUser();
    let snapshot: ShopData | undefined;
    try { if (requestedDraft) snapshot = sanitizeShopData(requestedDraft); }
    catch (error) { return { success: false, error: String(error) }; }
    if (!user) {
      if (snapshot) {
        const saved = StorageService.saveDraft(shopId, snapshot);
        if (!saved.success) return { ...saved, storage: 'local' };
      }
      return { ...StorageService.publishShop(shopId), storage: 'local' };
    }
    // Cache the requested draft now. Later edits can safely replace it while the batch waits.
    const pendingPublish = snapshot ? StorageService.savePendingDraft(shopId, snapshot, user.uid) : undefined;
    const key = `${user.uid}:${shopId}`;
    coalesced.flush(key);
    return enqueue(key, async () => {
      try {
        if (getActiveUser()?.uid !== user.uid) throw new Error('Phiên đăng nhập đã thay đổi.');
        if (pendingPublish?.success === false && StorageService.getPendingDraft(shopId, user.uid)) {
          throw new Error('Không giữ được nháp mới trên thiết bị. Hãy giải phóng dung lượng rồi lưu lại trước khi xuất bản.');
        }
        if (!isOnline()) throw new Error(pendingPublish?.success || StorageService.getPendingDraft(shopId, user.uid)
          ? 'Chưa có kết nối. Bản nháp được giữ lại; hãy xuất bản khi có mạng.'
          : 'Chưa có kết nối và không lưu được bản nháp trên thiết bị.');
        const availability = await getDocFromServer(doc(getActiveDb(), 'shop_controls', shopId));
        if (availability.data()?.status === 'suspended') throw new Error('Quán đang tạm ngưng. Bạn có thể lưu nháp nhưng chưa thể xuất bản.');
        if (!snapshot) {
          if (lastSave.get(key)?.success === false || StorageService.getPendingDraft(shopId, user.uid)) throw new Error('Bản nháp chưa lưu thành công. Vui lòng lưu lại trước khi xuất bản.');
          const saved = await getDocFromServer(doc(getActiveDb(), 'shops', shopId));
          if (!saved.exists()) throw new Error('Không tìm thấy dữ liệu quán để xuất bản!');
          snapshot = sanitizeShopData(saved.data().draft);
        }
        if (snapshot.shop.id !== shopId) throw new Error('Mã quán trong bản nháp không khớp.');
        if (!snapshot.shop.name.trim()) throw new Error('Tên quán không được để trống!');
        snapshot=await prepare(snapshot,user.uid);
        if(getActiveUser()?.uid!==user.uid)throw new Error('Phiên đăng nhập đã thay đổi.');
        assertDraftBudget(snapshot);
        const publicItems = getPublicMenuItems(snapshot.items);
        if (!publicItems.length) throw new Error('Cần có ít nhất 1 món không bị ẩn để xuất bản.');
        const publishedAt = new Date().toISOString();
        const batch = writeBatch(getActiveDb());
        batch.set(doc(getActiveDb(), 'menu_directory', shopId), menuDirectoryEntry(snapshot.shop, publishedAt));
        batch.set(doc(getActiveDb(), 'published_menus', shopId), {
          shopId, ownerId: user.uid, shop: snapshot.shop,
          categories: snapshot.categories, items: publicItems, publishedAt,
        });
        batch.update(doc(getActiveDb(), 'shops', shopId), {
          draft: snapshot, name: snapshot.shop.name, hasPublished: true, updatedAt: serverTimestamp(),
        });
        await batch.commit();
        metrics.record({publishWriteAcks:3});
        acknowledgedDrafts.set(key,{signature:draftSignature(snapshot),time:Date.now()});
        const acknowledged = pendingPublish?.success ? StorageService.acknowledgeDraft(shopId, user.uid, pendingPublish.token, snapshot) : pendingPublish;
        const mirrored = StorageService.mirrorPublishedShop(shopId, {
          ...snapshot, items: publicItems, publishedAt,
        });
        lastSave.set(key, { success: true, storage: 'cloud' });
        return { success: true, storage: 'cloud', savedDraft:snapshot, cacheWarning: acknowledged?.success === false ? acknowledged.error : mirrored.success ? undefined : mirrored.error };
      } catch (error) {
        metrics.record({syncFailures:1});
        return { success: false, pending: !!StorageService.getPendingDraft(shopId, user.uid), error: error instanceof Error ? error.message : String(error) };
      }
    });
  },
  syncPendingDrafts(): Promise<OperationResult[]> {
    if (replay) return replay;
    const user = getActiveUser();
    if (!user || !isOnline()) return Promise.resolve([]);
    replay = (async () => {
      const results: OperationResult[] = [];
      for (const shopId of StorageService.listPendingDrafts(user.uid)) {
        if (getActiveUser()?.uid !== user.uid) break;
        const pending = StorageService.getPendingDraft(shopId, user.uid);
        if (pending) results.push(await this.saveDraft(shopId, pending.draft));
      }
      return results;
    })().finally(() => { replay = undefined; });
    return replay;
  },
  /**
   * Fetch Published Menu from Cloud (for guest view or sync)
   */
  async getPublishedMenu(shopId: string): Promise<ShopData | null> {
    const activeDb = getActiveDb();
    try {
      const pubDocRef = doc(activeDb, 'published_menus', shopId);
      const snap = await getDoc(pubDocRef);
      if (snap.exists()) {
        const data = snap.data() as CloudPublishedMenu;
        return {
          shop: data.shop,
          categories: data.categories || [],
          items: data.items || [],
          publishedAt: data.publishedAt,
        };
      }
      return null;
    } catch (err) {
      console.warn(`Could not load online published menu for ${shopId}:`, err);
      if ((err as { code?: string }).code === 'permission-denied') return null;
    }

    // Fallback to cached published data
    const local = StorageService.getPublishedShop(shopId);
    if (local) return local;

    return null;
  },

  /**
   * Real-time listener for customer QR view
   */
  subscribeToPublishedMenu(
    shopId: string,
    onUpdate: (data: ShopData | null) => void,
    onError?: (error: any) => void
  ) {
    const activeDb = getActiveDb();
    const pubDocRef = doc(activeDb, 'published_menus', shopId);
    let blocked = false;
    let unsubscribeMenu: (() => void) | undefined;
    const startMenu = () => {
      if (unsubscribeMenu) return;
      unsubscribeMenu = onSnapshot(
      pubDocRef,
      (snap) => {
        if (blocked) { onUpdate(null); return; }
        if (snap.exists()) {
          const data = snap.data() as CloudPublishedMenu;
          onUpdate({
            shop: data.shop,
            categories: data.categories || [],
            items: data.items || [],
            publishedAt: data.publishedAt,
          });
        } else {
          // A cloud menu removed from the server must not reappear from local storage.
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Realtime menu subscription error:', error);
        if (onError) onError(error);
        if (blocked || error.code === 'permission-denied') { onUpdate(null); return; }
        const local = StorageService.getPublishedShop(shopId);
        onUpdate(local || null);
      }
      );
    };
    startMenu();
    const unsubscribeControl = onSnapshot(doc(activeDb, 'shop_controls', shopId), snapshot => {
      blocked = snapshot.data()?.status === 'suspended';
      if (blocked) {
        unsubscribeMenu?.(); unsubscribeMenu = undefined;
        onUpdate(null);
      } else if (!unsubscribeMenu) startMenu();
    }, error => {
      if (error.code === 'permission-denied') {
        blocked = true; unsubscribeMenu?.(); unsubscribeMenu = undefined; onUpdate(null);
      }
      onError?.(error);
    });
    return () => { unsubscribeControl(); unsubscribeMenu?.(); };
  },

  /**
   * Load owner's shop data from Firestore
   */
  async loadOwnerShop(shopId: string): Promise<{ draft: ShopData; isPublished: boolean; pending?: boolean; offline?: boolean } | null> {
    const user = getActiveUser();
    const local = StorageService.getShop(shopId);
    if (!user) return local ? { draft: local.draft, isPublished: !!local.published } : null;
    const pending = StorageService.getPendingDraft(shopId, user.uid);
    if (pending) return { draft: pending.draft, isPublished: !!local?.published, pending: true, offline: !isOnline() };
    try {
      if (!isOnline()) throw Object.assign(new Error('Thiết bị đang offline.'), { code: 'unavailable' });
      const snap = await getDocFromServer(doc(getActiveDb(), 'shops', shopId));
      if (!snap.exists()) return null;
      const data = snap.data();
      if (data.ownerId !== user.uid) throw new Error('Quán không thuộc tài khoản hiện tại.');
      // A user may have edited while the server read was in flight.
      const newer = StorageService.getPendingDraft(shopId, user.uid);
      if (newer) return { draft: newer.draft, isPublished: !!data.hasPublished, pending: true };
      StorageService.saveDraft(shopId, data.draft);
      return { draft: data.draft, isPublished: !!data.hasPublished };
    } catch (error) {
      const code = (error as { code?: string }).code;
      const cachedOwner = StorageService.getCurrentUser();
      if ((code === 'unavailable' || code === 'deadline-exceeded') && local
        && cachedOwner?.id === user.uid && cachedOwner.shopId === shopId) {
        return { draft: local.draft, isPublished: !!local.published, offline: true };
      }
      throw error;
    }
  },
  /**
   * Load all shops owned by the logged-in user
   */
  async getUserShops(ownerUid: string): Promise<string[]> {
    if (getActiveUser()?.uid !== ownerUid) throw new Error('Phiên đăng nhập không khớp.');
    if (!isOnline()) throw Object.assign(new Error('Không thể kiểm tra quán khi offline.'), { code: 'unavailable' });
    const q = query(collection(getActiveDb(), 'shops'), where('ownerId', '==', ownerUid));
    const snaps = await getDocsFromServer(q);
    return snaps.docs.map((entry) => entry.id).sort();
  },
  /**
   * Create a new shop online
   */
  async createNewShopOnline(
    shopSettings: {
      name: string;
      tagline?: string;
      description?: string;
      address?: string;
      phone?: string;
      themeColor?: string;
    },

  ): Promise<{ shopId: string; draft: ShopData }> {
    const user = getActiveUser();
    const activeDb = getActiveDb();

    if (!user) throw new Error('Bạn chưa đăng nhập.');
    if (!isOnline()) throw new Error('Cần kết nối mạng để tạo quán.');
    const owned = await this.getUserShops(user.uid);
    if (owned.length) {
      const existing = await this.loadOwnerShop(owned[0]);
      if (!existing) throw new Error('Không tìm thấy quán đã liên kết.');
      return { shopId: owned[0], draft: existing.draft };
    }

    // Generate permanent clean slug
    const cleanSlug = shopSettings.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);

    const randomSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const shopId = (cleanSlug || 'quan') + '-' + randomSuffix;

    const baseData: ShopData = {
          shop: {
            id: shopId,
            name: shopSettings.name,
            tagline: shopSettings.tagline || '',
            description: shopSettings.description || '',
            address: shopSettings.address || '',
            phone: shopSettings.phone || '',
            themeColor: shopSettings.themeColor || '#1B4D3E',
          },
          categories: [
            { id: 'cat-new-1', name: 'Món ăn', order: 1 },
            { id: 'cat-new-2', name: 'Đồ uống', order: 2 },
          ],
          items: [],
        };

    baseData.shop.id = shopId;
    baseData.shop.name = shopSettings.name;
    if (shopSettings.tagline) baseData.shop.tagline = shopSettings.tagline;
    if (shopSettings.description) baseData.shop.description = shopSettings.description;
    if (shopSettings.address) baseData.shop.address = shopSettings.address;
    if (shopSettings.phone) baseData.shop.phone = shopSettings.phone;
    if (shopSettings.themeColor) baseData.shop.themeColor = shopSettings.themeColor;

    // Sanitize payload at boundary before writing
    const sanitizedDraft = sanitizeShopData(baseData);

    // The private profile acts as the provisioning lock. Concurrent tabs retry the transaction
    // and adopt the already-created shop instead of creating duplicate restaurants.
    const created = await runTransaction(activeDb, async (transaction) => {
      if (getActiveUser()?.uid !== user.uid) throw new Error('Phiên đăng nhập đã thay đổi.');
      const userRef = doc(activeDb, 'users', user.uid);
      const profile = await transaction.get(userRef);
      const activeShopId = profile.data()?.activeShopId;
      if (activeShopId) {
        const existing = await transaction.get(doc(activeDb, 'shops', activeShopId));
        if (!existing.exists() || existing.data().ownerId !== user.uid) throw new Error('Liên kết quán không hợp lệ; cần kiểm tra dữ liệu tài khoản.');
        return { shopId: activeShopId as string, draft: existing.data().draft as ShopData };
      }
      transaction.set(doc(activeDb, 'shops', shopId), {
        id: shopId, ownerId: user.uid, name: shopSettings.name, draft: sanitizedDraft,
        hasPublished: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      transaction.set(userRef, {
        userId: user.uid, activeShopId: shopId, email: user.email || '',
        displayName: user.displayName || 'Chủ quán', updatedAt: serverTimestamp(),
      }, { merge: true });
      return { shopId, draft: sanitizedDraft };
    });
    StorageService.saveDraft(created.shopId, created.draft);
    return created;
  },
};
}



