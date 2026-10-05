import type { SQLiteDatabase } from 'expo-sqlite';

import { NUTRIENT_ASSIGNMENTS, NUTRIENT_COLUMNS, NUTRIENT_PLACEHOLDERS, nutrientValues } from '@/lib/nutrition';
import { NUTRIENT_KEYS, type Food, type FoodSource, type LookupFood, type Nutrition, type ServingOption } from '@/types';

export type NewCustomFood = Nutrition & {
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
};

/** Alphabetical. With withUsage, use_count is how many diary entries log each food (otherwise 0). */
export function listFoods(db: SQLiteDatabase, query = '', source?: FoodSource, withUsage = false) {
  const like = `%${query.trim()}%`;
  const usage = withUsage ? '(SELECT COUNT(*) FROM diary_entries d WHERE d.food_id = foods.id)' : '0';
  return db.getAllAsync<Food & { use_count: number }>(
    `SELECT foods.*, ${usage} AS use_count FROM foods
      WHERE (name LIKE ? OR brand LIKE ?) AND (? IS NULL OR source = ?)
      ORDER BY name COLLATE NOCASE`,
    like,
    like,
    source ?? null,
    source ?? null,
  );
}

/**
 * Saves a food looked up from an external database, reusing the existing row if it was saved before. A reused row
 * gains any nutrient it has as 0 that the lookup knows (e.g. ones added after it was first saved); nothing else changes.
 */
export async function upsertExternalFood(db: SQLiteDatabase, food: LookupFood): Promise<number> {
  const existing = await db.getFirstAsync<Food>(
    'SELECT * FROM foods WHERE source = ? AND external_id = ?',
    food.source,
    food.external_id,
  );
  const portions = food.portions ? JSON.stringify(food.portions) : null;
  if (existing) {
    if (portions) await db.runAsync('UPDATE foods SET portions = ? WHERE id = ?', portions, existing.id);
    const missing = NUTRIENT_KEYS.filter((key) => existing[key] === 0 && food[key] > 0);
    if (missing.length > 0) {
      await db.runAsync(
        `UPDATE foods SET ${missing.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`,
        ...missing.map((key) => food[key]),
        existing.id,
      );
    }
    return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO foods
       (name, brand, barcode, source, external_id, portions, serving_size, serving_unit, serving_label,
        ${NUTRIENT_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_PLACEHOLDERS})`,
    food.name,
    food.brand,
    food.barcode,
    food.source,
    food.external_id,
    portions,
    food.serving_size,
    food.serving_unit,
    food.serving_label ?? null,
    ...nutrientValues(food),
  );
  return result.lastInsertRowId;
}

/** Finds a previously saved food by barcode, ignoring leading zeros (UPC-A vs EAN-13 forms of the same code). */
export function findFoodByBarcode(db: SQLiteDatabase, barcode: string) {
  return db.getFirstAsync<Food>(
    `SELECT * FROM foods WHERE barcode IS NOT NULL AND LTRIM(barcode, '0') = LTRIM(?, '0') LIMIT 1`,
    barcode,
  );
}

/** Remembers household measures fetched for a food so they work offline next time. */
export async function saveFoodPortions(db: SQLiteDatabase, id: number, portions: ServingOption[]) {
  await db.runAsync('UPDATE foods SET portions = ? WHERE id = ?', JSON.stringify(portions), id);
}

export function getFood(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Food>('SELECT * FROM foods WHERE id = ?', id);
}

export async function updateCustomFood(db: SQLiteDatabase, id: number, food: NewCustomFood) {
  await db.runAsync(
    `UPDATE foods SET name = ?, brand = ?, serving_size = ?, serving_unit = ?, ${NUTRIENT_ASSIGNMENTS}
     WHERE id = ? AND source = 'custom'`,
    food.name,
    food.brand,
    food.serving_size,
    food.serving_unit,
    ...nutrientValues(food),
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
       (name, brand, barcode, source, serving_size, serving_unit, ${NUTRIENT_COLUMNS})
     VALUES (?, ?, NULL, 'custom', ?, ?, ${NUTRIENT_PLACEHOLDERS})`,
    food.name,
    food.brand,
    food.serving_size,
    food.serving_unit,
    ...nutrientValues(food),
  );
  return result.lastInsertRowId;
}
