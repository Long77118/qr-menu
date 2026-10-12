/**
 * Color Tokens & Category Rhythm System for QR Menu
 * Vibrant, youthful food poster theme
 */

export const THEME_COLORS = {
  // 1. Primary brand colors
  orange: '#FF5A36', // Cam rực — màu thương hiệu mặc định & điểm nhấn chính
  purple: '#7447E8', // Tím — màu phụ cho mảng trang trí, card và chi tiết
  lemon: '#E5F76A',  // Vàng chanh — ô giá & huy hiệu nổi bật
  pink: '#FF83B5',   // Hồng — màu phụ tạo nhịp cho card/nền hình học
  
  // 2. Surface & typography
  ivory: '#FFF9F3',    // Trắng ngà — nền trang & khoảng nghỉ
  darkText: '#241E35', // Tím đen — chữ chính trên nền sáng
  mutedText: '#6E6779',// Chữ phụ / thứ cấp
  surface: '#FFFFFF',  // Bề mặt trắng tinh khiết
  border: '#EFE5D9',   // Viền phân tách nhẹ nhàng
  
  // 3. Functional states
  outOfStock: '#FF5A36', // Nhãn tạm hết
} as const;

export type CategoryThemeKey = 'orange' | 'pink' | 'purple' | 'lemon';

export interface CategoryCardTheme {
  key: CategoryThemeKey;
  bgHex: string;
  shape1Hex: string;
  shape2Hex: string;
  accentHex: string;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Deterministic hash for string IDs (category IDs, item IDs)
 * Ensures 100% stability across renders, filters, reordering, and searches
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get category theme with distinct color rhythm:
 * - Món ăn: Nền cam (#FF5A36) + hình hồng (#FF83B5)
 * - Món ăn thêm: Nền hồng (#FF83B5) + hình tím (#7447E8)
 * - Cà phê: Nền tím (#7447E8) + điểm cam/vàng chanh (#E5F76A)
 * - Trà & nước: Nền vàng chanh (#E5F76A) + hình tím/hồng
 * - Custom categories: Hash-based deterministic assignment
 */
export function getCategoryCardTheme(categoryId: string, categoryName?: string): CategoryCardTheme {
  const normName = (categoryName || '').toLowerCase().trim();
  let key: CategoryThemeKey = 'orange';

  if (categoryId === 'cat-01' || (normName.includes('món ăn') && !normName.includes('thêm'))) {
    key = 'orange';
  } else if (
    categoryId === 'cat-02' ||
    normName.includes('món ăn thêm') ||
    normName.includes('ăn kèm') ||
    normName.includes('topping')
  ) {
    key = 'pink';
  } else if (
    categoryId === 'cat-03' ||
    normName.includes('cà phê') ||
    normName.includes('cafe') ||
    normName.includes('coffee')
  ) {
    key = 'purple';
  } else if (
    categoryId === 'cat-04' ||
    normName.includes('trà') ||
    normName.includes('nước') ||
    normName.includes('uống') ||
    normName.includes('sinh tố') ||
    normName.includes('juice')
  ) {
    key = 'lemon';
  } else {
    // Stable hash mapping for owner's custom categories
    const THEME_KEYS: CategoryThemeKey[] = ['orange', 'pink', 'purple', 'lemon'];
    key = THEME_KEYS[hashString(categoryId) % 4];
  }

  switch (key) {
    case 'orange':
      return {
        key: 'orange',
        bgHex: '#FF5A36',
        shape1Hex: '#FF83B5',
        shape2Hex: '#FFEAD4',
        accentHex: '#E5F76A',
        titleColor: '#241E35',
        descColor: '#6E6779',
        badgeBg: '#E5F76A',
        badgeText: '#241E35',
      };
    case 'pink':
      return {
        key: 'pink',
        bgHex: '#FF83B5',
        shape1Hex: '#7447E8',
        shape2Hex: '#FFF2F7',
        accentHex: '#E5F76A',
        titleColor: '#241E35',
        descColor: '#6E6779',
        badgeBg: '#E5F76A',
        badgeText: '#241E35',
      };
    case 'purple':
      return {
        key: 'purple',
        bgHex: '#7447E8',
        shape1Hex: '#FF5A36',
        shape2Hex: '#E5F76A',
        accentHex: '#E5F76A',
        titleColor: '#241E35',
        descColor: '#6E6779',
        badgeBg: '#E5F76A',
        badgeText: '#241E35',
      };
    case 'lemon':
      return {
        key: 'lemon',
        bgHex: '#E5F76A',
        shape1Hex: '#7447E8',
        shape2Hex: '#FF83B5',
        accentHex: '#FF5A36',
        titleColor: '#241E35',
        descColor: '#6E6779',
        badgeBg: '#E5F76A',
        badgeText: '#241E35',
      };
  }
}
