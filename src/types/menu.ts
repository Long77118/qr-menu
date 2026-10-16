export type MenuItemStatus = 'available' | 'out_of_stock' | 'hidden';
export type PricingMode = 'single' | 'multiple';

/** Only the matching original URL may use these resized variants. */
export interface MenuImageSources {
  original: string;
  thumbnail: string;
  card: string;
  detail: string;
}

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
  imageSources?: MenuImageSources;
  status: MenuItemStatus;
  order: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
  imageUrl?: string;
  imageSources?: MenuImageSources;
}

export interface HeaderBackgroundConfig {
  imageUrl?: string; // Custom background photo data URL
  imageSources?: MenuImageSources;
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
  countryCode?: string; // ISO 3166-1 alpha-2; absent means owner has not chosen a country.
  discoveryImageUrl?: string; // Optimized card image, separate from the full menu header.
  phone?: string;
  logoUrl?: string;
  coverUrl?: string;
  logoSources?: MenuImageSources;
  coverSources?: MenuImageSources;
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
