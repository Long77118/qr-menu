import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, test, beforeAll, afterAll, beforeEach, expect } from 'bun:test';
import { doc, getDoc, setDoc, Firestore, Timestamp, serverTimestamp } from 'firebase/firestore';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { sanitizeShopData, sanitizePlainData } from '../src/utils/sanitizeShopData';
import { ShopData, MenuItem } from '../src/types/menu';

// In-memory localStorage mock for node/bun test environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  };
}

describe('Đợt 2: Payload Sanitization & Firestore Boundary Normalization', () => {
  describe('Unit Tests: sanitizePlainData & sanitizeShopData', () => {
    test('Giữ nguyên Timestamp/sentinel và từ chối array có phần tử khuyết', () => {
      const timestamp = Timestamp.fromMillis(1234);
      const sentinel = serverTimestamp();
      const cleaned = sanitizePlainData({ timestamp, sentinel, optional: undefined });
      expect(cleaned.timestamp).toBe(timestamp);
      expect(cleaned.sentinel).toBe(sentinel);
      expect(() => sanitizePlainData(new Array(1))).toThrow('Undefined array elements');
    });
    test('Bỏ trường optional undefined, giữ nguyên 0, false, chuỗi rỗng và null', () => {
      const input = {
        name: 'Món ăn',
        price: 0,
        available: false,
        tagline: '',
        nullableNote: null,
        description: undefined,
        imageUrl: undefined,
      };

      const cleaned = sanitizePlainData(input);

      expect(cleaned as Record<string, unknown>).toEqual({
        name: 'Món ăn',
        price: 0,
        available: false,
        tagline: '',
        nullableNote: null,
      });
      expect('description' in (cleaned as any)).toBe(false);
      expect('imageUrl' in (cleaned as any)).toBe(false);
      expect((cleaned as any).price).toBe(0);
      expect((cleaned as any).available).toBe(false);
      expect((cleaned as any).tagline).toBe('');
      expect((cleaned as any).nullableNote).toBe(null);
    });

    test('Không mutate object đầu vào và không chuyển undefined thành null', () => {
      const originalDraft: ShopData = {
        shop: {
          id: 'shop-test',
          name: 'Quán Test',
          themeColor: '#FF5A36',
          logoUrl: undefined,
          coverUrl: undefined,
          headerBackground: undefined,
        },
        categories: [{ id: 'c1', name: 'Nhóm 1', order: 0, imageUrl: undefined }],
        items: [
          {
            id: 'i1',
            name: 'Trà đá',
            categoryId: 'c1',
            pricingMode: 'single',
            price: 5000,
            options: [],
            status: 'available',
            order: 0,
            description: undefined,
            imageUrl: undefined,
          },
        ],
        publishedAt: undefined,
      };

      const originalSnapshot = structuredClone(originalDraft);

      const cleaned = sanitizeShopData(originalDraft);

      expect(originalDraft).toEqual(originalSnapshot);
      // Verify original is untouched
      expect('logoUrl' in originalDraft.shop).toBe(true);
      expect(originalDraft.shop.logoUrl).toBeUndefined();

      // Verify cleaned object omitted undefined keys, rather than converting them to null
      expect('logoUrl' in cleaned.shop).toBe(false);
      expect('coverUrl' in cleaned.shop).toBe(false);
      expect('headerBackground' in cleaned.shop).toBe(false);
      expect('publishedAt' in cleaned).toBe(false);
      expect('description' in cleaned.items[0]).toBe(false);
      expect('imageUrl' in cleaned.items[0]).toBe(false);
      expect(cleaned.items[0].price).toBe(5000);
      expect(cleaned.shop.name).toBe('Quán Test');
    });

    test('Chính sách array: reject nếu phần tử trong array là undefined, không âm thầm xóa/đổi thứ tự', () => {
      const arrayWithUndefined = [
        { id: '1', name: 'Món 1' },
        undefined,
        { id: '3', name: 'Món 3' },
      ];

      expect(() => {
        sanitizePlainData(arrayWithUndefined);
      }).toThrow('Undefined array elements are strictly disallowed');
    });

    test('publishedAt là optional hợp lệ, không tự xuất bản khi chưa publish', () => {
      const draftWithoutPublish: ShopData = {
        shop: { id: 's1', name: 'Quán Mới', themeColor: '#000000' },
        categories: [],
        items: [],
      };

      const cleaned = sanitizeShopData(draftWithoutPublish);
      expect('publishedAt' in cleaned).toBe(false);
      expect(cleaned.publishedAt).toBeUndefined();
    });
  });

  describe('Integration Tests: OnlineStorageService on Firestore Emulator', () => {
    let testEnv: RulesTestEnvironment;
    let OnlineStorageService: ReturnType<typeof createOnlineStorageService>;
    const testUserId = 'owner_user_123';
    const testShopId = 'quan-test-boundary-99';

    beforeAll(async () => {
      testEnv = await initializeTestEnvironment({
        projectId: 'demo-qr-menu-storage-test',
        firestore: {
          rules: readFileSync('firestore.rules', 'utf8'),
          host: '127.0.0.1',
          port: 8080,
        },
      });
    });

    afterAll(async () => {

      if (testEnv) {
        await testEnv.cleanup();
      }
    });

    beforeEach(async () => {
      await testEnv.clearFirestore();

      localStorage.clear();
      // saveDraft updates provisioned shops; new shops use createNewShopOnline.
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'shops', testShopId), {
          id: testShopId,
          ownerId: testUserId,
          name: 'Quán Gốc',
          draft: { shop: { id: testShopId, name: 'Quán Gốc', themeColor: '#FF5A36' }, categories: [], items: [] },
          createdAt: 'baseline-created-at',
          hasPublished: true,
          customMetadata: { preserve: true },
        });
      });
      // Configure dependency injection for OnlineStorageService pointing to emulator instance
      const authContext = testEnv.authenticatedContext(testUserId);
      const emulatorDb = authContext.firestore();

      OnlineStorageService = createOnlineStorageService({
        // The rules test context returns compat Firestore; modular SDK unwraps it at runtime.
        db: emulatorDb as unknown as Firestore,
        auth: {
          currentUser: {
            uid: testUserId,
            email: 'owner@test.vn',
            displayName: 'Chủ Quán Test',
          },
        },
      });
    });

    test('Không tạo quán từ saveDraft và không thay metadata khi user khác bị deny', async () => {
      const draft: ShopData = {
        shop: { id: testShopId, name: 'Tên mới', themeColor: '#FF5A36' },
        categories: [], items: [],
      };
      const missing = await OnlineStorageService.saveDraft('missing-shop', {
        ...draft, shop: { ...draft.shop, id: 'missing-shop' },
      });
      expect(missing.success).toBe(false);
      const intruder = createOnlineStorageService({
        db: testEnv.authenticatedContext('other-owner').firestore() as unknown as Firestore,
        auth: { currentUser: { uid: 'other-owner' } },
      });
      const denied = await intruder.saveDraft(testShopId, draft);
      expect(denied.success).toBe(false);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const existing = (await getDoc(doc(context.firestore(), 'shops', testShopId))).data()!;
        expect(existing.ownerId).toBe(testUserId);
        expect(existing.createdAt).toBe('baseline-created-at');
        expect(existing.hasPublished).toBe(true);
        expect(existing.name).toBe('Quán Gốc');
        expect(existing.customMetadata).toEqual({ preserve: true });
        expect((await getDoc(doc(context.firestore(), 'shops', 'missing-shop'))).exists()).toBe(false);
      });
    });

    test('Lưu draft không cần đọc metadata, vẫn giữ metadata khi quyền đọc bị từ chối', async () => {
      const writeOnlyEnv = await initializeTestEnvironment({
        projectId: 'demo-qr-menu-write-only-test',
        firestore: {
          host: '127.0.0.1', port: 8080,
          rules: `rules_version = '2'; service cloud.firestore {
            match /databases/{database}/documents/shops/{shopId} {
              allow read, create, delete: if false;
              allow update: if request.auth != null && resource.data.ownerId == request.auth.uid
                && request.resource.data.ownerId == resource.data.ownerId;
            }
          }`,
        },
      });
      try {
        await writeOnlyEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'shops', testShopId), {
            id: testShopId, ownerId: testUserId, createdAt: 'keep-created',
            hasPublished: true, customMetadata: { keep: 42 },
          });
        });
        const service = createOnlineStorageService({
          db: writeOnlyEnv.authenticatedContext(testUserId).firestore() as unknown as Firestore,
          auth: { currentUser: { uid: testUserId } },
        });
        const result = await service.saveDraft(testShopId, {
          shop: { id: testShopId, name: 'Đã lưu', themeColor: '#FF5A36' },
          categories: [], items: [],
        });
        expect(result.success).toBe(true);
        await writeOnlyEnv.withSecurityRulesDisabled(async (context) => {
          const saved = (await getDoc(doc(context.firestore(), 'shops', testShopId))).data()!;
          expect(saved.createdAt).toBe('keep-created');
          expect(saved.hasPublished).toBe(true);
          expect(saved.customMetadata).toEqual({ keep: 42 });
          expect(saved.draft.shop.name).toBe('Đã lưu');
        });
      } finally {
        await writeOnlyEnv.cleanup();
      }
    });

    test('1. createNewShopOnline tạo quán trống ghi thành công lên emulator, không có publishedAt undefined', async () => {
      // First-time provisioning: other tests seed an already-owned shop in beforeEach.
      await testEnv.clearFirestore();
      const result = await OnlineStorageService.createNewShopOnline(
        {
          name: 'Quán Trống Mới',
          address: '123 Đường Test',
          phone: '0901234567',
          themeColor: '#FF5A36',
        }
      );

      expect(result.shopId).toBeDefined();
      expect(result.draft).toBeDefined();
      expect('publishedAt' in result.draft).toBe(false);

      // Verify in Firestore Emulator directly
      const authContext = testEnv.authenticatedContext(testUserId);
      const db = authContext.firestore();
      const shopSnap = await getDoc(doc(db, 'shops', result.shopId));

      expect(shopSnap.exists()).toBe(true);
      const data = shopSnap.data()!;
      expect(data.id).toBe(result.shopId);
      expect(data.ownerId).toBe(testUserId);
      expect(data.hasPublished).toBe(false);
      expect('publishedAt' in data.draft).toBe(false);
      expect(data.draft.publishedAt).toBeUndefined();
    });

    test('2. Thêm món không ảnh, không mô tả, giá 0: lưu được, giá 0 giữ nguyên, dữ liệu đầu vào không mutate', async () => {
      const baseDraft: ShopData = {
        shop: { id: testShopId, name: 'Quán Số 2', themeColor: '#FF5A36' },
        categories: [{ id: 'cat-1', name: 'Đồ ăn', order: 1 }],
        items: [
          {
            id: 'item-free',
            name: 'Trà đá miễn phí',
            categoryId: 'cat-1',
            pricingMode: 'single',
            price: 0,
            options: [],
            status: 'available',
            order: 1,
            description: undefined,
            imageUrl: undefined,
          },
        ],
      };

      const cloneBeforeSave = structuredClone(baseDraft);

      const res = await OnlineStorageService.saveDraft(testShopId, baseDraft);
      expect(res.success).toBe(true);

      expect(baseDraft).toEqual(cloneBeforeSave);
      // Verify input data was not mutated
      expect(baseDraft.items[0].price).toBe(0);
      expect('description' in baseDraft.items[0]).toBe(true);
      expect(baseDraft.items[0].description).toBeUndefined();

      // Read from Firestore Emulator
      const authContext = testEnv.authenticatedContext(testUserId);
      const db = authContext.firestore();
      const snap = await getDoc(doc(db, 'shops', testShopId));

      expect(snap.exists()).toBe(true);
      const savedDraft = snap.data()!.draft as ShopData;
      expect(savedDraft.items.length).toBe(1);
      expect(savedDraft.items[0].price).toBe(0);
      expect('description' in savedDraft.items[0]).toBe(false);
      expect('imageUrl' in savedDraft.items[0]).toBe(false);
    });

    test('3. Có dữ liệu cũ với logo/cover/headerBackground và item description/imageUrl: xóa rồi save, đọc lại Firestore thấy trường đã mất', async () => {
      // Step A: Save initial draft with all optional fields present
      const initialDraftWithOptionals: ShopData = {
        shop: {
          id: testShopId,
          name: 'Quán Có Đầy Đủ Ảnh',
          themeColor: '#7447E8',
          logoUrl: 'data:image/svg+xml;base64,logo123',
          coverUrl: 'data:image/svg+xml;base64,cover123',
          headerBackground: {
            imageUrl: 'data:image/svg+xml;base64,bg123',
            desktopPosition: { x: 50, y: 50 },
            desktopZoom: 1.2,
            mobilePosition: { x: 50, y: 50 },
            mobileZoom: 1.0,
            overlayType: 'dark',
            overlayOpacity: 40,
            textColorMode: 'light',
            showShowcaseFrames: true,
          },
        },
        categories: [{ id: 'cat-1', name: 'Món chính', order: 1 }],
        items: [
          {
            id: 'item-1',
            name: 'Bò lúc lắc',
            categoryId: 'cat-1',
            pricingMode: 'single',
            price: 85000,
            options: [],
            status: 'available',
            order: 1,
            description: 'Thịt bò mềm ướp tiêu đen thơm ngon',
            imageUrl: 'data:image/svg+xml;base64,item123',
          },
        ],
      };

      const resInit = await OnlineStorageService.saveDraft(testShopId, initialDraftWithOptionals);
      expect(resInit.success).toBe(true);

      const authContext = testEnv.authenticatedContext(testUserId);
      const db = authContext.firestore();

      // Verify fields exist initially in Firestore
      const snap1 = await getDoc(doc(db, 'shops', testShopId));
      expect(snap1.data()!.draft.shop.logoUrl).toBe('data:image/svg+xml;base64,logo123');
      expect(snap1.data()!.draft.shop.coverUrl).toBe('data:image/svg+xml;base64,cover123');
      expect(snap1.data()!.draft.shop.headerBackground).toBeDefined();
      expect(snap1.data()!.draft.items[0].description).toBe('Thịt bò mềm ướp tiêu đen thơm ngon');
      expect(snap1.data()!.draft.items[0].imageUrl).toBe('data:image/svg+xml;base64,item123');

      // Step B: User clears logo, cover, headerBackground, and item description/imageUrl
      const updatedDraftCleared: ShopData = {
        shop: {
          id: testShopId,
          name: 'Quán Đã Xóa Ảnh',
          themeColor: '#7447E8',
          logoUrl: undefined,
          coverUrl: undefined,
          headerBackground: undefined,
        },
        categories: [{ id: 'cat-1', name: 'Món chính', order: 1 }],
        items: [
          {
            id: 'item-1',
            name: 'Bò lúc lắc',
            categoryId: 'cat-1',
            pricingMode: 'single',
            price: 85000,
            options: [],
            status: 'available',
            order: 1,
            description: undefined,
            imageUrl: undefined,
          },
        ],
      };

      const resUpdate = await OnlineStorageService.saveDraft(testShopId, updatedDraftCleared);
      expect(resUpdate.success).toBe(true);

      // Step C: Read directly from Firestore Emulator (NOT localStorage) to verify fields are truly gone
      const snap2 = await getDoc(doc(db, 'shops', testShopId));
      const data2 = snap2.data()!;
      const shop2 = data2.draft.shop;
      const item2 = data2.draft.items[0];

      expect('logoUrl' in shop2).toBe(false);
      expect(shop2.logoUrl).toBeUndefined();

      expect('coverUrl' in shop2).toBe(false);
      expect(shop2.coverUrl).toBeUndefined();

      expect('headerBackground' in shop2).toBe(false);
      expect(shop2.headerBackground).toBeUndefined();

      expect('description' in item2).toBe(false);
      expect(item2.description).toBeUndefined();

      expect('imageUrl' in item2).toBe(false);
      expect(item2.imageUrl).toBeUndefined();
    });

    test('4. saveDraft giữ nguyên id, ownerId, createdAt, hasPublished; không vô tình ghi đè published_menus', async () => {
      // Save only draft fields; metadata and an existing public menu must remain intact.
      const authContext = testEnv.authenticatedContext(testUserId);
      const db = authContext.firestore();

      const publicMenu = {
        shopId: testShopId, ownerId: testUserId,
        shop: { id: testShopId, name: 'Bản công khai trước đó' },
        categories: [], items: [], publishedAt: 'original-publish-time',
      };
      await setDoc(doc(db, 'published_menus', testShopId), publicMenu);

      const initialDraft: ShopData = {
        shop: { id: testShopId, name: 'Quán Gốc', themeColor: '#FF5A36' },
        categories: [],
        items: [],
      };

      await OnlineStorageService.saveDraft(testShopId, initialDraft);

      const snapBefore = await getDoc(doc(db, 'shops', testShopId));
      const createdAtBefore = snapBefore.data()!.createdAt;
      expect(createdAtBefore).toBeDefined();

      // Subsequent draft save
      const updatedDraft: ShopData = {
        shop: { id: testShopId, name: 'Quán Gốc Đổi Tên', themeColor: '#FF5A36' },
        categories: [],
        items: [],
      };

      await OnlineStorageService.saveDraft(testShopId, updatedDraft);

      const snapAfter = await getDoc(doc(db, 'shops', testShopId));
      const dataAfter = snapAfter.data()!;

      expect(dataAfter.id).toBe(testShopId);
      expect(dataAfter.ownerId).toBe(testUserId);
      expect(dataAfter.hasPublished).toBe(true);
      expect(dataAfter.customMetadata).toEqual({ preserve: true });
      expect(dataAfter.name).toBe('Quán Gốc Đổi Tên');
      // createdAt is preserved
      expect(dataAfter.createdAt).toEqual(createdAtBefore);

      // Verify published_menus is untouched
      const pubSnap = await getDoc(doc(db, 'published_menus', testShopId));
      expect(pubSnap.data()).toEqual(publicMenu);
    });

    test('5. Sau đó cập nhật tên/giá vẫn lưu được bình thường', async () => {
      const authContext = testEnv.authenticatedContext(testUserId);
      const db = authContext.firestore();

      const draft: ShopData = {
        shop: { id: testShopId, name: 'Cà Phê Sáng', themeColor: '#FF5A36' },
        categories: [{ id: 'c1', name: 'Đồ uống', order: 1 }],
        items: [
          {
            id: 'm1',
            name: 'Bạc sỉu',
            categoryId: 'c1',
            pricingMode: 'single',
            price: 25000,
            options: [],
            status: 'available',
            order: 1,
          },
        ],
      };

      const res1 = await OnlineStorageService.saveDraft(testShopId, draft);
      expect(res1.success).toBe(true);

      // Update name and price
      draft.shop.name = 'Cà Phê Sáng & Trưa';
      draft.items[0].price = 28000;

      const res2 = await OnlineStorageService.saveDraft(testShopId, draft);
      expect(res2.success).toBe(true);

      const snap = await getDoc(doc(db, 'shops', testShopId));
      expect(snap.data()!.name).toBe('Cà Phê Sáng & Trưa');
      expect(snap.data()!.draft.shop.name).toBe('Cà Phê Sáng & Trưa');
      expect(snap.data()!.draft.items[0].price).toBe(28000);
    });
  });
});


