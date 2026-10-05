import type { SQLiteDatabase } from 'expo-sqlite';

import { addFoodEntry } from '@/db/diary';
import type { Food, MealSlot } from '@/types';

export type MealSummary = { id: number; name: string; item_count: number; calories: number; use_count: number };
export type MealItem = Food & { item_servings: number };

export function listMeals(db: SQLiteDatabase, query = '') {
  return db.getAllAsync<MealSummary>(
    `SELECT m.id, m.name, COUNT(mi.id) AS item_count,
            COALESCE(SUM(f.calories * mi.servings), 0) AS calories,
            m.times_logged AS use_count
       FROM meals m
       LEFT JOIN meal_items mi ON mi.meal_id = m.id
       LEFT JOIN foods f ON f.id = mi.food_id
      WHERE m.name LIKE ?
      GROUP BY m.id
      ORDER BY m.name COLLATE NOCASE`,
    `%${query.trim()}%`,
  );
}

export function getMeal(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<{ id: number; name: string }>('SELECT id, name FROM meals WHERE id = ?', id);
}

export function getMealItems(db: SQLiteDatabase, mealId: number) {
  return db.getAllAsync<MealItem>(
    `SELECT f.*, mi.servings AS item_servings
       FROM meal_items mi JOIN foods f ON f.id = mi.food_id
      WHERE mi.meal_id = ?
      ORDER BY mi.id`,
    mealId,
  );
}

export async function saveMeal(
  db: SQLiteDatabase,
  id: number | null,
  name: string,
  items: { food_id: number; servings: number }[],
) {
  let mealId = id ?? 0;
  await db.withTransactionAsync(async () => {
    if (id === null) {
      const result = await db.runAsync('INSERT INTO meals (name) VALUES (?)', name);
      mealId = result.lastInsertRowId;
    } else {
      await db.runAsync('UPDATE meals SET name = ? WHERE id = ?', name, id);
      await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', id);
    }
    for (const item of items) {
      await db.runAsync(
        'INSERT INTO meal_items (meal_id, food_id, servings) VALUES (?, ?, ?)',
        mealId,
        item.food_id,
        item.servings,
      );
    }
  });
  return mealId;
}

export async function deleteMeal(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM meals WHERE id = ?', id);
}

/** Logs each food in the meal as its own diary entry, using the foods' current nutrition. */
export async function addMealToDiary(
  db: SQLiteDatabase,
  mealId: number,
  date: string,
  slot: MealSlot,
  multiplier: number,
) {
  const items = await getMealItems(db, mealId);
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await addFoodEntry(db, item, { date, meal_slot: slot, servings: item.item_servings * multiplier });
    }
    await db.runAsync('UPDATE meals SET times_logged = times_logged + 1 WHERE id = ?', mealId);
  });
}
