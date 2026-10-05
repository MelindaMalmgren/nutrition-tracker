import type { LookupFood } from '@/types';

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'NutritionTracker/1.0 (https://github.com/MelindaMalmgren/nutrition-tracker)';

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function num(nutriments: OffProduct['nutriments'], key: string): number | null {
  const value = Number(nutriments?.[key]);
  return nutriments?.[key] === undefined || nutriments?.[key] === '' || !Number.isFinite(value) ? null : value;
}

/** Label serving in grams or ml: the numeric field if present, else pulled from text like "2 tbsp (30 g)". */
function parseServing(product: OffProduct): { size: number; unit: 'g' | 'ml' } | null {
  const text = product.serving_size ?? '';
  const quantity = Number(product.serving_quantity);
  if (Number.isFinite(quantity) && quantity > 0) {
    return { size: quantity, unit: /\d\s*ml\b/i.test(text) ? 'ml' : 'g' };
  }
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  if (!match) return null;
  const size = Number(match[1].replace(',', '.'));
  return size > 0 ? { size, unit: match[2].toLowerCase() as 'g' | 'ml' } : null;
}

/** Returns null when the barcode is unknown or the product has no usable nutrition data. */
export async function lookupOffBarcode(barcode: string, signal?: AbortSignal): Promise<LookupFood | null> {
  const params = new URLSearchParams({
    fields: 'code,product_name,brands,serving_size,serving_quantity,nutriments',
  });
  const res = await fetch(`${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status}).`);

  const data = (await res.json()) as { status?: number; product?: OffProduct };
  const product = data.product;
  if (data.status !== 1 || !product) return null;

  const n = product.nutriments;
  const kcalPer100 = num(n, 'energy-kcal_100g') ?? (num(n, 'energy_100g') !== null ? num(n, 'energy_100g')! / 4.184 : null);
  if (kcalPer100 === null) return null;

  const label = product.serving_size?.trim() || null;
  const serving = parseServing(product);
  const serving_size = serving?.size ?? 100;
  const serving_unit = serving?.unit ?? 'g';
  const factor = serving_size / 100;

  const get = (key: string, multiplier = 1) => round2((num(n, key) ?? 0) * multiplier * factor);
  const brand = product.brands?.split(',')[0]?.trim() || null;

  return {
    source: 'off',
    external_id: product.code ?? barcode,
    barcode: product.code ?? barcode,
    name: product.product_name?.trim() || 'Unnamed product',
    brand,
    serving_size,
    serving_unit,
    serving_label: label,
    calories: round2(kcalPer100 * factor),
    protein: get('proteins_100g'),
    carbs: get('carbohydrates_100g'),
    fat: get('fat_100g'),
    fiber: get('fiber_100g'),
    sugar: get('sugars_100g'),
    // OFF reports these in grams per 100 g; we store mg (and mcg for vitamin A).
    sodium: get('sodium_100g', 1000),
    sat_fat: get('saturated-fat_100g'),
    poly_fat: get('polyunsaturated-fat_100g'),
    mono_fat: get('monounsaturated-fat_100g'),
    trans_fat: get('trans-fat_100g'),
    cholesterol: get('cholesterol_100g', 1000),
    potassium: get('potassium_100g', 1000),
    vitamin_a: get('vitamin-a_100g', 1_000_000),
    vitamin_c: get('vitamin-c_100g', 1000),
    calcium: get('calcium_100g', 1000),
    iron: get('iron_100g', 1000),
  };
}
