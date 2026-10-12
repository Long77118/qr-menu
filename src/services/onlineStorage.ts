/**
 * Online Storage & Synchronization Service using Firestore
 */
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { ShopData, MenuItem, MenuCategory, ShopSettings, UserProfile } from '../types/menu';
import { DEMO_SHOP_ID, INITIAL_DEMO_DATA } from '../data/mockData';
import { StorageService } from './storage';

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

export const OnlineStorageService = {
  /**
   * Save Draft to Firestore under `/shops/{shopId}`
   */
  async saveDraft(
    shopId: string,
    draftData: ShopData
  ): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
      // Fallback to local storage if user not logged in
      return StorageService.saveDraft(shopId, draftData);
    }

    const path = `shops/${shopId}`;
    try {
      // Also update local storage cache immediately for fast offline responsiveness
      StorageService.saveDraft(shopId, draftData);

      const shopDocRef = doc(db, 'shops', shopId);
      const payload: Partial<CloudShopRecord> = {
        id: shopId,
        ownerId: user.uid,
        name: draftData.shop.name || 'Quán ăn',
        draft: draftData,
        updatedAt: serverTimestamp(),
      };

      // Check if document exists to maintain createdAt
      const existingSnap = await getDoc(shopDocRef);
      if (!existingSnap.exists()) {
        payload.createdAt = serverTimestamp();
        payload.hasPublished = false;
      }

      await setDoc(shopDocRef, payload, { merge: true });
      return { success: true };
    } catch (err: unknown) {
      console.error('Error saving draft to cloud:', err);
      // Fallback is still safely in local storage
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối cơ sở dữ liệu đám mây';
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Publish Menu to Firestore under `/published_menus/{shopId}` and update `/shops/{shopId}`
   */
  async publishShop(shopId: string): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return StorageService.publishShop(shopId);
    }

    try {
      // 1. Get current draft
      let draft: ShopData | null = null;
      const localRecord = StorageService.getShop(shopId);
      if (localRecord?.draft) {
        draft = localRecord.draft;
      } else {
        const shopSnap = await getDoc(doc(db, 'shops', shopId));
        if (shopSnap.exists()) {
          draft = shopSnap.data()?.draft;
        }
      }

      if (!draft) {
        return { success: false, error: 'Không tìm thấy dữ liệu quán để xuất bản!' };
      }

      if (!draft.shop.name.trim()) {
        return { success: false, error: 'Tên quán không được để trống!' };
      }

      const visibleItems = draft.items.filter((item) => item.status !== 'hidden');
      if (visibleItems.length === 0) {
        return {
          success: false,
          error: 'Cần có ít nhất 1 món không bị ẩn để có thể xuất bản thực đơn cho khách!',
        };
      }

      const publishedAt = new Date().toISOString();
      const sanitizedDraft: ShopData = {
        ...JSON.parse(JSON.stringify(draft)),
        publishedAt,
      };

      // 2. Write to public collection `/published_menus/{shopId}`
      const pubDocRef = doc(db, 'published_menus', shopId);
      const publicPayload: CloudPublishedMenu = {
        shopId,
        ownerId: user.uid,
        shop: sanitizedDraft.shop,
        categories: sanitizedDraft.categories,
        items: sanitizedDraft.items,
        publishedAt,
      };
      await setDoc(pubDocRef, publicPayload);

      // 3. Update shop status in `/shops/{shopId}`
      const shopDocRef = doc(db, 'shops', shopId);
      await setDoc(
        shopDocRef,
        {
          hasPublished: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 4. Update local mirror
      StorageService.publishShop(shopId);

      return { success: true };
    } catch (err: unknown) {
      console.error('Error publishing menu to cloud:', err);
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối khi xuất bản';
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Fetch Published Menu from Cloud (for guest view or sync)
   */
  async getPublishedMenu(shopId: string): Promise<ShopData | null> {
    try {
      const pubDocRef = doc(db, 'published_menus', shopId);
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
    } catch (err) {
      console.warn(`Could not load online published menu for ${shopId}:`, err);
    }

    // Fallback to local storage or demo data
    const local = StorageService.getPublishedShop(shopId);
    if (local) return local;

    if (shopId === DEMO_SHOP_ID) {
      return INITIAL_DEMO_DATA;
    }

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
    const pubDocRef = doc(db, 'published_menus', shopId);
    return onSnapshot(
      pubDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CloudPublishedMenu;
          onUpdate({
            shop: data.shop,
            categories: data.categories || [],
            items: data.items || [],
            publishedAt: data.publishedAt,
          });
        } else {
          // If not in cloud, check local fallback
          const local = StorageService.getPublishedShop(shopId);
          onUpdate(local || (shopId === DEMO_SHOP_ID ? INITIAL_DEMO_DATA : null));
        }
      },
      (error) => {
        console.warn('Realtime menu subscription error:', error);
        if (onError) onError(error);
        const local = StorageService.getPublishedShop(shopId);
        onUpdate(local || (shopId === DEMO_SHOP_ID ? INITIAL_DEMO_DATA : null));
      }
    );
  },

  /**
   * Load owner's shop data from Firestore
   */
  async loadOwnerShop(shopId: string): Promise<{ draft: ShopData; isPublished: boolean } | null> {
    const user = auth.currentUser;
    if (!user) {
      const local = StorageService.getShop(shopId);
      return local ? { draft: local.draft, isPublished: !!local.published } : null;
    }

    try {
      const shopDocRef = doc(db, 'shops', shopId);
      const snap = await getDoc(shopDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.draft) {
          // Sync to local mirror
          StorageService.saveDraft(shopId, data.draft);
          return { draft: data.draft, isPublished: !!data.hasPublished };
        }
      }
    } catch (err) {
      console.warn('Could not load shop from cloud:', err);
    }

    // Fallback to local
    const local = StorageService.getShop(shopId);
    return local ? { draft: local.draft, isPublished: !!local.published } : null;
  },

  /**
   * Load all shops owned by the logged-in user
   */
  async getUserShops(ownerUid: string): Promise<string[]> {
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', ownerUid));
      const snaps = await getDocs(q);
      const shopIds: string[] = [];
      snaps.forEach((docSnap) => {
        shopIds.push(docSnap.id);
      });
      return shopIds;
    } catch (err) {
      console.warn('Could not query user shops:', err);
      return [];
    }
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
    useTemplate = false
  ): Promise<{ shopId: string; draft: ShopData }> {
    const user = auth.currentUser;

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

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const shopId = (cleanSlug || 'quan') + '-' + randomSuffix;

    const baseData: ShopData = useTemplate
      ? JSON.parse(JSON.stringify(INITIAL_DEMO_DATA))
      : {
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
          publishedAt: undefined,
        };

    baseData.shop.id = shopId;
    baseData.shop.name = shopSettings.name;
    if (shopSettings.tagline) baseData.shop.tagline = shopSettings.tagline;
    if (shopSettings.description) baseData.shop.description = shopSettings.description;
    if (shopSettings.address) baseData.shop.address = shopSettings.address;
    if (shopSettings.phone) baseData.shop.phone = shopSettings.phone;
    if (shopSettings.themeColor) baseData.shop.themeColor = shopSettings.themeColor;

    // Also save locally
    StorageService.saveDraft(shopId, baseData);

    // If online user, persist to Firestore
    if (user) {
      try {
        const shopDocRef = doc(db, 'shops', shopId);
        await setDoc(shopDocRef, {
          id: shopId,
          ownerId: user.uid,
          name: shopSettings.name,
          draft: baseData,
          hasPublished: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Also record in user profile
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(
          userDocRef,
          {
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Chủ quán',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not save new shop to cloud immediately, saved to local cache', e);
      }
    }

    return { shopId, draft: baseData };
  },
};
