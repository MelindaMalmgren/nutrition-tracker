import type { SQLiteDatabase } from 'expo-sqlite';

import { NUTRIENT_ASSIGNMENTS, NUTRIENT_COLUMNS, NUTRIENT_PLACEHOLDERS, nutrientValues } from '@/lib/nutrition';
import { ingredientMultiplier, recipeNutrition } from '@/lib/recipes';
import type { Food, Nutrition } from '@/types';

/** Nutrition values are for one serving of the recipe. */
export type RecipeSummary = {
  id: number;
  name: string;
  yield_servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Recipe = { id: number; name: string; yield_servings: number; notes: string | null; food_id: number | null };
/** A food plus the amount used: `item_servings` of `item_serving_size` (null = the food's own size). */
export type RecipeIngredient = Food & {
  item_servings: number;
  item_serving_size: number | null;
  item_serving_label: string | null;
};
export type IngredientInput = { food: Food; servings: number; serving_size: number; serving_label: string | null };
export type RecipeDetails = { name: string; yield_servings: number; notes: string | null };

export function listRecipes(db: SQLiteDatabase, query = '') {
  return db.getAllAsync<RecipeSummary>(
    `SELECT r.id, r.name, r.yield_servings,
            COALESCE(f.calories, 0) AS calories, COALESCE(f.protein, 0) AS protein,
            COALESCE(f.carbs, 0) AS carbs, COALESCE(f.fat, 0) AS fat
       FROM recipes r
       LEFT JOIN foods f ON f.id = r.food_id
      WHERE r.name LIKE ?
      ORDER BY r.name COLLATE NOCASE`,
    `%${query.trim()}%`,
  );
}

export function getRecipe(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Recipe>('SELECT id, name, yield_servings, notes, food_id FROM recipes WHERE id = ?', id);
}

export function getRecipeIngredients(db: SQLiteDatabase, recipeId: number) {
  return db.getAllAsync<RecipeIngredient>(
    `SELECT f.*, ri.servings AS item_servings, ri.serving_size AS item_serving_size,
            ri.serving_label AS item_serving_label
       FROM recipe_ingredients ri JOIN foods f ON f.id = ri.food_id
      WHERE ri.recipe_id = ?
      ORDER BY ri.id`,
    recipeId,
  );
}

/** Creates or updates the food row that represents the recipe (1 serving = 1/yield of the recipe). */
async function writeRecipeFood(db: SQLiteDatabase, foodId: number | null, name: string, n: Nutrition) {
  if (foodId !== null) {
    await db.runAsync(
      `UPDATE foods SET name = ?, ${NUTRIENT_ASSIGNMENTS} WHERE id = ?`,
      name,
      ...nutrientValues(n),
      foodId,
    );
    return foodId;
  }
  const result = await db.runAsync(
    `INSERT INTO foods
       (name, brand, barcode, source, serving_size, serving_unit, ${NUTRIENT_COLUMNS})
     VALUES (?, NULL, NULL, 'recipe', 1, 'serving', ${NUTRIENT_PLACEHOLDERS})`,
    name,
    ...nutrientValues(n),
  );
  return result.lastInsertRowId;
}

export async function saveRecipe(
  db: SQLiteDatabase,
  id: number | null,
  details: RecipeDetails,
  items: IngredientInput[],
) {
  const nutrition = recipeNutrition(
    items.map((i) => ({ food: i.food, servings: ingredientMultiplier(i.food, i.servings, i.serving_size) })),
    details.yield_servings,
  );
  let recipeId = id ?? 0;

  await db.withTransactionAsync(async () => {
    if (id === null) {
      const foodId = await writeRecipeFood(db, null, details.name, nutrition);
      const result = await db.runAsync(
        'INSERT INTO recipes (name, yield_servings, notes, food_id) VALUES (?, ?, ?, ?)',
        details.name,
        details.yield_servings,
        details.notes,
        foodId,
      );
      recipeId = result.lastInsertRowId;
    } else {
      const existing = await getRecipe(db, id);
      const foodId = await writeRecipeFood(db, existing?.food_id ?? null, details.name, nutrition);
      await db.runAsync(
        'UPDATE recipes SET name = ?, yield_servings = ?, notes = ?, food_id = ? WHERE id = ?',
        details.name,
        details.yield_servings,
        details.notes,
        foodId,
        id,
      );
      await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', id);
    }

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO recipe_ingredients (recipe_id, food_id, servings, serving_size, serving_label) VALUES (?, ?, ?, ?, ?)',
        recipeId,
        item.food.id,
        item.servings,
        item.serving_size,
        item.serving_label,
      );
    }
  });
  return recipeId;
}

/** Removes the recipe and its food entry. Diary entries already logged keep their own nutrition snapshot. */
export async function deleteRecipe(db: SQLiteDatabase, id: number) {
  const recipe = await getRecipe(db, id);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM recipes WHERE id = ?', id);
    if (recipe?.food_id != null) await db.runAsync('DELETE FROM foods WHERE id = ?', recipe.food_id);
  });
}

/** Recomputes stored nutrition for every recipe that uses a food, e.g. after that food was edited. */
export async function refreshRecipesUsing(db: SQLiteDatabase, foodId: number) {
  const rows = await db.getAllAsync<{ recipe_id: number }>(
    'SELECT DISTINCT recipe_id FROM recipe_ingredients WHERE food_id = ?',
    foodId,
  );
  for (const { recipe_id } of rows) {
    const recipe = await getRecipe(db, recipe_id);
    if (!recipe || recipe.food_id === null) continue;
    const ingredients = await getRecipeIngredients(db, recipe_id);
    const nutrition = recipeNutrition(
      ingredients.map((i) => ({ food: i, servings: ingredientMultiplier(i, i.item_servings, i.item_serving_size) })),
      recipe.yield_servings,
    );
    await writeRecipeFood(db, recipe.food_id, recipe.name, nutrition);
  }
}
