import { beforeAll, beforeEach, afterAll, describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Firestore, doc, setDoc, getDocFromServer, getDocsFromServer, collection, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createAdminStorageService } from '../src/services/adminStorageCore';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { StorageService } from '../src/services/storage';
import { INITIAL_DEMO_DATA } from './fixtures/menuFixture';

if (typeof globalThis.localStorage === 'undefined') {
  const values = new Map<string, string>();
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, String(v)); },
    removeItem: k => { values.delete(k); }, clear: () => values.clear(), key: i => [...values.keys()][i] ?? null,
    get length() { return values.size; } };
}

describe('Đợt 6: admin, trạng thái quán và audit log', () => {
  let env: RulesTestEnvironment;
  let admin: Firestore;
  let owner: Firestore;
  let guest: Firestore;
  let service: ReturnType<typeof createAdminStorageService>;
  const id = 'admin-target';
  const draft = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  draft.shop.id = id;
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-qr-menu-admin-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => {
    localStorage.clear();
    await env.clearFirestore();
    admin = env.authenticatedContext('system-admin', { qrAdmin: true }).firestore() as unknown as Firestore;
    owner = env.authenticatedContext('owner').firestore() as unknown as Firestore;
    guest = env.unauthenticatedContext().firestore() as unknown as Firestore;
    service = createAdminStorageService({ db: admin, principal: async () => ({ uid: 'system-admin', isAdmin: true }) });
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'shops', id), { id, ownerId: 'owner', name: 'Quán thử', draft, hasPublished: true });
      await setDoc(doc(context.firestore(), 'users', 'owner'), { userId: 'owner', email: 'owner@example.test', activeShopId: id });
      await setDoc(doc(context.firestore(), 'published_menus', id), { shopId: id, ownerId: 'owner', shop: draft.shop, items: draft.items, categories: draft.categories });
    });
  });
  afterAll(async () => { if (env) await env.cleanup(); });

  test('Admin claim thật đọc danh sách và thống kê; owner/guest/spoof local không có quyền', async () => {
    expect((await service.list('shops')).rows[0].id).toBe(id);
    expect((await service.list('users')).rows[0].id).toBe('owner');
    expect(await service.overview()).toEqual({ shops: 1, users: 1, published: 1, suspended: 0 });
    for (const db of [owner, guest]) {
      await assertFails(getDocsFromServer(collection(db, 'users')));
      await assertFails(getDocsFromServer(collection(db, 'admin_logs')));
      await assertFails(getDocFromServer(doc(db, 'users', 'other')));
    }
    const spoof = createAdminStorageService({ db: owner, principal: async () => ({ uid: 'owner', isAdmin: true }) });
    await expect(spoof.list('users')).rejects.toThrow();
    await assertSucceeds(setDoc(doc(owner, 'users', 'owner'), { qrAdmin: true }, { merge: true }));
    await assertFails(getDocsFromServer(collection(owner, 'users')));
    await assertFails(updateDoc(doc(admin, 'shops', id), { ownerId: 'system-admin' }));
    await assertFails(updateDoc(doc(admin, 'published_menus', id), { shop: draft.shop }));
  });
  test('Tạm ngưng nguyên tử có audit; giữ nháp; chặn guest và publish; mở lại dùng public cũ', async () => {
    const online = createOnlineStorageService({ db: owner, auth: { currentUser: { uid: 'owner' } } });
    expect((await service.setShopStatus(id, 'suspended', '  Kiểm tra nội dung  ')).changed).toBe(true);
    const control = (await getDocFromServer(doc(admin, 'shop_controls', id))).data()!;
    const log = (await getDocFromServer(doc(admin, 'admin_logs', control.lastAuditId))).data()!;
    expect(log.actorId).toBe('system-admin'); expect(log.reason).toBe('Kiểm tra nội dung');
    expect(log.previousStatus).toBe('active'); expect(log.status).toBe('suspended');
    expect((await service.overview()).suspended).toBe(1);
    await assertFails(getDocFromServer(doc(guest, 'published_menus', id)));
    await assertSucceeds(getDocFromServer(doc(admin, 'published_menus', id)));
    await assertSucceeds(getDocFromServer(doc(owner, 'shops', id)));
    expect((await online.saveDraft(id, draft)).success).toBe(true);
    const published = await online.publishShop(id, draft);
    expect(published.success).toBe(false); expect(published.error).toContain('tạm ngưng');
    await assertFails(setDoc(doc(owner, 'published_menus', id), { shopId: id, ownerId: 'owner', shop: draft.shop, items: draft.items }));
    expect((await service.setShopStatus(id, 'active', 'Đã xử lý')).changed).toBe(true);
    await assertSucceeds(getDocFromServer(doc(guest, 'published_menus', id)));
    expect((await getDocsFromServer(collection(admin, 'admin_logs'))).size).toBe(2);
  });
  test('Không cho admin đổi trạng thái thiếu log; owner không tự mở khóa; log bất biến', async () => {
    await assertFails(setDoc(doc(admin, 'shop_controls', id), { shopId: id, status: 'suspended', updatedAt: serverTimestamp(), lastAuditId: 'missing' }));
    await service.setShopStatus(id, 'suspended', 'Review');
    const control = (await getDocFromServer(doc(admin, 'shop_controls', id))).data()!;
    await assertFails(updateDoc(doc(owner, 'shop_controls', id), { status: 'active' }));
    await assertFails(updateDoc(doc(admin, 'admin_logs', control.lastAuditId), { reason: 'Rewrite' }));
    await assertFails(deleteDoc(doc(admin, 'admin_logs', control.lastAuditId)));
    await assertFails(deleteDoc(doc(admin, 'shop_controls', id)));
    expect((await service.setShopStatus(id, 'suspended', 'No change')).changed).toBe(false);
    expect((await getDocsFromServer(collection(admin, 'admin_logs'))).size).toBe(1);
    await expect(service.setShopStatus(id, 'active', '   ')).rejects.toThrow();
  });
  test('Log actor hoặc shop không khớp thì toàn batch bị từ chối', async () => {
    const batch = writeBatch(admin);
    batch.set(doc(admin, 'shop_controls', id), { shopId: id, status: 'suspended', updatedAt: serverTimestamp(), lastAuditId: 'fake' });
    batch.set(doc(admin, 'admin_logs', 'fake'), { actorId: 'other', shopId: id, status: 'suspended', previousStatus: 'active', action: 'set_shop_status', reason: 'Fake', createdAt: serverTimestamp() });
    await assertFails(batch.commit());
    expect((await getDocFromServer(doc(admin, 'shop_controls', id))).exists()).toBe(false);
    expect((await getDocsFromServer(collection(admin, 'admin_logs'))).empty).toBe(true);
  });
  test('Service role deny không đọc DB; pagination không bỏ bản ghi giữa các trang', async () => {
    const denied = createAdminStorageService({ db: admin, principal: async () => null });
    await expect(denied.list('shops')).rejects.toThrow('quyền quản trị');
    await env.withSecurityRulesDisabled(async context => {
      const batch = writeBatch(context.firestore());
      for (let i = 0; i < 52; i++) batch.set(doc(context.firestore(), 'users', `user-${String(i).padStart(3, '0')}`), { userId: `user-${i}` });
      await batch.commit();
    });
    const a = await service.list('users'); const b = await service.list('users', a.cursor);
    expect(a.rows.length).toBe(50); expect(a.hasMore).toBe(true);
    expect(b.rows.length).toBe(3); expect(b.hasMore).toBe(false);
    expect(new Set([...a.rows, ...b.rows].map(row => row.id)).size).toBe(53);
  });
  test('Hai admin đổi cùng trạng thái: transaction retry chỉ ghi một log', async () => {
    const other = createAdminStorageService({ db: env.authenticatedContext('admin-2', { qrAdmin: true }).firestore() as unknown as Firestore,
      principal: async () => ({ uid: 'admin-2', isAdmin: true }) });
    const result = await Promise.all([service.setShopStatus(id, 'suspended', 'First'), other.setShopStatus(id, 'suspended', 'Second')]);
    expect(result.filter(row => row.changed).length).toBe(1);
    expect((await getDocsFromServer(collection(admin, 'admin_logs'))).size).toBe(1);
  });
  test('Guest không fallback cache khi menu bị tạm ngưng', async () => {
    expect(StorageService.mirrorPublishedShop(id, draft).success).toBe(true);
    await service.setShopStatus(id, 'suspended', 'Hidden');
    const publicService = createOnlineStorageService({ db: guest, auth: { currentUser: null } });
    expect(await publicService.getPublishedMenu(id)).toBeNull();
  });
  test('Former sample slug does not bypass cloud reads or create a fake public menu', async () => {
    const publicService = createOnlineStorageService({ db: guest, auth: { currentUser: null } });
    expect(await publicService.getPublishedMenu('moc-bep-cafe')).toBeNull();
    let unsubscribe = () => {};
    try {
      const menu = await new Promise(resolve => {
        unsubscribe = publicService.subscribeToPublishedMenu('moc-bep-cafe', resolve);
      });
      expect(menu).toBeNull();
    } finally { unsubscribe(); }
  });
  test('Menu cloud đã xóa không xuất hiện lại từ public cache', async () => {
    StorageService.mirrorPublishedShop(id, draft);
    await deleteDoc(doc(owner, 'published_menus', id));
    const publicService = createOnlineStorageService({ db: guest, auth: { currentUser: null } });
    expect(await publicService.getPublishedMenu(id)).toBeNull();
  });
  test('Realtime guest tắt menu khi tạm ngưng và phục hồi khi mở lại', async () => {
    const publicService = createOnlineStorageService({ db: guest, auth: { currentUser: null } });
    let latest: any = 'initial';
    let expectValue: boolean;
    let resolve!: () => void;
    let waiting = new Promise<void>(r => { resolve = r; });
    expectValue = true;
    const unsubscribe = publicService.subscribeToPublishedMenu(id, data => {
      latest = data;
      if ((data !== null) === expectValue) resolve();
    });
    const bounded = (promise: Promise<void>) => Promise.race([promise, new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime timeout')), 4000); timer.unref();
    })]);
    try {
      await bounded(waiting); expect(latest.shop.id).toBe(id);
      expectValue = false; waiting = new Promise(r => { resolve = r; });
      await service.setShopStatus(id, 'suspended', 'Pause');
      await bounded(waiting); expect(latest).toBeNull();
      expectValue = true; waiting = new Promise(r => { resolve = r; });
      await service.setShopStatus(id, 'active', 'Resume');
      await bounded(waiting); expect(latest.shop.id).toBe(id);
    } finally { unsubscribe(); }
  });
});
