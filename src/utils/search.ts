/**
 * Vietnamese search utility that normalizes accents, diacritics and special characters (đ/d)
 */

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (match) => (match === 'Đ' ? 'd' : 'd'))
    .toLowerCase()
    .trim();
}

export function matchesVietnamese(targetText: string, searchTerm: string): boolean {
  if (!searchTerm) return true;
  if (!targetText) return false;
  const normalizedTarget = normalizeVietnamese(targetText);
  const normalizedSearch = normalizeVietnamese(searchTerm);
  return normalizedTarget.includes(normalizedSearch);
}
