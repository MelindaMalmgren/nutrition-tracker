import { scaleNutrition, sumNutrition } from '@/lib/nutrition';
import type { Nutrition } from '@/types';

/**
 * How many of the food's own servings an ingredient amounts to: `servings` of `size`, where size is in the food's
 * unit and null means the food's own serving size. (2 servings of 150 g on a 100 g food = 3.)
 */
export function ingredientMultiplier(
  food: { serving_size: number },
  servings: number,
  size: number | null,
): number {
  return servings * ((size ?? food.serving_size) / food.serving_size);
}

/**
 * Per-serving nutrition for a recipe: everything in the pot, divided by how many servings it makes.
 * Each ingredient's `servings` here is already a multiple of the food's own serving (see ingredientMultiplier).
 */
export function recipeNutrition(
  ingredients: { food: Nutrition; servings: number }[],
  yieldServings: number,
): Nutrition {
  const total = sumNutrition(ingredients.map((i) => scaleNutrition(i.food, i.servings)));
  return scaleNutrition(total, 1 / yieldServings);
}
