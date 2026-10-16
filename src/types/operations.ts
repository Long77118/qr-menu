import type { ShopData } from './menu';
export interface OperationResult {
  success: boolean;
  error?: string;
  storage?: 'cloud' | 'local';
  cacheWarning?: string;
  pending?: boolean;
  savedDraft?: ShopData;
  unchanged?: boolean;
}
