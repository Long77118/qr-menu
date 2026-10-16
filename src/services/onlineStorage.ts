/** Production binding; tests import onlineStorageCore with emulator dependencies instead. */
import { db, auth } from './firebase';
import { createOnlineStorageService } from './onlineStorageCore';
import { prepareMenuMedia } from './menuMedia';

export type { CloudShopRecord, CloudPublishedMenu, OnlineStorageDependencies } from './onlineStorageCore';
export const OnlineStorageService = createOnlineStorageService({ db, auth, prepareDraft:prepareMenuMedia });
