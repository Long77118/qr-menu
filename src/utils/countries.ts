/** ISO 3166-1 alpha-2 country/territory codes; labels come from browser locale data. */
import countryCodes from '../data/countryCodes.json';
export const COUNTRY_CODES: string[] = countryCodes;
const names = new Intl.DisplayNames(['vi'], { type: 'region' });
export function countryName(code?: string) {
  return code && COUNTRY_CODES.includes(code) ? names.of(code) || code : 'Chưa cập nhật quốc gia';
}
export const COUNTRY_OPTIONS = COUNTRY_CODES.map(code => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
export function validCountry(code?: string) { return !code || COUNTRY_CODES.includes(code); }
