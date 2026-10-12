export type MenuItemStatus = 'available' | 'out_of_stock' | 'hidden';
export type PricingMode = 'single' | 'multiple';

export interface PriceOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  pricingMode: PricingMode;
  price: number; // Used when pricingMode === 'single'
  options: PriceOption[]; // Used when pricingMode === 'multiple'
  description?: string;
  imageUrl?: string;
  status: MenuItemStatus;
  order: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
  imageUrl?: string;
}

export interface HeaderBackgroundConfig {
  imageUrl?: string; // Custom background photo data URL
  // Desktop positioning & zoom
  desktopPosition: { x: number; y: number }; // 0 to 100 percentage coordinates
  desktopZoom: number; // 1.0 to 2.5 zoom factor
  // Mobile positioning & zoom
  mobilePosition: { x: number; y: number }; // 0 to 100 percentage coordinates
  mobileZoom: number; // 1.0 to 2.5 zoom factor
  // Overlay config
  overlayType: 'light' | 'dark';
  overlayOpacity: number; // 0 to 80 percentage
  // Typography contrast mode
  textColorMode: 'auto' | 'light' | 'dark';
  // Toggle for showcase frames on the right
  showShowcaseFrames: boolean; // default true
}

export interface ShopSettings {
  id: string; // Permanent unique slug/id
  name: string;
  tagline?: string;
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  coverUrl?: string;
  themeColor: string; // Hex color code
  headerBackground?: HeaderBackgroundConfig;
}

export interface ShopData {
  shop: ShopSettings;
  categories: MenuCategory[];
  items: MenuItem[];
  publishedAt?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  shopId: string;
  isFirebaseUser?: boolean;
  photoUrl?: string;
}
