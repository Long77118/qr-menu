import { db } from './firebase';
import { createMenuDirectoryService } from './menuDirectoryCore';
export const MenuDirectoryService = createMenuDirectoryService(db);
