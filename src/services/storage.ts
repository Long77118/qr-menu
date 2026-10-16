import { ShopData, UserProfile } from '../types/menu';
import { getPublicMenuItems } from '../utils/publicMenu';

const STORAGE_KEY_SHOPS = 'qr_menu_shops_v1';
const STORAGE_KEY_SESSION = 'qr_menu_session_v1';
const STORAGE_KEY_USERS = 'qr_menu_users_v1';

interface StoredShopRecord {
  draft: ShopData;
  published: ShopData | null;
  pending?: { ownerId: string; token: string };
}

type ShopDictionary = Record<string, StoredShopRecord>;

/**
 * Initialize default data if localStorage is empty
 */
function initializeStorage(): ShopDictionary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHOPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        // Upgrade legacy default theme color if present
        let updated = false;
        Object.keys(parsed).forEach((shopKey) => {
          const shopBundle = parsed[shopKey];
          if (shopBundle?.draft?.shop?.themeColor === '#FF6B4A') {
            shopBundle.draft.shop.themeColor = '#FF5A36';
            updated = true;
          }
          if (shopBundle?.published?.shop?.themeColor === '#FF6B4A') {
            shopBundle.published.shop.themeColor = '#FF5A36';
            updated = true;
          }
        });
        if (updated) {
          try {
            localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read existing shops from storage', e);
  }

  const initialShops: ShopDictionary = {};

  try {
    localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(initialShops));
  } catch (e) {
    console.error('Storage write error during initialization', e);
  }

  return initialShops;
}

export const StorageService = {
  // --- SESSION MANAGEMENT ---
  getCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) {
        const profile = JSON.parse(raw) as UserProfile;
        return profile.isFirebaseUser === true ? profile : null;
      }
    } catch (e) {
      console.warn('Error reading session', e);
    }
    return null;
  },

  setCurrentUser(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        // Also save to user registry
        const users = this.getAllUsers();
        if (!users.some((u) => u.id === user.id)) {
          users.push(user);
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.error('Failed to update session', e);
    }
  },

  getAllUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading users', e);
    }
    return [];
  },

  logout(): void {
    this.setCurrentUser(null);
  },

  // --- SHOP MANAGEMENT ---
  getAllShops(): ShopDictionary {
    return initializeStorage();
  },

  getShop(shopId: string): StoredShopRecord | null {
    const shops = this.getAllShops();
    return shops[shopId] || null;
  },

  getPublishedShop(shopId: string): ShopData | null {
    const record = this.getShop(shopId);
    return record?.published || null;
  },

  saveDraft(shopId: string, draftData: ShopData, pending?: StoredShopRecord['pending']): { success: boolean; error?: string } {
    try {
      const shops = this.getAllShops();
      const existing = shops[shopId] || { draft: draftData, published: null };
      shops[shopId] = {
        ...existing,
        draft: draftData,
        ...(pending ? { pending } : {}),
      };
      localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      return { success: true };
    } catch (err: any) {
      const isQuota =
        err &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22);
      const msg = isQuota
        ? 'Dung lượng lưu trữ của trình duyệt đã đầy. Vui lòng giảm kích thước ảnh hoặc xóa bớt ảnh trước khi lưu!'
        : 'Không thể lưu bản nháp vào trình duyệt: ' + (err?.message || 'Lỗi không xác định');
      return { success: false, error: msg };
    }
  },

  savePendingDraft(shopId: string, draft: ShopData, ownerId: string) {
    const token = crypto.randomUUID();
    return { ...this.saveDraft(shopId, draft, { ownerId, token }), token };
  },

  getPendingDraft(shopId: string, ownerId: string) {
    const record = this.getShop(shopId);
    return record?.pending?.ownerId === ownerId ? { draft: record.draft, token: record.pending.token } : null;
  },

  listPendingDrafts(ownerId: string) {
    return Object.entries(this.getAllShops())
      .filter(([, record]) => record.pending?.ownerId === ownerId)
      .map(([shopId]) => shopId);
  },

  acknowledgeDraft(shopId: string, ownerId: string, token: string, savedDraft?:ShopData) {
    try {
      const shops = this.getAllShops();
      const record = shops[shopId];
      if (record?.pending?.ownerId !== ownerId || record.pending.token !== token) return { success: true };
      if(savedDraft)record.draft=savedDraft;
      delete record.pending;
      localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  /** Update only the public cache; a newer local draft must survive a slow cloud publish. */
  mirrorPublishedShop(shopId: string, published: ShopData): { success: boolean; error?: string } {
    try {
      const shops = this.getAllShops();
      const current = shops[shopId];
      shops[shopId] = {
        ...current,
        draft: current?.draft ?? JSON.parse(JSON.stringify(published)),
        published: JSON.parse(JSON.stringify(published)),
      };
      localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  publishShop(shopId: string): { success: boolean; error?: string } {
    const record = this.getShop(shopId);
    if (!record) {
      return { success: false, error: 'Không tìm thấy dữ liệu quán!' };
    }

    const { draft } = record;
    if (!draft.shop.name.trim()) {
      return { success: false, error: 'Tên quán không được để trống!' };
    }

    const visibleItems = getPublicMenuItems(draft.items);
    if (visibleItems.length === 0) {
      return {
        success: false,
        error: 'Cần có ít nhất 1 món không bị ẩn để có thể xuất bản thực đơn cho khách!',
      };
    }

    try {
      const publishedData: ShopData = {
        ...JSON.parse(JSON.stringify(draft)),
        publishedAt: new Date().toISOString(),
      };
      publishedData.items = getPublicMenuItems(publishedData.items);

      const shops = this.getAllShops();
      shops[shopId] = {
        draft: draft,
        published: publishedData,
      };

      localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      return { success: true };
    } catch (err: any) {
      const isQuota =
        err &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22);
      const msg = isQuota
        ? 'Dung lượng lưu trữ của trình duyệt đã đầy. Không thể lưu bản xuất bản.'
        : 'Lỗi xuất bản: ' + (err?.message || 'Lỗi không xác định');
      return { success: false, error: msg };
    }
  },

};
