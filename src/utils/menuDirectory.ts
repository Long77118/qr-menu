import { ShopSettings } from '../types/menu';
import { validCountry } from './countries';

export function directoryImage(shop: ShopSettings) {
  return shop.discoveryImageUrl || shop.coverUrl || shop.headerBackground?.imageUrl || shop.logoUrl || '';
}

/** Only the published public summary belongs in the discovery collection. */
export function menuDirectoryEntry(shop: ShopSettings, publishedAt: string, active = true) {
  if (!validCountry(shop.countryCode)) throw new Error('Quốc gia không hợp lệ. Hãy chọn lại trong thông tin quán.');
  return { shopId: shop.id, name: shop.name, tagline: shop.tagline || '',
    address: shop.address || '', countryCode: shop.countryCode || '', imageUrl: directoryImage(shop), publishedAt, active };
}

export function matchesDirectorySearch(entry: { name: string; address: string }, search: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  return normalize(`${entry.name} ${entry.address}`).includes(normalize(search.trim()));
}

export function addressMapUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
