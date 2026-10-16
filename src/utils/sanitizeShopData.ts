import { ShopData } from '../types/menu';

/**
 * Checks whether a value is a plain object (excluding null, arrays, Date, Firestore FieldValues/Sentinels).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  // Preserve Firestore Sentinels (serverTimestamp, deleteField, etc.) or Timestamps
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deeply sanitizes a value by omitting `undefined` properties from plain objects.
 * 
 * Rules:
 * 1. Does not mutate the input object.
 * 2. Preserves valid falsy primitives: 0, false, empty string "", and null.
 * 3. Does not convert undefined to null.
 * 4. Array policy:
 *    - Rejects (throws an error) if any array element itself is undefined, ensuring
 *      items are never silently dropped or reordered.
 *    - Recursively cleans properties inside each array element.
 * 5. Preserves non-plain objects (such as Firestore FieldValue sentinels or Timestamps) as-is.
 */
export function sanitizePlainData<T>(value: T): T {
  if (value === undefined) {
    return undefined as unknown as T;
  }

  // Primitives: number (including 0), boolean (including false), string (including ""), null
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Array handling with strict policy
  if (Array.isArray(value)) {
    return Array.from(value, (item, index) => {
      if (item === undefined) {
        throw new Error(
          `Array item at index ${index} is undefined. Undefined array elements are strictly disallowed to prevent silent data corruption or reordering.`
        );
      }
      return sanitizePlainData(item);
    }) as unknown as T;
  }

  // Plain object handling
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        const cleaned = sanitizePlainData(val);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
    }
    return result as T;
  }

  // Non-plain objects (e.g. FieldValue, Timestamp) are returned as-is
  return value;
}

/**
 * Sanitizes ShopData at the boundary before writing to Firestore.
 * 
 * - Ensures shop, categories, and items are present and free of `undefined` fields.
 * - Leaves `publishedAt` unset if not already present or undefined.
 * - Guarantees the original `draftData` is never mutated.
 */
export function sanitizeShopData(draftData: ShopData): ShopData {
  if (!draftData || typeof draftData !== 'object') {
    throw new Error('Invalid draft data: draftData must be a non-null object');
  }

  const cleaned = sanitizePlainData(draftData);

  // Validate critical structural fields
  if (!cleaned.shop || typeof cleaned.shop !== 'object') {
    throw new Error('Invalid draft data: missing shop settings');
  }
  if (!Array.isArray(cleaned.categories)) {
    throw new Error('Invalid draft data: categories must be an array');
  }
  if (!Array.isArray(cleaned.items)) {
    throw new Error('Invalid draft data: items must be an array');
  }

  return cleaned;
}

