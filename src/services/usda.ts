import type { Food } from '@/types';

export type UsdaFood = Pick<
  Food,
  'name' | 'brand' | 'serving_size' | 'serving_unit' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium'
> & { external_id: string };

type UsdaNutrient = { nutrientNumber?: string; value?: number };
type UsdaSearchFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
};

const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export const USDA_KEY_MISSING = 'USDA_KEY_MISSING';

// Nutrient numbers; 957/958 are Atwater energy values used when a food has no 208.
const NUTRIENT_NUMBERS = {
  calories: ['208', '957', '958'],
  protein: ['203'],
  carbs: ['205'],
  fat: ['204'],
  fiber: ['291'],
  sugar: ['269'],
  sodium: ['307'],
} as const;

function nutrientValue(nutrients: UsdaNutrient[], numbers: readonly string[]): number {
  for (const number of numbers) {
    const match = nutrients.find((n) => n.nutrientNumber?.split('.')[0] === number && typeof n.value === 'number');
    if (match) return match.value as number;
  }
  return 0;
}

// USDA branded names are often ALL CAPS.
function tidyCase(text: string | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function normalize(food: UsdaSearchFood): UsdaFood {
  const nutrients = food.foodNutrients ?? [];

  // Search results report nutrients per 100 g; scale to the label serving when the food has a gram/ml one.
  const unit = food.servingSizeUnit?.toLowerCase();
  const hasServing = !!food.servingSize && food.servingSize > 0 && (unit === 'g' || unit === 'ml');
  const serving_size = hasServing ? (food.servingSize as number) : 100;
  const serving_unit = hasServing ? (unit as string) : 'g';
  const factor = serving_size / 100;

  const get = (numbers: readonly string[]) => round2(nutrientValue(nutrients, numbers) * factor);

  return {
    external_id: String(food.fdcId),
    name: tidyCase(food.description) ?? 'Unnamed food',
    brand: tidyCase(food.brandName) ?? tidyCase(food.brandOwner),
    serving_size,
    serving_unit,
    calories: get(NUTRIENT_NUMBERS.calories),
    protein: get(NUTRIENT_NUMBERS.protein),
    carbs: get(NUTRIENT_NUMBERS.carbs),
    fat: get(NUTRIENT_NUMBERS.fat),
    fiber: get(NUTRIENT_NUMBERS.fiber),
    sugar: get(NUTRIENT_NUMBERS.sugar),
    sodium: get(NUTRIENT_NUMBERS.sodium),
  };
}

export async function searchUsda(query: string, signal?: AbortSignal): Promise<UsdaFood[]> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) throw new Error(USDA_KEY_MISSING);

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    pageSize: '25',
    dataType: 'Foundation,SR Legacy,Branded',
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal });

  if (res.status === 403) throw new Error('USDA rejected the API key. Check EXPO_PUBLIC_USDA_API_KEY in .env.');
  if (res.status === 429) throw new Error('USDA rate limit reached. Try again in a bit.');
  if (!res.ok) throw new Error(`USDA search failed (${res.status}).`);

  const data = (await res.json()) as { foods?: UsdaSearchFood[] };
  return (data.foods ?? []).map(normalize);
}
