import { MenuItem } from '../types/menu';

/** Shared visibility boundary for publishing and customer-facing views. */
export function getPublicMenuItems(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => item.status !== 'hidden');
}
