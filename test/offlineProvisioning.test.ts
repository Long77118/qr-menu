import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { readFileSync } from 'fs';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDocFromServer, Firestore, collection, query, where, getDocsFromServer } from 'firebase/firestore';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { StorageService } from '../src/services/storage';
import { INITIAL_DEMO_DATA } from './fixtures/menuFixture';

if (typeof globalThis.localStorage === 'undefined') {
  const values = new Map<string, string>();
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, String(v)); },
    removeItem: k => { values.delete(k); }, clear: () => values.clear(), key: i => [...values.keys()][i] ?? null,
    get length() { return values.size; } };
}
describe('Đợt 5: offline và cấp phát quán', () => {
  let env: RulesTestEnvironment;
  let db: Firestore;
  let online = true;
  const auth = { currentUser: { uid: 'owner', email: 'owner@example.test' } };
  const id = 'offline-shop';
  function draft(price: number) {
    const data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    data.shop.id = id; data.items[0].price = price;
    return data;
  }
  const service = () => createOnlineStorageService({ db, auth, isOnline: () => online });
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-qr-menu-offline-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => {
    localStorage.clear(); online = true;
    await env.clearFirestore();
    db = env.authenticatedContext('owner').firestore() as unknown as Firestore;
  });
  afterAll(async () => { if (env) await env.cleanup(); });
  async function seed() {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'shops', id), { id, ownerId: 'owner', name: 'Quán', draft: draft(1), hasPublished: true });
      await setDoc(doc(context.firestore(), 'published_menus', id), { shopId: id, ownerId: 'owner', shop: draft(1).shop, items: draft(1).items });
    });
  }
  test('Offline/reload/reconnect giữ nháp, chỉ cập nhật private; không tự xuất bản', async () => {
    await seed(); online = false;
    const saved = await service().saveDraft(id, draft(55));
    expect(saved.success).toBe(false); expect(saved.pending).toBe(true);
    const restored = await service().loadOwnerShop(id);
    expect(restored?.draft.items[0].price).toBe(55); expect(restored?.pending).toBe(true);
    expect((await getDocFromServer(doc(db, 'shops', id))).data()!.draft.items[0].price).toBe(1);
    expect((await service().publishShop(id, draft(55))).success).toBe(false);
    online = true;
    expect((await service().publishShop(id)).success).toBe(false);
    const restarted = service();
    const [a, b] = await Promise.all([restarted.syncPendingDrafts(), restarted.syncPendingDrafts()]);
    expect(a).toBe(b); expect(a[0].success).toBe(true);
    expect(StorageService.getPendingDraft(id, 'owner')).toBeNull();
    expect((await getDocFromServer(doc(db, 'shops', id))).data()!.draft.items[0].price).toBe(55);
    expect((await getDocFromServer(doc(db, 'published_menus', id))).data()!.items[0].price).toBe(1);
  });
  test('ACK cũ không xóa nháp mới; pending chỉ lấy được theo đúng owner', () => {
    const old = StorageService.savePendingDraft(id, draft(1), 'owner');
    const fresh = StorageService.savePendingDraft(id, draft(2), 'owner');
    StorageService.acknowledgeDraft(id, 'owner', old.token);
    expect(StorageService.getPendingDraft(id, 'owner')!.token).toBe(fresh.token);
    expect(StorageService.getPendingDraft(id, 'other')).toBeNull();
    expect(StorageService.listPendingDrafts('other')).toEqual([]);
    StorageService.acknowledgeDraft(id, 'owner', fresh.token);
    expect(StorageService.getPendingDraft(id, 'owner')).toBeNull();
  });
  test('Quota khi đã có pending cũ không ghi cloud mới rồi replay ngược nháp cũ', async () => {
    await seed(); online = false;
    await service().saveDraft(id, draft(10));
    online = true;
    const original = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: key => original.getItem(key),
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: key => original.removeItem(key), clear: () => original.clear(),
      key: index => original.key(index), get length() { return original.length; },
    };
    try {
      expect((await service().saveDraft(id, draft(20))).success).toBe(false);
      expect((await service().publishShop(id, draft(20))).success).toBe(false);
      expect((await getDocFromServer(doc(db, 'shops', id))).data()!.draft.items[0].price).toBe(1);
      expect(StorageService.getPendingDraft(id, 'owner')!.draft.items[0].price).toBe(10);
    } finally { globalThis.localStorage = original; }
    expect((await service().saveDraft(id, draft(20))).success).toBe(true);
    expect(StorageService.getPendingDraft(id, 'owner')).toBeNull();
  });
  test('Hai lần tạo quán đồng thời chỉ tạo một quán private; retry dùng quán cũ', async () => {
    const [a, b] = await Promise.all([service().createNewShopOnline({ name: 'Cà phê' }), service().createNewShopOnline({ name: 'Cà phê' })]);
    expect(a.shopId).toBe(b.shopId);
    const shops = await getDocsFromServer(query(collection(db, 'shops'), where('ownerId', '==', 'owner')));
    expect(shops.size).toBe(1);
    expect((await getDocFromServer(doc(db, 'users', 'owner'))).data()!.activeShopId).toBe(a.shopId);
    expect((await getDocFromServer(doc(db, 'published_menus', a.shopId))).exists()).toBe(false);
    expect((await service().createNewShopOnline({ name: 'Retry' })).shopId).toBe(a.shopId);
  });
  test('Query lỗi không trả [] và không tạo quán ma trong localStorage', async () => {
    const outsider = createOnlineStorageService({ db: env.unauthenticatedContext().firestore() as unknown as Firestore, auth });
    await expect(outsider.getUserShops('owner')).rejects.toThrow();
    await expect(outsider.createNewShopOnline({ name: 'Quán' })).rejects.toThrow();
    expect(Object.keys(StorageService.getAllShops())).toEqual([]);
    expect(StorageService.getShop('fake-shop')).toBeNull();
  });
  test('Transaction bị từ chối ở profile không để lại shop hoặc cache', async () => {
    const denied = await initializeTestEnvironment({ projectId: 'demo-qr-menu-provision-denied',
      firestore: { host: '127.0.0.1', port: 8080, rules: `rules_version = '2'; service cloud.firestore {
        match /databases/{database}/documents {
          match /shops/{id} { allow read, write: if true; }
          match /users/{id} { allow read: if true; allow write: if false; }
        }
      }` } });
    try {
      const blockedDb = denied.authenticatedContext('owner').firestore() as unknown as Firestore;
      const blocked = createOnlineStorageService({ db: blockedDb, auth });
      await expect(blocked.createNewShopOnline({ name: 'Blocked' })).rejects.toThrow();
      expect((await getDocsFromServer(collection(blockedDb, 'shops'))).empty).toBe(true);
      expect(Object.keys(StorageService.getAllShops())).toEqual([]);
    } finally { await denied.cleanup(); }
  });
});
