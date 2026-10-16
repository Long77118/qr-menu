import { createAuthSessionCoordinator } from './authSessionCore';
import { FirebaseAuthService } from './firebase';
import { OnlineStorageService } from './onlineStorage';
import { StorageService } from './storage';

export const AuthSession = createAuthSessionCoordinator({
  currentIdentity: () => FirebaseAuthService.getCurrentUser(),
  getUserShops: async uid => {
    const user = FirebaseAuthService.getCurrentUser();
    if (user && (await user.getIdTokenResult()).claims.qrAdmin === true) {
      window.location.hash = '/admin';
      throw new Error('Tài khoản quản trị đang được chuyển tới trang hệ thống.');
    }
    return OnlineStorageService.getUserShops(uid);
  },
  createShop: name => OnlineStorageService.createNewShopOnline({ name }),
  cachedProfile: () => StorageService.getCurrentUser(),
  hasLocalShop: id => !!StorageService.getShop(id),
  persist: profile => StorageService.setCurrentUser(profile),
});
