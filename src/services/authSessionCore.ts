import { UserProfile } from '../types/menu';

interface Identity { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }
interface Dependencies {
  currentIdentity(): Identity | null;
  getUserShops(uid: string): Promise<string[]>;
  createShop(name: string): Promise<{ shopId: string }>;
  cachedProfile(): UserProfile | null;
  hasLocalShop(id: string): boolean;
  persist(profile: UserProfile): void;
}
export type RestoreResult = { profile?: UserProfile; ignored?: boolean; needsSetup?: boolean; offline?: boolean };

/** One authority for interactive login and background restoration; never provision on restore. */
export function createAuthSessionCoordinator(deps: Dependencies) {
  let generation = 0;
  let busy = false;
  const valid = (ticket: number, user: Identity) => ticket === generation && deps.currentIdentity()?.uid === user.uid;
  function profile(user: Identity, shopId: string): UserProfile {
    const cached = deps.cachedProfile();
    return {
      id: user.uid, email: user.email || '', shopId, isFirebaseUser: true,
      displayName: user.displayName || (cached?.id === user.uid ? cached.displayName : '') || 'Chủ quán',
      ...(user.photoURL ? { photoUrl: user.photoURL } : {}),
    };
  }
  return {
    invalidate() { generation++; },
    isBusy() { return busy; },
    async run(authenticate: () => Promise<Identity>, setup: { name?: string }): Promise<UserProfile> {
      if (busy) throw new Error('Đang xử lý đăng nhập.');
      busy = true;
      const ticket = ++generation;
      try {
        const user = await authenticate();
        const check = () => { if (!valid(ticket, user)) throw new Error('Phiên đăng nhập đã thay đổi.'); };
        check();
        const shops = await deps.getUserShops(user.uid);
        check();
        const cached = deps.cachedProfile();
        let shopId = cached?.id === user.uid && shops.includes(cached.shopId) ? cached.shopId : shops[0];
        if (!shopId) shopId = (await deps.createShop(setup.name?.trim() || `Quán của ${user.displayName || 'tôi'}`)).shopId;
        check();
        const result = profile(user, shopId);
        deps.persist(result);
        return result;
      } finally { busy = false; }
    },
    async restore(user: Identity): Promise<RestoreResult> {
      if (busy) return { ignored: true };
      const ticket = ++generation;
      try {
        const shops = await deps.getUserShops(user.uid);
        if (!valid(ticket, user)) return { ignored: true };
        if (!shops.length) return { needsSetup: true };
        const cached = deps.cachedProfile();
        const shopId = cached?.id === user.uid && shops.includes(cached.shopId) ? cached.shopId : shops[0];
        const result = profile(user, shopId);
        deps.persist(result);
        return { profile: result };
      } catch (error) {
        if (!valid(ticket, user)) return { ignored: true };
        const code = (error as { code?: string }).code;
        const cached = deps.cachedProfile();
        if ((code === 'unavailable' || code === 'deadline-exceeded') && cached?.isFirebaseUser
          && cached.id === user.uid && deps.hasLocalShop(cached.shopId)) return { profile: cached, offline: true };
        throw error;
      }
    },
  };
}
