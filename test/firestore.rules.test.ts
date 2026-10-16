import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, test, beforeAll, afterAll, beforeEach, expect } from 'bun:test';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  collection,
} from 'firebase/firestore';

describe('Firestore Security Rules - published_menus & shops protection', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-qr-menu-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Create baseline fixtures using emulator admin context (Security Rules Disabled)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Shop A owned by user_a
      await setDoc(doc(adminDb, 'shops', 'shop-a'), {
        id: 'shop-a',
        ownerId: 'user_a',
        name: 'Mộc Bếp & Cafe',
        draft: {
          shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
          categories: [],
          items: [],
        },
        hasPublished: false,
        createdAt: new Date().toISOString(),
      });

      // Shop B owned by user_b
      await setDoc(doc(adminDb, 'shops', 'shop-b'), {
        id: 'shop-b',
        ownerId: 'user_b',
        name: 'Trà Chanh Phố',
        draft: {
          shop: { id: 'shop-b', name: 'Trà Chanh Phố' },
          categories: [],
          items: [],
        },
        hasPublished: false,
        createdAt: new Date().toISOString(),
      });
    });
  });

  test('1. A sở hữu shops/x và chưa có published_menus/x: B create public menu x với ownerId=B bị deny', async () => {
    const userBContext = testEnv.authenticatedContext('user_b');
    const dbB = userBContext.firestore();

    const maliciousPayload = {
      shopId: 'shop-a',
      ownerId: 'user_b',
      shop: { id: 'shop-a', name: 'Quán A cướp bởi B' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    };

    await assertFails(setDoc(doc(dbB, 'published_menus', 'shop-a'), maliciousPayload));
  });

  test('2. B create với ownerId=A cũng bị deny', async () => {
    const userBContext = testEnv.authenticatedContext('user_b');
    const dbB = userBContext.firestore();

    const spoofedPayload = {
      shopId: 'shop-a',
      ownerId: 'user_a',
      shop: { id: 'shop-a', name: 'Mộc Bếp' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    };

    await assertFails(setDoc(doc(dbB, 'published_menus', 'shop-a'), spoofedPayload));
  });

  test('3. A create payload hợp lệ thành công; published_menus cho quán chưa tồn tại bị deny', async () => {
    const userAContext = testEnv.authenticatedContext('user_a');
    const dbA = userAContext.firestore();

    const validPayloadA = {
      shopId: 'shop-a',
      ownerId: 'user_a',
      shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
      categories: [{ id: 'cat-1', name: 'Cà phê', order: 0 }],
      items: [{ id: 'item-1', name: 'Cà phê sữa', price: 28000, categoryId: 'cat-1' }],
      publishedAt: new Date().toISOString(),
    };

    // A create valid payload -> succeeds
    await assertSucceeds(setDoc(doc(dbA, 'published_menus', 'shop-a'), validPayloadA));

    // A create menu for non-existent shop -> fails
    const nonExistentPayload = {
      shopId: 'non-existent-shop',
      ownerId: 'user_a',
      shop: { id: 'non-existent-shop', name: 'Chưa Đăng Ký' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    };
    await assertFails(setDoc(doc(dbA, 'published_menus', 'non-existent-shop'), nonExistentPayload));
  });

  test('4. A update hợp lệ thành công; sửa ownerId/shopId/shop.id bị deny', async () => {
    const userAContext = testEnv.authenticatedContext('user_a');
    const dbA = userAContext.firestore();

    // Setup initial published menu by A
    const initialPayload = {
      shopId: 'shop-a',
      ownerId: 'user_a',
      shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    };
    await assertSucceeds(setDoc(doc(dbA, 'published_menus', 'shop-a'), initialPayload));

    // A update valid -> succeeds
    const validUpdatePayload = {
      ...initialPayload,
      items: [{ id: 'item-1', name: 'Cà phê đen', price: 20000, categoryId: 'c1' }],
      publishedAt: new Date().toISOString(),
    };
    await assertSucceeds(setDoc(doc(dbA, 'published_menus', 'shop-a'), validUpdatePayload));

    // A tries to tamper ownerId -> fails
    const tamperOwnerPayload = {
      ...validUpdatePayload,
      ownerId: 'user_b',
    };
    await assertFails(setDoc(doc(dbA, 'published_menus', 'shop-a'), tamperOwnerPayload));

    // A tries to tamper shopId -> fails
    const tamperShopIdPayload = {
      ...validUpdatePayload,
      shopId: 'shop-b',
    };
    await assertFails(setDoc(doc(dbA, 'published_menus', 'shop-a'), tamperShopIdPayload));

    // A tries to tamper shop.id -> fails
    const tamperShopNestedIdPayload = {
      ...validUpdatePayload,
      shop: { id: 'shop-b', name: 'Mộc Bếp & Cafe' },
    };
    await assertFails(setDoc(doc(dbA, 'published_menus', 'shop-a'), tamperShopNestedIdPayload));
  });

  test('5. B update/delete bị deny; A delete đúng policy thành công', async () => {
    const userAContext = testEnv.authenticatedContext('user_a');
    const userBContext = testEnv.authenticatedContext('user_b');
    const dbA = userAContext.firestore();
    const dbB = userBContext.firestore();

    // Setup initial published menu by A
    await setDoc(doc(dbA, 'published_menus', 'shop-a'), {
      shopId: 'shop-a',
      ownerId: 'user_a',
      shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    });

    // B attempts update -> fails
    await assertFails(
      updateDoc(doc(dbB, 'published_menus', 'shop-a'), {
        publishedAt: new Date().toISOString(),
      })
    );

    // B attempts delete -> fails
    await assertFails(deleteDoc(doc(dbB, 'published_menus', 'shop-a')));

    // A deletes -> succeeds
    await assertSucceeds(deleteDoc(doc(dbA, 'published_menus', 'shop-a')));
  });

  test('6. Fixture sai lệch (public.ownerId=B nhưng shops.ownerId=A): B không thể update/delete, A xử lý bằng cách xóa và xuất bản lại', async () => {
    // Setup corrupted fixture via admin context: public.ownerId=user_b but shops.ownerId=user_a
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'published_menus', 'shop-a'), {
        shopId: 'shop-a',
        ownerId: 'user_b',
        shop: { id: 'shop-a', name: 'B chiếm đoạt' },
        categories: [],
        items: [],
        publishedAt: new Date().toISOString(),
      });
    });

    const userAContext = testEnv.authenticatedContext('user_a');
    const userBContext = testEnv.authenticatedContext('user_b');
    const dbA = userAContext.firestore();
    const dbB = userBContext.firestore();

    // B is NOT shop owner of shops/shop-a -> B cannot update or delete
    await assertFails(
      updateDoc(doc(dbB, 'published_menus', 'shop-a'), {
        publishedAt: new Date().toISOString(),
      })
    );
    await assertFails(deleteDoc(doc(dbB, 'published_menus', 'shop-a')));

    // A cannot directly update because existing().ownerId != user_a (ownerId immutability preserved)
    await assertFails(
      setDoc(doc(dbA, 'published_menus', 'shop-a'), {
        shopId: 'shop-a',
        ownerId: 'user_a',
        shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
        categories: [],
        items: [],
        publishedAt: new Date().toISOString(),
      })
    );

    // Remediation for A without loosening rules: A deletes the hijacked/corrupted menu document
    await assertSucceeds(deleteDoc(doc(dbA, 'published_menus', 'shop-a')));

    // After cleanup, A republishes freshly with ownerId=user_a
    await assertSucceeds(
      setDoc(doc(dbA, 'published_menus', 'shop-a'), {
        shopId: 'shop-a',
        ownerId: 'user_a',
        shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
        categories: [],
        items: [],
        publishedAt: new Date().toISOString(),
      })
    );
  });

  test('7. Guest get published menu hợp lệ thành công, list published_menus và read shops bị deny', async () => {
    const userAContext = testEnv.authenticatedContext('user_a');
    const dbA = userAContext.firestore();

    // Publish menu for shop-a
    await setDoc(doc(dbA, 'published_menus', 'shop-a'), {
      shopId: 'shop-a',
      ownerId: 'user_a',
      shop: { id: 'shop-a', name: 'Mộc Bếp & Cafe' },
      categories: [],
      items: [],
      publishedAt: new Date().toISOString(),
    });

    const guestContext = testEnv.unauthenticatedContext();
    const guestDb = guestContext.firestore();

    // Guest get specific published menu by ID -> succeeds
    const snapshot = await assertSucceeds(getDoc(doc(guestDb, 'published_menus', 'shop-a')));
    expect(snapshot.exists()).toBe(true);

    // Guest list all published menus -> fails
    await assertFails(getDocs(collection(guestDb, 'published_menus')));

    // Guest get shops/shop-a -> fails
    await assertFails(getDoc(doc(guestDb, 'shops', 'shop-a')));

    // Guest list shops -> fails
    await assertFails(getDocs(collection(guestDb, 'shops')));
  });

  test('8. Query shops theo ownerId của chính user vẫn hoạt động như trước', async () => {
    const userAContext = testEnv.authenticatedContext('user_a');
    const userBContext = testEnv.authenticatedContext('user_b');
    const dbA = userAContext.firestore();
    const dbB = userBContext.firestore();

    // A queries their own shops -> succeeds
    const qA = query(collection(dbA, 'shops'), where('ownerId', '==', 'user_a'));
    const snapA = await assertSucceeds(getDocs(qA));
    expect(snapA.docs.length).toBe(1);
    expect(snapA.docs[0].id).toBe('shop-a');

    // B queries A's shops -> fails
    const qMalicious = query(collection(dbB, 'shops'), where('ownerId', '==', 'user_a'));
    await assertFails(getDocs(qMalicious));
  });
});
