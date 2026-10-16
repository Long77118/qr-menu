import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { readFileSync } from 'fs';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, Firestore, disableNetwork, enableNetwork } from 'firebase/firestore';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { StorageService } from '../src/services/storage';
import { createOperationQueue } from '../src/utils/operationQueue';
import { ShopData } from '../src/types/menu';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); }, clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}
const id = 'workflow-shop';
function draft(price: number): ShopData {
  return {
    shop: { id, name: 'Quán', themeColor: '#FF5A36' },
    categories: [{ id: 'cat', name: 'Nhóm', order: 1 }],
    items: [{ id: 'dish', name: 'Món', price, categoryId: 'cat', status: 'available',
      order: 1, pricingMode: 'single', options: [] }],
  };
}

test('Queue chờ thao tác chậm, giữ thứ tự và tiếp tục sau rejection', async () => {
  const enqueue = createOperationQueue();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const events: string[] = [];
  const first = enqueue('shop', async () => { events.push('first-start'); await gate; events.push('first-end'); });
  const failed = enqueue('shop', async () => { events.push('second'); throw new Error('retry'); });
  const recovered = enqueue('shop', async () => { events.push('third'); return true; });
  await enqueue('other-shop', async () => { events.push('other'); });
  expect(events).toEqual(['first-start', 'other']);
  release();
  await first;
  await expect(failed).rejects.toThrow('retry');
  expect(await recovered).toBe(true);
  expect(events).toEqual(['first-start', 'other', 'first-end', 'second', 'third']);
});

describe('Đợt 4: service write workflow', () => {
  let env: RulesTestEnvironment;
  let service: ReturnType<typeof createOnlineStorageService>;
  let db: Firestore;
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-qr-menu-workflow-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => {
    localStorage.clear();
    await env.clearFirestore();
    db = env.authenticatedContext('owner').firestore() as unknown as Firestore;
    service = createOnlineStorageService({ db, auth: { currentUser: { uid: 'owner' } } });
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'shops', id), {
        id, ownerId: 'owner', draft: draft(1), hasPublished: false, createdAt: 'keep',
      });
    });
  });
  afterAll(async () => { if (env) await env.cleanup(); });

  test('Save/publish xếp hàng; snapshot publish giữ giá lúc gọi và cache giữ nháp mới hơn', async () => {
    await disableNetwork(db);
    try {
      const first = service.saveDraft(id, draft(10));
      const selected = draft(20);
      const second = service.saveDraft(id, selected);
      const publishing = service.publishShop(id, selected);
      // Mutating a caller object must not mutate the already enqueued snapshot.
      selected.items[0].price = 999;
      const newer = service.saveDraft(id, draft(30));
      await enableNetwork(db);
      expect((await first).success).toBe(true);
      expect((await second).success).toBe(true);
      expect((await publishing).success).toBe(true);
      expect((await newer).success).toBe(true);
      expect((await getDoc(doc(db, 'shops', id))).data()!.draft.items[0].price).toBe(30);
      expect((await getDoc(doc(db, 'published_menus', id))).data()!.items[0].price).toBe(20);
      expect(StorageService.getShop(id)!.draft.items[0].price).toBe(30);
      expect(StorageService.getPublishedShop(id)!.items[0].price).toBe(20);
    } finally { await enableNetwork(db); }
  });

  test('Local quota lỗi không làm xuất bản cache cũ; cloud vẫn lưu snapshot mới', async () => {
    StorageService.saveDraft(id, draft(1));
    const originalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (key) => originalStorage.getItem(key),
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: (key) => originalStorage.removeItem(key), clear: () => originalStorage.clear(),
      key: (index) => originalStorage.key(index), get length() { return originalStorage.length; },
    };
    try {
      const saved = await service.saveDraft(id, draft(42));
      expect(saved.success).toBe(true);
      expect(saved.cacheWarning).toBeDefined();
      const published = await service.publishShop(id);
      expect(published.success).toBe(true);
      expect(published.cacheWarning).toBeDefined();
      expect((await getDoc(doc(db, 'published_menus', id))).data()!.items[0].price).toBe(42);
    } finally { globalThis.localStorage = originalStorage; }
  });

  test('Batch bị deny ở private status không ghi public; retry sau lỗi vẫn được', async () => {
    const restricted = await initializeTestEnvironment({ projectId: 'demo-qr-menu-atomic-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: `rules_version = '2'; service cloud.firestore {
        match /databases/{database}/documents {
          match /shops/{id} { allow read: if true; allow write: if false; }
          match /published_menus/{id} { allow read, write: if true; }
          match /shop_controls/{id} { allow get: if true; }
          match /menu_directory/{id} { allow read, write: if true; }
        }
      }` } });
    try {
      await restricted.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'shops', id), { id, ownerId: 'owner', hasPublished: false, draft: draft(1) });
        await setDoc(doc(context.firestore(), 'published_menus', id), { items: draft(1).items });
      });
      const restrictedDb = restricted.authenticatedContext('owner').firestore() as unknown as Firestore;
      const blocked = createOnlineStorageService({ db: restrictedDb, auth: { currentUser: { uid: 'owner' } } });
      const result = await blocked.publishShop(id, draft(88));
      expect(result.success).toBe(false);
      expect((await getDoc(doc(restrictedDb, 'published_menus', id))).data()!.items[0].price).toBe(1);
      expect((await getDoc(doc(restrictedDb, 'shops', id))).data()!.hasPublished).toBe(false);
      const failedSave = await blocked.saveDraft(id, draft(2));
      expect(failedSave.success).toBe(false);
      expect((await blocked.publishShop(id)).success).toBe(false);
    } finally { await restricted.cleanup(); }
    expect((await service.saveDraft(id, draft(9))).success).toBe(true);
    expect((await service.publishShop(id)).success).toBe(true);
  });

  test('Publish liên tiếp hoàn tất theo thứ tự, không để bản cũ ghi đè bản mới', async () => {
    const [a, b] = await Promise.all([service.publishShop(id, draft(100)), service.publishShop(id, draft(200))]);
    expect(a.success).toBe(true); expect(b.success).toBe(true);
    expect((await getDoc(doc(db, 'published_menus', id))).data()!.items[0].price).toBe(200);
    expect((await getDoc(doc(db, 'shops', id))).data()!.draft.items[0].price).toBe(200);
  });

  test('Save lỗi không cho publish cache cũ; retry cùng service phục hồi được', async () => {
    const missingId = 'retry-shop';
    const snapshot = draft(77);
    snapshot.shop.id = missingId;
    expect((await service.saveDraft(missingId, snapshot)).success).toBe(false);
    expect((await service.publishShop(missingId)).success).toBe(false);
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'shops', missingId), {
        id: missingId, ownerId: 'owner', draft: snapshot, hasPublished: false,
      });
    });
    expect((await service.saveDraft(missingId, snapshot)).success).toBe(true);
    expect((await service.publishShop(missingId)).success).toBe(true);
    expect((await getDoc(doc(db, 'published_menus', missingId))).data()!.items[0].price).toBe(77);
  });
});
