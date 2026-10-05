import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiaryEntry, Food, MealSlot, Nutrition } from '@/types';

export function getEntriesForDate(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<DiaryEntry>('SELECT * FROM diary_entries WHERE date = ? ORDER BY id', date);
}

export function getEntry(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<DiaryEntry>('SELECT * FROM diary_entries WHERE id = ?', id);
}

type NewEntry = {
  date: string;
  meal_slot: MealSlot;
  name: string;
  servings: number;
  serving_size?: number;
  serving_unit?: string;
  food_id?: number | null;
} & Nutrition;

export async function addEntry(db: SQLiteDatabase, entry: NewEntry) {
  await db.runAsync(
    `INSERT INTO diary_entries
       (date, meal_slot, food_id, name, servings, serving_size, serving_unit,
        calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.date,
    entry.meal_slot,
    entry.food_id ?? null,
    entry.name,
    entry.servings,
    entry.serving_size ?? 1,
    entry.serving_unit ?? 'serving',
    entry.calories,
    entry.protein,
    entry.carbs,
    entry.fat,
    entry.fiber,
    entry.sugar,
    entry.sodium,
  );
}

/** Logs a food, snapshotting its current per-serving nutrition. */
export function addFoodEntry(
  db: SQLiteDatabase,
  food: Food,
  entry: { date: string; meal_slot: MealSlot; servings: number },
) {
  return addEntry(db, {
    ...entry,
    food_id: food.id,
    name: food.name,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar,
    sodium: food.sodium,
  });
}

/** Per-serving nutrition is rescaled by the ratio of new to old serving size. */
export async function updateEntry(
  db: SQLiteDatabase,
  entry: DiaryEntry,
  changes: { meal_slot: MealSlot; servings: number; serving_size: number },
) {
  const factor = changes.serving_size / entry.serving_size;
  await db.runAsync(
    `UPDATE diary_entries SET meal_slot = ?, servings = ?, serving_size = ?,
       calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?
     WHERE id = ?`,
    changes.meal_slot,
    changes.servings,
    changes.serving_size,
    entry.calories * factor,
    entry.protein * factor,
    entry.carbs * factor,
    entry.fat * factor,
    entry.fiber * factor,
    entry.sugar * factor,
    entry.sodium * factor,
    entry.id,
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM diary_entries WHERE id = ?', id);
}
