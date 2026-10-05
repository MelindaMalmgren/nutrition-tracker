import type { SQLiteDatabase } from 'expo-sqlite';

import type { Food, FoodSource, Nutrition } from '@/types';

export type NewCustomFood = Nutrition & {
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
};

export function listFoods(db: SQLiteDatabase, query = '', source?: FoodSource) {
  const like = `%${query.trim()}%`;
  return db.getAllAsync<Food>(
    `SELECT * FROM foods
      WHERE (name LIKE ? OR brand LIKE ?) AND (? IS NULL OR source = ?)
      ORDER BY name COLLATE NOCASE`,
    like,
    like,
    source ?? null,
    source ?? null,
  );
}

/** Saves a food looked up from an external database, reusing the existing row if it was saved before. */
export async function upsertExternalFood(
  db: SQLiteDatabase,
  source: 'usda' | 'off',
  food: NewCustomFood & { external_id: string },
): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM foods WHERE source = ? AND external_id = ?',
    source,
    food.external_id,
  );
  if (existing) return existing.id;

  const result = await db.runAsync(
    `INSERT INTO foods
       (name, brand, barcode, source, external_id, serving_size, serving_unit,
        calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    food.name,
    food.brand,
    source,
    food.external_id,
    food.serving_size,
    food.serving_unit,
    food.calories,
    food.protein,
    food.carbs,
    food.fat,
    food.fiber,
    food.sugar,
    food.sodium,
  );
  return result.lastInsertRowId;
}

export function getFood(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Food>('SELECT * FROM foods WHERE id = ?', id);
}

export async function updateCustomFood(db: SQLiteDatabase, id: number, food: NewCustomFood) {
  await db.runAsync(
    `UPDATE foods SET name = ?, brand = ?, serving_size = ?, serving_unit = ?,
       calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?
     WHERE id = ? AND source = 'custom'`,
    food.name,
    food.brand,
    food.serving_size,
    food.serving_unit,
    food.calories,
    food.protein,
    food.carbs,
    food.fat,
    food.fiber,
    food.sugar,
    food.sodium,
    id,
  );
}

/** Returns false (and deletes nothing) if a recipe uses the food as an ingredient. */
export async function deleteFood(db: SQLiteDatabase, id: number): Promise<boolean> {
  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM recipe_ingredients WHERE food_id = ?',
    id,
  );
  if (used && used.n > 0) return false;
  await db.runAsync('DELETE FROM foods WHERE id = ?', id);
  return true;
}

export async function insertCustomFood(db: SQLiteDatabase, food: NewCustomFood) {
  const result = await db.runAsync(
    `INSERT INTO foods
       (name, brand, barcode, source, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, NULL, 'custom', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    food.name,
    food.brand,
    food.serving_size,
    food.serving_unit,
    food.calories,
    food.protein,
    food.carbs,
    food.fat,
    food.fiber,
    food.sugar,
    food.sodium,
  );
  return result.lastInsertRowId;
}
