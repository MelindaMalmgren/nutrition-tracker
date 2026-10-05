import { USDA_KEY_MISSING } from '@/services/usda';

/** A user-facing message for a failed food search or barcode lookup. */
export function describeError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  if (message === USDA_KEY_MISSING) {
    return 'No USDA API key found. Add EXPO_PUBLIC_USDA_API_KEY to .env, then restart Expo with: npx expo start -c';
  }
  if (message.startsWith('USDA') || message.startsWith('Open Food Facts')) return message;
  return 'Could not reach the food database. Check your connection and try again.';
}
