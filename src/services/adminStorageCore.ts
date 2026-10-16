import { Firestore, collection, doc, getDocsFromServer, getDocFromServer, query, orderBy,
  documentId, limit, startAfter, QueryDocumentSnapshot, DocumentData, runTransaction, serverTimestamp, getCountFromServer, where } from 'firebase/firestore';

export type ShopStatus = 'active' | 'suspended';
export interface AdminRow { id: string; data: Record<string, any> }
export interface AdminPage { rows: AdminRow[]; cursor?: QueryDocumentSnapshot<DocumentData>; hasMore: boolean }
export function createAdminStorageService(deps: {
  db: Firestore;
  principal(): Promise<{ uid: string; isAdmin: boolean } | null>;
}) {
  async function authorize() {
    const actor = await deps.principal();
    if (!actor?.isAdmin) throw new Error('Tài khoản không có quyền quản trị hệ thống.');
    return actor;
  }
  return {
    async overview() {
      await authorize();
      const [shops, users, published, suspended] = await Promise.all([
        getCountFromServer(collection(deps.db, 'shops')),
        getCountFromServer(collection(deps.db, 'users')),
        getCountFromServer(query(collection(deps.db, 'shops'), where('hasPublished', '==', true))),
        getCountFromServer(query(collection(deps.db, 'shop_controls'), where('status', '==', 'suspended'))),
      ]);
      return { shops: shops.data().count, users: users.data().count,
        published: published.data().count, suspended: suspended.data().count };
    },
    async list(kind: 'shops' | 'users' | 'admin_logs', cursor?: QueryDocumentSnapshot<DocumentData>): Promise<AdminPage> {
      await authorize();
      const constraints = kind === 'admin_logs' ? [orderBy('createdAt', 'desc')] : [orderBy(documentId())];
      const result = await getDocsFromServer(query(collection(deps.db, kind), ...constraints,
        ...(cursor ? [startAfter(cursor)] : []), limit(51)));
      const page = result.docs.slice(0, 50);
      return { rows: page.map(row => ({ id: row.id, data: row.data() })), cursor: page.at(-1), hasMore: result.docs.length > 50 };
    },
    async getShop(shopId: string): Promise<AdminRow> {
      await authorize();
      const record = await getDocFromServer(doc(deps.db, 'shops', shopId));
      if (!record.exists()) throw new Error('Không tìm thấy quán.');
      return { id: record.id, data: record.data() };
    },
    async statuses(ids: string[]): Promise<Record<string, ShopStatus>> {
      await authorize();
      const rows = await Promise.all(ids.map(async id => {
        const status = await getDocFromServer(doc(deps.db, 'shop_controls', id));
        return [id, status.data()?.status ?? 'active'] as const;
      }));
      return Object.fromEntries(rows);
    },
    async setShopStatus(shopId: string, status: ShopStatus, reason: string) {
      const actor = await authorize();
      const explanation = reason.trim();
      if (!['active', 'suspended'].includes(status) || !explanation || explanation.length > 500) throw new Error('Nhập lý do từ 1 đến 500 ký tự.');
      const control = doc(deps.db, 'shop_controls', shopId);
      const audit = doc(collection(deps.db, 'admin_logs'));
      const apply = () => runTransaction(deps.db, async transaction => {
        const currentActor = await authorize();
        if (currentActor.uid !== actor.uid) throw new Error('Phiên quản trị đã thay đổi.');
        const shop = await transaction.get(doc(deps.db, 'shops', shopId));
        const previous = await transaction.get(control);
        const directoryRef = doc(deps.db, 'menu_directory', shopId);
        const directory = await transaction.get(directoryRef);
        if (!shop.exists()) throw new Error('Không tìm thấy quán.');
        const previousStatus: ShopStatus = previous.data()?.status ?? 'active';
        if (previousStatus === status) return { changed: false };
        transaction.set(control, { shopId, status, lastAuditId: audit.id, updatedAt: serverTimestamp() });
        if (directory.exists()) transaction.update(directoryRef, { active: status === 'active' });
        transaction.set(audit, { actorId: actor.uid, shopId, status, previousStatus,
          action: 'set_shop_status', reason: explanation, createdAt: serverTimestamp() });
        return { changed: true };
      });
      try { return await apply(); }
      catch (error) {
        // Rules may reject a stale previousStatus before the SDK classifies the conflict.
        // Re-read once in a new transaction; unchanged status becomes a no-op, denial stays denial.
        if ((error as { code?: string }).code === 'permission-denied') return apply();
        throw error;
      }
    },
  };
}
