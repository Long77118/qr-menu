import React from 'react';
import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiscoveryCard } from '../src/components/DiscoveryCard';
const entry = { shopId: 'sample', name: 'Quán thử', tagline: '', address: '12 A & B', active: true, publishedAt: '2026-10-13', countryCode: 'VN', imageUrl: 'https://example.test/shop.jpg' };
test('Discovery photo loads lazily and country/address links are accessible', () => {
  const html = renderToStaticMarkup(<DiscoveryCard entry={entry} />);
  expect(html).toContain('loading="lazy"'); expect(html).toContain('decoding="async"');
  expect(html).toContain('Ảnh đại diện Quán thử'); expect(html).toContain('Việt Nam');
  expect(html).toContain('query=12%20A%20%26%20B');
});
test('Missing/unsafe photo and absent address render truthful fallback', () => {
  const html = renderToStaticMarkup(<DiscoveryCard entry={{ ...entry, imageUrl: 'javascript:alert(1)', countryCode: '', address: '' }} />);
  expect(html).toContain('Chưa có ảnh quán'); expect(html).toContain('Chưa cập nhật quốc gia');
  expect(html).not.toContain('<img'); expect(html).not.toContain('Xem bản đồ');
});
