import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { readFileSync } from 'fs';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { createOnlineStorageService } from '../src/services/onlineStorageCore';
import { StorageService } from '../src/services/storage';
import { GuestMenuView } from '../src/components/GuestMenuView';
import { ShopData, MenuItem } from '../src/types/menu';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

const shopId = 'phase3-shop';
function fixture(): ShopData {
  const item = (id: string, status: MenuItem['status'], categoryId = 'cat'): MenuItem => ({
    id, name: id, description: `${id}-description`, imageUrl: `https://example.test/${id}.jpg`,
    categoryId, status, pricingMode: 'single', price: 20000, options: [], order: 1,
  });
  return {
    shop: { id: shopId, name: 'Phase 3 Cafe', themeColor: '#FF5A36' },
    categories: [{ id: 'cat', name: 'Cà phê', order: 1 }, { id: 'secret-cat', name: 'Nhóm riêng', order: 2 }],
    // Hidden first reproduces the original hero/category image leak.
    items: [item('SECRET-DISH', 'hidden'), item('SECRET-ONLY', 'hidden', 'secret-cat'),
      item('VISIBLE-DISH', 'available'), item('SOLD-OUT-DISH', 'out_of_stock')],
  };
}

describe('Đợt 3: guest rendering and demo publishing', () => {
  beforeEach(() => localStorage.clear());

  test('Guest/preview không render tên, mô tả hoặc ảnh hidden từ payload cũ', () => {
    for (const isPreview of [false, true]) {
      const html = renderToStaticMarkup(<GuestMenuView shopData={fixture()} isPreview={isPreview} />);
      expect(html).not.toContain('SECRET-DISH');
      expect(html).not.toContain('SECRET-ONLY');
      expect(html).not.toContain('Nhóm riêng');
      expect(html).toContain('VISIBLE-DISH');
      expect(html).toContain('2 món');
      expect(html).toContain('Hôm nay, bạn chọn');
      expect(html).toContain('https://example.test/VISIBLE-DISH.jpg');
    }
  });

  test('Owner direct edit giữ món hidden và nhóm chỉ chứa món hidden', () => {
    const html = renderToStaticMarkup(<GuestMenuView shopData={fixture()} isDirectEditMode />);
    expect(html).toContain('SECRET-DISH');
    expect(html).toContain('SECRET-ONLY');
    expect(html).toContain('Nhóm riêng');
  });

  test('Demo publish lọc hidden, giữ hết hàng và không sửa draft', () => {
    const draft = fixture();
    const before = structuredClone(draft);
    expect(StorageService.saveDraft(shopId, draft).success).toBe(true);
    expect(StorageService.publishShop(shopId).success).toBe(true);
    expect(StorageService.getPublishedShop(shopId)!.items.map((i) => i.id))
      .toEqual(['VISIBLE-DISH', 'SOLD-OUT-DISH']);
    expect(StorageService.getShop(shopId)!.draft).toEqual(before);
    expect(draft).toEqual(before);
  });

  test('Demo publish toàn hidden bị chặn và giữ bản công khai trước', () => {
    StorageService.saveDraft(shopId, fixture());
    StorageService.publishShop(shopId);
    const previous = StorageService.getPublishedShop(shopId);
    const draft = fixture();
    draft.items = draft.items.filter((i) => i.status === 'hidden');
    StorageService.saveDraft(shopId, draft);
    expect(StorageService.publishShop(shopId).success).toBe(false);
    expect(StorageService.getPublishedShop(shopId)).toEqual(previous);
    expect(StorageService.getShop(shopId)!.draft.items).toHaveLength(2);
  });
});

describe('Đợt 3: cloud publishing on emulator', () => {
  let env: RulesTestEnvironment;
  let service: ReturnType<typeof createOnlineStorageService>;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-qr-menu-public-test',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
    });
  });
  beforeEach(async () => {
    localStorage.clear();
    await env.clearFirestore();
    service = createOnlineStorageService({
      db: env.authenticatedContext('owner').firestore() as unknown as Firestore,
      auth: { currentUser: { uid: 'owner' } },
    });
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'shops', shopId), {
        id: shopId, ownerId: 'owner', draft: fixture(), hasPublished: true,
      });
      // Legacy public payload must be overwritten with a filtered snapshot on republish.
      await setDoc(doc(context.firestore(), 'published_menus', shopId), {
        ...fixture(), shopId, ownerId: 'owner', publishedAt: 'previous',
      });
    });
  });
  afterAll(async () => { if (env) await env.cleanup(); });

  test('Republish loại hidden khỏi document public, giữ private draft và local mirror đúng', async () => {
    expect((await service.saveDraft(shopId, fixture())).success).toBe(true);
    expect((await service.publishShop(shopId)).success).toBe(true);
    const guest = env.unauthenticatedContext().firestore();
    const published = (await getDoc(doc(guest, 'published_menus', shopId))).data()!;
    expect(published.items.map((i: MenuItem) => i.id)).toEqual(['VISIBLE-DISH', 'SOLD-OUT-DISH']);
    expect(JSON.stringify(published)).not.toContain('SECRET-DISH');
    expect(JSON.stringify(published)).not.toContain('SECRET-ONLY');
    const owner = env.authenticatedContext('owner').firestore();
    const privateDraft = (await getDoc(doc(owner, 'shops', shopId))).data()!.draft;
    expect(privateDraft).toEqual(fixture());
    expect(StorageService.getShop(shopId)!.draft).toEqual(fixture());
    expect(StorageService.getPublishedShop(shopId)!.items).toEqual(published.items);
  });

  test('Cloud publish toàn hidden bị chặn, không thay public document', async () => {
    const draft = fixture();
    draft.items = draft.items.filter((i) => i.status === 'hidden');
    expect((await service.saveDraft(shopId, draft)).success).toBe(true);
    expect((await service.publishShop(shopId)).success).toBe(false);
    const guest = env.unauthenticatedContext().firestore();
    expect((await getDoc(doc(guest, 'published_menus', shopId))).data()!.publishedAt).toBe('previous');
  });
});
