import type { LookupFood, ServingOption } from '@/types';

type UsdaNutrient = { nutrientNumber?: string; value?: number };
type UsdaSearchFood = {
  fdcId: number;
  description: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
};

type UsdaPortion = {
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
};

const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DETAIL_URL = 'https://api.nal.usda.gov/fdc/v1/food';

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

function normalize(food: UsdaSearchFood): LookupFood {
  const nutrients = food.foodNutrients ?? [];

  // Search results report nutrients per 100 g; scale to the label serving when the food has a gram/ml one.
  const rawUnit = food.servingSizeUnit?.toLowerCase();
  const unit = rawUnit === 'g' || rawUnit === 'grm' ? 'g' : rawUnit === 'ml' || rawUnit === 'mlt' ? 'ml' : null;
  const hasServing = !!food.servingSize && food.servingSize > 0 && unit !== null;
  const serving_size = hasServing ? (food.servingSize as number) : 100;
  const serving_unit = hasServing ? unit : 'g';
  const factor = serving_size / 100;

  const get = (numbers: readonly string[]) => round2(nutrientValue(nutrients, numbers) * factor);

  // e.g. "3/4 cup (20g)"; add the weight when the household text doesn't already state it.
  const household = tidyCase(food.householdServingFullText)?.replace(/\bonz\b/i, 'oz');
  const serving_label =
    hasServing && household
      ? /\d\s*(g|ml)\b/i.test(household)
        ? household
        : `${household} (${serving_size} ${serving_unit})`
      : null;

  return {
    source: 'usda',
    external_id: String(food.fdcId),
    barcode: food.gtinUpc?.trim() || null,
    name: tidyCase(food.description) ?? 'Unnamed food',
    brand: tidyCase(food.brandName) ?? tidyCase(food.brandOwner),
    serving_size,
    serving_unit,
    serving_label,
    calories: get(NUTRIENT_NUMBERS.calories),
    protein: get(NUTRIENT_NUMBERS.protein),
    carbs: get(NUTRIENT_NUMBERS.carbs),
    fat: get(NUTRIENT_NUMBERS.fat),
    fiber: get(NUTRIENT_NUMBERS.fiber),
    sugar: get(NUTRIENT_NUMBERS.sugar),
    sodium: get(NUTRIENT_NUMBERS.sodium),
  };
}

async function fetchSearch(
  query: string,
  dataType: string,
  pageSize: number,
  signal?: AbortSignal,
): Promise<UsdaSearchFood[]> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) throw new Error(USDA_KEY_MISSING);

  const params = new URLSearchParams({ api_key: apiKey, query, pageSize: String(pageSize), dataType });
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal });

  if (res.status === 403) throw new Error('USDA rejected the API key. Check EXPO_PUBLIC_USDA_API_KEY in .env.');
  if (res.status === 429) throw new Error('USDA rate limit reached. Try again in a bit.');
  if (!res.ok) throw new Error(`USDA search failed (${res.status}).`);

  const data = (await res.json()) as { foods?: UsdaSearchFood[] };
  return data.foods ?? [];
}

export async function searchUsda(query: string, signal?: AbortSignal): Promise<LookupFood[]> {
  const foods = await fetchSearch(query, 'Foundation,SR Legacy,Branded', 25, signal);
  return foods.map(normalize);
}

/**
 * Household measures (e.g. "1 cup, sliced (150 g)") for non-branded foods. They are not in search results,
 * only in the per-food detail response, so fetch them when a food is selected. Each is normalized to one unit.
 */
export async function fetchUsdaPortions(fdcId: string, signal?: AbortSignal): Promise<ServingOption[]> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) throw new Error(USDA_KEY_MISSING);

  const res = await fetch(`${DETAIL_URL}/${encodeURIComponent(fdcId)}?${new URLSearchParams({ api_key: apiKey })}`, {
    signal,
  });
  if (!res.ok) throw new Error(`USDA portion lookup failed (${res.status}).`);

  const data = (await res.json()) as { foodPortions?: UsdaPortion[] };
  const seen = new Set<string>();
  const options: ServingOption[] = [];

  for (const portion of data.foodPortions ?? []) {
    const grams = portion.gramWeight;
    if (!grams || grams <= 0) continue;

    const unitName = portion.measureUnit?.name?.trim();
    const measure = unitName && !['undetermined', 'racc'].includes(unitName.toLowerCase()) ? unitName : null;
    const detail = portion.modifier?.trim() || portion.portionDescription?.trim();
    const text = [measure, detail].filter(Boolean).join(', ');
    if (!text) continue;

    const size = round2(grams / (portion.amount && portion.amount > 0 ? portion.amount : 1));
    const label = `${/^\d/.test(text) ? '' : '1 '}${text} (${size} g)`;
    if (seen.has(label)) continue;
    seen.add(label);
    options.push({ label, size, unit: 'g' });
  }
  return options.slice(0, 15);
}

const stripLeadingZeros =(code: string) => code.replace(/^0+/, '');

/**
 * Finds a branded product by UPC/EAN. USDA's search only matches the digits as stored, and a US UPC-A (12 digits)
 * can be scanned as EAN-13 (leading 0), so try both forms and compare ignoring leading zeros.
 */
export async function lookupUsdaBarcode(barcode: string, signal?: AbortSignal): Promise<LookupFood | null> {
  const wanted = stripLeadingZeros(barcode);
  if (!wanted) return null;
  const candidates = [barcode];
  if (barcode.length === 13 && barcode.startsWith('0')) candidates.push(barcode.slice(1));
  if (barcode.length === 12) candidates.push(`0${barcode}`);

  for (const candidate of candidates) {
    const foods = await fetchSearch(candidate, 'Branded', 10, signal);
    const match = foods.find((f) => f.gtinUpc && stripLeadingZeros(f.gtinUpc) === wanted);
    if (match) return normalize(match);
  }
  return null;
}
