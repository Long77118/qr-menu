/**
 * Vietnamese currency and text formatters
 */

export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0đ';
  }
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, amount)) + 'đ';
}

export function parseVND(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, value);
  const cleaned = value.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatThousands(value: number | string): string {
  const num = typeof value === 'number' ? value : parseVND(value);
  if (!num) return '';
  return new Intl.NumberFormat('vi-VN').format(num);
}
