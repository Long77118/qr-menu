import React from 'react';
import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from '../src/components/LandingPage';
import { StorageService } from '../src/services/storage';

test('Free landing exposes real signup/login and discovery, without sample shop links', () => {
  const html = renderToStaticMarkup(<LandingPage onStartCreate={() => {}} onLogin={() => {}} />);
  expect(html).toContain('Tạo menu miễn phí');
  expect(html).toContain('Đăng nhập');
  expect(html).toContain('#/discover');
  expect(html).not.toMatch(/demo|moc-bep-cafe|menu mẫu|quán mẫu/i);
});

test('Fresh browser has no seeded shop; legacy local-only account cannot restore a session', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }});
  try {
    expect(StorageService.getAllShops()).toEqual({});
    expect(StorageService.getAllUsers()).toEqual([]);
    values.set('qr_menu_session_v1', JSON.stringify({ id: 'user-demo-01', shopId: 'moc-bep-cafe' }));
    expect(StorageService.getCurrentUser()).toBeNull();
    values.set('qr_menu_session_v1', JSON.stringify({ id: 'real-owner', shopId: 'real-shop', isFirebaseUser: true }));
    expect(StorageService.getCurrentUser()?.id).toBe('real-owner');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as any).localStorage;
  }
});
