import type { SQLiteDatabase } from 'expo-sqlite';

import { findFoodByBarcode } from '@/db/foods';
import { lookupOffBarcode } from '@/services/openFoodFacts';
import { lookupUsdaBarcode, USDA_KEY_MISSING } from '@/services/usda';
import { parsePortions } from '@/lib/serving-options';
import type { Food, LookupFood } from '@/types';

/** Converts a saved food that came from an external database back into a lookup result. */
export function savedToLookup(food: Food): LookupFood | null {
  if ((food.source !== 'usda' && food.source !== 'off') || !food.external_id) return null;
  return { ...food, source: food.source, external_id: food.external_id, portions: parsePortions(food.portions) };
}

/** Saved foods first (works offline), then Open Food Facts, then USDA. Returns null if nobody knows the code. */
export async function lookupBarcode(
  db: SQLiteDatabase,
  barcode: string,
  signal?: AbortSignal,
): Promise<LookupFood | null> {
  if (!/[1-9]/.test(barcode)) return null;

  const saved = await findFoodByBarcode(db, barcode);
  const savedLookup = saved && savedToLookup(saved);
  if (savedLookup) return savedLookup;

  let offError: unknown = null;
  try {
    const off = await lookupOffBarcode(barcode, signal);
    if (off) return off;
  } catch (e) {
    if (signal?.aborted) throw e;
    offError = e;
  }

  try {
    const usda = await lookupUsdaBarcode(barcode, signal);
    if (usda) return usda;
  } catch (e) {
    const keyMissing = e instanceof Error && e.message === USDA_KEY_MISSING;
    if (!keyMissing || offError) throw offError ?? e;
  }

  if (offError) throw offError;
  return null;
}
