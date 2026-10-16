import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect } from 'bun:test';
import { OwnerDashboard } from '../src/components/OwnerDashboard';
import { ShopData } from '../src/types/menu';

test('Dashboard hiển thị đang xử lý và khóa nút publish khi autosave đang chạy', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { location: { origin: 'http://localhost', pathname: '/' } },
  });
  try {
  const data: ShopData = {
    shop: { id: 'controls', name: 'Quán', themeColor: '#FF5A36' }, categories: [], items: [],
  };
  const html = renderToStaticMarkup(<OwnerDashboard
    user={{ id: 'owner', shopId: 'controls', displayName: 'Chủ', email: 'test@example.test' }}
    shopData={data} isPublished={false} isSyncing
    onUpdateDraft={async () => ({ success: true, storage: 'cloud' })}
    onPublish={async () => ({ success: true, storage: 'cloud' })}
    onLogout={() => {}} onOpenGuestUrl={() => {}} showToast={() => {}}
  />);
  expect(html).toContain('Đang lưu');
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const publishButtons = buttons.filter((button) => button.includes('Xuất bản'));
  expect(publishButtons.length).toBe(1);
  expect(publishButtons.every((button) => /<button\b[^>]*\bdisabled=/.test(button))).toBe(true);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
