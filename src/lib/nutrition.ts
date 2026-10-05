import { NUTRIENT_KEYS, type Nutrition } from '@/types';

export function emptyNutrition(): Nutrition {
  return Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0])) as Nutrition;
}

/** Pieces for SQL that reads or writes every nutrient column, always in NUTRIENT_KEYS order. */
export const NUTRIENT_COLUMNS = NUTRIENT_KEYS.join(', ');
export const NUTRIENT_PLACEHOLDERS = NUTRIENT_KEYS.map(() => '?').join(', ');
export const NUTRIENT_ASSIGNMENTS = NUTRIENT_KEYS.map((key) => `${key} = ?`).join(', ');

/** The nutrient values in NUTRIENT_KEYS order (optionally scaled), to bind to the SQL above. */
export function nutrientValues(n: Nutrition, factor = 1): number[] {
  return NUTRIENT_KEYS.map((key) => n[key] * factor);
}

export function scaleNutrition(n: Nutrition, servings: number): Nutrition {
  const out = emptyNutrition();
  for (const key of NUTRIENT_KEYS) out[key] = n[key] * servings;
  return out;
}

export function sumNutrition(items: Nutrition[]): Nutrition {
  const out = emptyNutrition();
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) out[key] += item[key];
  }
  return out;
}

export function entryTotal(entry: Nutrition & { servings: number }): Nutrition {
  return scaleNutrition(entry, entry.servings);
}

/** Share of macro calories from carbs, fat and protein (4/9/4 kcal per gram), or null if there are none. */
export function macroPercents(n: Nutrition): { carbs: number; fat: number; protein: number } | null {
  const carbs = n.carbs * 4;
  const fat = n.fat * 9;
  const protein = n.protein * 4;
  const total = carbs + fat + protein;
  if (total <= 0) return null;
  return {
    carbs: Math.round((carbs / total) * 100),
    fat: Math.round((fat / total) * 100),
    protein: Math.round((protein / total) * 100),
  };
}

type EntryLike = Nutrition & { servings: number; consumed: number };

/** Totals for entries marked eaten. */
export function sumConsumed(entries: EntryLike[]): Nutrition {
  return sumNutrition(entries.filter((e) => e.consumed).map(entryTotal));
}

/** Totals for entries that are only planned (not yet eaten). */
export function sumPlanned(entries: EntryLike[]): Nutrition {
  return sumNutrition(entries.filter((e) => !e.consumed).map(entryTotal));
}
