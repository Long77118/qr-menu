import { auth, db } from './firebase';
import { createAdminStorageService } from './adminStorageCore';

export const AdminStorageService = createAdminStorageService({
  db,
  principal: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdTokenResult();
    if (auth.currentUser?.uid !== user.uid) return null;
    return { uid: user.uid, isAdmin: token.claims.qrAdmin === true };
  },
});
