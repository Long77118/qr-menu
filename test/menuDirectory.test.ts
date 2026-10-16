import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, test, expect } from 'bun:test';
import { Firestore, doc, setDoc, getDocFromServer, getDocsFromServer, collection, query, where, limit,
  writeBatch, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { INITIAL_DEMO_DATA } from './fixtures/menuFixture';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { createAdminStorageService } from '../src/services/adminStorageCore';
import { createMenuDirectoryService, DirectoryPage } from '../src/services/menuDirectoryCore';
import { menuDirectoryEntry, matchesDirectorySearch, addressMapUrl } from '../src/utils/menuDirectory';
import { COUNTRY_CODES, countryName } from '../src/utils/countries';

describe('Menu discovery: public summary, publish and moderation', () => {
  let env: RulesTestEnvironment, owner: Firestore, guest: Firestore, admin: Firestore;
  const id = 'directory-shop';
  const draft = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  draft.shop.id = id; draft.shop.address = '12 Đường Trà, Đà Nẵng';
  const online = () => createOnlineStorageService({ db: owner, auth: { currentUser: { uid: 'owner' } } });
  const moderator = () => createAdminStorageService({ db: admin, principal: async () => ({ uid: 'admin', isAdmin: true }) });
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-qr-menu-directory-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => {
    localStorage.clear(); await env.clearFirestore();
    owner = env.authenticatedContext('owner').firestore() as unknown as Firestore;
    guest = env.unauthenticatedContext().firestore() as unknown as Firestore;
    admin = env.authenticatedContext('admin', { qrAdmin: true }).firestore() as unknown as Firestore;
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'shops', id), { id, ownerId: 'owner', name: draft.shop.name, draft, hasPublished: false });
    });
  });
  afterAll(async () => { await env.cleanup(); });
  const listing = () => getDocsFromServer(query(collection(guest, 'menu_directory'), where('active', '==', true), limit(25)));

  test('Anonymous public listing shows only published version; draft remains private', async () => {
    expect((await listing()).empty).toBe(true);
    expect((await online().publishShop(id, draft)).success).toBe(true);
    const entry = (await listing()).docs[0].data();
    expect(Object.keys(entry).sort()).toEqual(['active', 'address', 'countryCode', 'imageUrl', 'name', 'publishedAt', 'shopId', 'tagline']);
    expect(entry.address).toBe(draft.shop.address);
    const next = structuredClone(draft); next.shop.address = 'Địa chỉ nháp chưa xuất bản';
    expect((await online().saveDraft(id, next)).success).toBe(true);
    expect((await listing()).docs[0].data().address).toBe(draft.shop.address);
    await assertFails(getDocFromServer(doc(guest, 'shops', id)));
    await assertFails(getDocsFromServer(collection(guest, 'published_menus')));
    expect((await online().publishShop(id, next)).success).toBe(true);
    expect((await listing()).docs[0].data().address).toBe(next.shop.address);
  });
  test('Reject forged summary, extra private fields, guest writes and unbounded listing', async () => {
    expect((await online().publishShop(id, draft)).success).toBe(true);
    await assertFails(updateDoc(doc(owner, 'menu_directory', id), { address: 'Fake address' }));
    await assertFails(updateDoc(doc(owner, 'menu_directory', id), { ownerId: 'owner' }));
    await assertFails(updateDoc(doc(guest, 'menu_directory', id), { name: 'Fake' }));
    await assertFails(getDocsFromServer(collection(guest, 'menu_directory')));
    await assertFails(getDocsFromServer(query(collection(guest, 'menu_directory'), where('active', '==', true), limit(26))));
  });
  test('Pause/resume changes discovery atomically; owner cannot reactivate paused entry', async () => {
    expect((await online().publishShop(id, draft)).success).toBe(true);
    await moderator().setShopStatus(id, 'suspended', 'Review');
    expect((await listing()).empty).toBe(true);
    await assertFails(getDocFromServer(doc(guest, 'menu_directory', id)));
    await assertFails(updateDoc(doc(owner, 'menu_directory', id), { active: true }));
    expect((await online().publishShop(id, draft)).success).toBe(false);
    await moderator().setShopStatus(id, 'active', 'Resolved');
    expect((await listing()).size).toBe(1);
    const batch = writeBatch(admin);
    const audit = doc(collection(admin, 'admin_logs'));
    batch.set(doc(admin, 'shop_controls', id), { shopId: id, status: 'suspended', lastAuditId: audit.id, updatedAt: serverTimestamp() });
    batch.set(audit, { actorId: 'admin', shopId: id, status: 'suspended', previousStatus: 'active', action: 'set_shop_status', reason: 'Without directory update', createdAt: serverTimestamp() });
    await assertFails(batch.commit());
    expect((await listing()).size).toBe(1);
  });
  test('Deleting published menu must remove its discovery entry in the same batch', async () => {
    expect((await online().publishShop(id, draft)).success).toBe(true);
    await assertFails(deleteDoc(doc(owner, 'published_menus', id)));
    await assertFails(deleteDoc(doc(owner, 'shops', id)));
    const batch = writeBatch(owner);
    batch.delete(doc(owner, 'menu_directory', id)); batch.delete(doc(owner, 'published_menus', id));
    await assertSucceeds(batch.commit());
    expect((await listing()).empty).toBe(true);
  });
  test('Realtime pagination returns 12 entries with no skipped boundary', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const batch = writeBatch(context.firestore());
      for (let i = 0; i < 26; i++) {
        const shop = { ...draft.shop, id: `page-${String(i).padStart(2, '0')}` };
        batch.set(doc(context.firestore(), 'menu_directory', shop.id), menuDirectoryEntry(shop, '2026-10-13'));
      }
      await batch.commit();
    });
    const service = createMenuDirectoryService(guest);
    const readPage = (cursor?: DirectoryPage['cursor']) => new Promise<DirectoryPage>((resolve, reject) => {
      const timer = setTimeout(() => { unsubscribe(); reject(new Error('Directory timeout')); }, 8000);
      const unsubscribe = service.subscribe(cursor, page => { clearTimeout(timer); unsubscribe(); resolve(page); }, () => {});
    });
    const first = await readPage(); const second = await readPage(first.cursor); const third=await readPage(second.cursor);
    expect(first.entries.length).toBe(12); expect(first.hasMore).toBe(true);
    expect(second.entries.length).toBe(12); expect(second.hasMore).toBe(true);
    expect(third.entries.length).toBe(2); expect(third.hasMore).toBe(false);
    expect(new Set([...first.entries, ...second.entries,...third.entries].map(entry => entry.shopId)).size).toBe(26);
  });
  test('Address search handles Vietnamese accents; map query is encoded', () => {
    expect(matchesDirectorySearch({ name: 'Quán Đậu', address: 'Đà Nẵng' }, 'da nang')).toBe(true);
    expect(matchesDirectorySearch({ name: 'Quán Đậu', address: 'Đà Nẵng' }, 'quan dau')).toBe(true);
    expect(matchesDirectorySearch({ name: 'Quán Đậu', address: 'Đà Nẵng' }, 'Sài Gòn')).toBe(false);
    expect(new URL(addressMapUrl('12 A & B, Đà Nẵng')).searchParams.get('query')).toBe('12 A & B, Đà Nẵng');
  });
  test('Country and card image follow published snapshot; draft cannot change discovery', async () => {
    const selected = structuredClone(draft);
    selected.shop.countryCode = 'VN'; selected.shop.discoveryImageUrl = 'data:image/jpeg;base64,dGVzdA==';
    expect((await online().publishShop(id, selected)).success).toBe(true);
    let entry = (await listing()).docs[0].data();
    expect(entry.countryCode).toBe('VN'); expect(entry.imageUrl).toBe(selected.shop.discoveryImageUrl);
    const next = structuredClone(selected); next.shop.countryCode = 'TH'; next.shop.discoveryImageUrl = 'https://example.test/new-photo.jpg';
    expect((await online().saveDraft(id, next)).success).toBe(true);
    entry = (await listing()).docs[0].data();
    expect(entry.countryCode).toBe('VN'); expect(entry.imageUrl).toBe(selected.shop.discoveryImageUrl);
    await assertFails(updateDoc(doc(owner, 'menu_directory', id), { countryCode: 'TH' }));
    await assertFails(updateDoc(doc(owner, 'menu_directory', id), { imageUrl: 'https://example.test/private.jpg' }));
    expect((await online().publishShop(id, next)).success).toBe(true);
    entry = (await listing()).docs[0].data();
    expect(entry.countryCode).toBe('TH'); expect(entry.imageUrl).toBe(next.shop.discoveryImageUrl);
    delete next.shop.discoveryImageUrl;
    expect((await online().publishShop(id, next)).success).toBe(true);
    expect((await listing()).docs[0].data().imageUrl).toBe(next.shop.coverUrl);
  });
  test('Country query filters all records before pagination, including unknown country', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const batch = writeBatch(context.firestore());
      for (let i = 0; i < 27; i++) {
        const shop = { ...draft.shop, id: `filter-${String(i).padStart(2, '0')}`, countryCode: i < 25 ? 'VN' : i === 25 ? 'TH' : '' };
        batch.set(doc(context.firestore(), 'menu_directory', shop.id), menuDirectoryEntry(shop, '2026-10-13'));
      }
      await batch.commit();
    });
    const service = createMenuDirectoryService(guest);
    const read = (country: string, cursor?: DirectoryPage['cursor']) => new Promise<DirectoryPage>((resolve, reject) => {
      const timer = setTimeout(() => { unsubscribe(); reject(new Error('Filter timeout')); }, 8000);
      const unsubscribe = service.subscribe(cursor, page => { clearTimeout(timer); unsubscribe(); resolve(page); }, () => {}, country);
    });
    const vn = await read('VN'); const vnNext = await read('VN', vn.cursor); const vnLast=await read('VN',vnNext.cursor); const th = await read('TH'); const unknown = await read('unknown');
    expect(vn.entries.length).toBe(12); expect(vn.hasMore).toBe(true);
    expect(vnNext.entries.length).toBe(12); expect(vnNext.hasMore).toBe(true);
    expect(vnLast.entries.length).toBe(1); expect(vnLast.hasMore).toBe(false);
    expect([...vn.entries, ...vnNext.entries,...vnLast.entries].every(entry => entry.countryCode === 'VN')).toBe(true);
    expect(th.entries.length).toBe(1); expect(th.entries[0].countryCode).toBe('TH');
    expect(unknown.entries.length).toBe(1); expect(unknown.entries[0].countryCode).toBe('');
    expect((await read('JP')).entries.length).toBe(0);
  });
  test('Invalid ISO code is rejected without changing public summary; rules country list matches UI', async () => {
    expect((await online().publishShop(id, draft)).success).toBe(true);
    const invalid = structuredClone(draft); invalid.shop.countryCode = 'ZZ';
    expect((await online().publishShop(id, invalid)).success).toBe(false);
    expect((await listing()).docs[0].data().countryCode).toBe('');
    const batch = writeBatch(owner);
    const at = '2026-10-13';
    batch.set(doc(owner, 'published_menus', id), { ownerId: 'owner', shopId: id, shop: invalid.shop, publishedAt: at });
    batch.set(doc(owner, 'menu_directory', id), { ...menuDirectoryEntry(draft.shop, at), countryCode: 'ZZ' });
    await assertFails(batch.commit());
    const ruleCodes = [...readFileSync('firestore.rules', 'utf8').matchAll(/'([A-Z]{2})'/g)].map(match => match[1]);
    expect(new Set(ruleCodes)).toEqual(new Set(COUNTRY_CODES));
    expect(COUNTRY_CODES.length).toBe(249); expect(new Set(COUNTRY_CODES).size).toBe(249);
    expect(countryName('VN')).toBe('Việt Nam'); expect(countryName()).toBe('Chưa cập nhật quốc gia');
  });
});
