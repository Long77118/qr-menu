import React from 'react';
import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminDashboard } from '../src/components/AdminDashboard';
import type { createAdminStorageService } from '../src/services/adminStorageCore';

test('Trang admin có tìm kiếm đúng phạm vi và không hiển thị số liệu giả trước khi tải', () => {
  const service = {} as ReturnType<typeof createAdminStorageService>;
  const html = renderToStaticMarkup(<AdminDashboard service={service} email="admin@example.test" onLogout={async () => {}} />);
  expect(html).toContain('Điều hành nền tảng');
  expect(html).toContain('Hồ sơ người dùng');
  expect(html).toContain('Tìm trong danh sách đã tải');
  expect(html).toContain('Mở quán bằng mã chính xác');
  expect(html).toContain('Nhật ký');
  expect(html).toContain('—');
});
