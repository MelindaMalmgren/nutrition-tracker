import { NUTRIENT_KEYS, type Nutrition } from '@/types';

export function emptyNutrition(): Nutrition {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
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
