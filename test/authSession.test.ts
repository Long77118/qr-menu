import { test, expect } from 'bun:test';
import { createAuthSessionCoordinator } from '../src/services/authSessionCore';
import { UserProfile } from '../src/types/menu';

function harness() {
  let uid = 'owner';
  let cached: UserProfile | null = null;
  let shops = ['existing'];
  let failure: unknown;
  let created = 0;
  let persisted = 0;
  let wait: Promise<void> | undefined;
  const coordinator = createAuthSessionCoordinator({
    currentIdentity: () => ({ uid }),
    cachedProfile: () => cached,
    hasLocalShop: () => true,
    persist: p => { cached = p; persisted++; },
    getUserShops: async () => { if (wait) await wait; if (failure) throw failure; return shops; },
    createShop: async () => { created++; return { shopId: 'new' }; },
  });
  return { coordinator, setUid: (v: string) => { uid = v; }, setShops: (v: string[]) => { shops = v; },
    setFailure: (v: unknown) => { failure = v; }, setWait: (v: Promise<void>) => { wait = v; },
    setCached: (v: UserProfile) => { cached = v; }, counts: () => ({ created, persisted }) };
}

test('Lỗi đọc quyền/mạng không tạo quán và không lưu phiên thành công', async () => {
  for (const code of ['permission-denied', 'unavailable']) {
    const h = harness();
    h.setFailure(Object.assign(new Error(code), { code }));
    await expect(h.coordinator.run(async () => ({ uid: 'owner' }), {})).rejects.toThrow(code);
    expect(h.counts()).toEqual({ created: 0, persisted: 0 });
  }
});
test('Restore không tạo quán giả khi danh sách quán rỗng', async () => {
  const h = harness(); h.setShops([]);
  expect(await h.coordinator.restore({ uid: 'owner' })).toEqual({ needsSetup: true });
  expect(h.counts()).toEqual({ created: 0, persisted: 0 });
  expect((await h.coordinator.run(async () => ({ uid: 'owner' }), {})).shopId).toBe('new');
  expect(h.counts()).toEqual({ created: 1, persisted: 1 });
});
test('Listener bỏ qua login đang chạy; hai nguồn không cấp phát hai quán', async () => {
  const h = harness(); h.setShops([]);
  let release!: () => void;
  h.setWait(new Promise(resolve => { release = resolve; }));
  const login = h.coordinator.run(async () => ({ uid: 'owner' }), {});
  expect(await h.coordinator.restore({ uid: 'owner' })).toEqual({ ignored: true });
  release(); await login;
  expect(h.counts()).toEqual({ created: 1, persisted: 1 });
});
test('Kết quả phiên cũ sau đổi tài khoản không được ghi vào session', async () => {
  const h = harness(); let release!: () => void;
  h.setWait(new Promise(resolve => { release = resolve; }));
  const restore = h.coordinator.restore({ uid: 'owner' });
  h.setUid('other'); h.coordinator.invalidate(); release();
  expect(await restore).toEqual({ ignored: true });
  expect(h.counts().persisted).toBe(0);
});
test('Offline chỉ khôi phục cache đúng uid; permission-denied vẫn báo lỗi', async () => {
  const h = harness();
  const cached = { id: 'owner', shopId: 'existing', email: '', displayName: 'Chủ', isFirebaseUser: true };
  h.setCached(cached);
  h.setFailure(Object.assign(new Error('offline'), { code: 'unavailable' }));
  expect(await h.coordinator.restore({ uid: 'owner' })).toEqual({ profile: cached, offline: true });
  h.setUid('other');
  await expect(h.coordinator.restore({ uid: 'other' })).rejects.toThrow('offline');
  h.setUid('owner'); h.setFailure(Object.assign(new Error('denied'), { code: 'permission-denied' }));
  await expect(h.coordinator.restore({ uid: 'owner' })).rejects.toThrow('denied');
});
