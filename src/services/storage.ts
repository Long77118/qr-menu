import { ShopData, UserProfile } from '../types/menu';
import { INITIAL_DEMO_DATA, DEMO_USER, DEMO_SHOP_ID } from '../data/mockData';

const STORAGE_KEY_SHOPS = 'qr_menu_shops_v1';
const STORAGE_KEY_SESSION = 'qr_menu_session_v1';
const STORAGE_KEY_USERS = 'qr_menu_users_v1';

interface StoredShopRecord {
  draft: ShopData;
  published: ShopData | null;
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

  // Pre-seed demo shop
  const initialShops: ShopDictionary = {
    [DEMO_SHOP_ID]: {
      draft: JSON.parse(JSON.stringify(INITIAL_DEMO_DATA)),
      published: JSON.parse(JSON.stringify(INITIAL_DEMO_DATA)),
    },
  };

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
        return JSON.parse(raw);
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
    return [DEMO_USER];
  },

  loginDemoUser(): UserProfile {
    // Ensure demo shop exists
    this.ensureShopExists(DEMO_SHOP_ID);
    this.setCurrentUser(DEMO_USER);
    return DEMO_USER;
  },

  logout(): void {
    this.setCurrentUser(null);
  },

  // --- SHOP MANAGEMENT ---
  getAllShops(): ShopDictionary {
    return initializeStorage();
  },

  ensureShopExists(shopId: string): void {
    const shops = this.getAllShops();
    if (!shops[shopId]) {
      shops[shopId] = {
        draft: JSON.parse(JSON.stringify(INITIAL_DEMO_DATA)),
        published: JSON.parse(JSON.stringify(INITIAL_DEMO_DATA)),
      };
      try {
        localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      } catch (e) {
        console.error('Error ensuring shop exists', e);
      }
    }
  },

  getShop(shopId: string): StoredShopRecord | null {
    const shops = this.getAllShops();
    return shops[shopId] || null;
  },

  getPublishedShop(shopId: string): ShopData | null {
    const record = this.getShop(shopId);
    return record?.published || null;
  },

  saveDraft(shopId: string, draftData: ShopData): { success: boolean; error?: string } {
    try {
      const shops = this.getAllShops();
      const existing = shops[shopId] || { draft: draftData, published: null };
      shops[shopId] = {
        ...existing,
        draft: draftData,
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

  publishShop(shopId: string): { success: boolean; error?: string } {
    const record = this.getShop(shopId);
    if (!record) {
      return { success: false, error: 'Không tìm thấy dữ liệu quán!' };
    }

    const { draft } = record;
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

    try {
      const publishedData: ShopData = {
        ...JSON.parse(JSON.stringify(draft)),
        publishedAt: new Date().toISOString(),
      };

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

  resetDemoShop(shopId = DEMO_SHOP_ID): { success: boolean; data: ShopData; error?: string } {
    try {
      const shops = this.getAllShops();
      const freshData = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
      freshData.shop.id = shopId;
      freshData.publishedAt = new Date().toISOString();

      shops[shopId] = {
        draft: freshData,
        published: JSON.parse(JSON.stringify(freshData)),
      };

      localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
      return { success: true, data: freshData };
    } catch (err: any) {
      return { success: false, data: INITIAL_DEMO_DATA, error: err?.message };
    }
  },

  createNewShop(
    shopSettings: {
      name: string;
      tagline?: string;
      description?: string;
      address?: string;
      phone?: string;
      themeColor?: string;
    },
    useTemplate = false
  ): { shopId: string; user: UserProfile } {
    // Generate permanent fixed slug
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

    const shops = this.getAllShops();
    shops[shopId] = {
      draft: baseData,
      published: useTemplate ? JSON.parse(JSON.stringify(baseData)) : null,
    };

    localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));

    // Simulated user
    const newUser: UserProfile = {
      id: 'user-' + shopId,
      displayName: `Chủ quán ${shopSettings.name}`,
      email: `${shopId}@demo.vn`,
      shopId: shopId,
    };

    this.setCurrentUser(newUser);

    return { shopId, user: newUser };
  },
};
