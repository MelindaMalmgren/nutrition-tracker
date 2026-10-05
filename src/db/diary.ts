import type { SQLiteDatabase } from 'expo-sqlite';

import { scaleNutrition } from '@/lib/nutrition';
import type { DiaryEntry, Food, MealSlot, Nutrition } from '@/types';

export function getEntriesForDate(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<DiaryEntry>('SELECT * FROM diary_entries WHERE date = ? ORDER BY id', date);
}

/** Dates (YYYY-MM-DD) in the inclusive range that have at least one entry. */
export async function getDatesWithEntries(db: SQLiteDatabase, from: string, to: string) {
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM diary_entries WHERE date BETWEEN ? AND ?',
    from,
    to,
  );
  return new Set(rows.map((r) => r.date));
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
  serving_label?: string | null;
  food_id?: number | null;
} & Nutrition;

export async function addEntry(db: SQLiteDatabase, entry: NewEntry) {
  await db.runAsync(
    `INSERT INTO diary_entries
       (date, meal_slot, food_id, name, servings, serving_size, serving_unit, serving_label,
        calories, protein, carbs, fat, fiber, sugar, sodium)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.date,
    entry.meal_slot,
    entry.food_id ?? null,
    entry.name,
    entry.servings,
    entry.serving_size ?? 1,
    entry.serving_unit ?? 'serving',
    entry.serving_label ?? null,
    entry.calories,
    entry.protein,
    entry.carbs,
    entry.fat,
    entry.fiber,
    entry.sugar,
    entry.sodium,
  );
}

/**
 * Logs a food, snapshotting its per-serving nutrition. If serving_size differs from the food's own,
 * nutrition is rescaled proportionally (the food itself is left unchanged). serving_label is the household
 * wording for that size (e.g. "1 cup (158 g)"); omit it when the size is the food's own and needs no wording.
 */
export function addFoodEntry(
  db: SQLiteDatabase,
  food: Food,
  entry: { date: string; meal_slot: MealSlot; servings: number; serving_size?: number; serving_label?: string | null },
) {
  const { serving_size = food.serving_size, ...rest } = entry;
  const n = scaleNutrition(food, serving_size / food.serving_size);
  return addEntry(db, {
    ...rest,
    ...n,
    food_id: food.id,
    name: food.name,
    serving_size,
    serving_unit: food.serving_unit,
  });
}

/** Per-serving nutrition is rescaled by the ratio of new to old serving size; a changed size drops the old wording. */
export async function updateEntry(
  db: SQLiteDatabase,
  entry: DiaryEntry,
  changes: { meal_slot: MealSlot; servings: number; serving_size: number },
) {
  const factor = changes.serving_size / entry.serving_size;
  await db.runAsync(
    `UPDATE diary_entries SET meal_slot = ?, servings = ?, serving_size = ?, serving_label = ?,
       calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?
     WHERE id = ?`,
    changes.meal_slot,
    changes.servings,
    changes.serving_size,
    changes.serving_size === entry.serving_size ? entry.serving_label : null,
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

export async function setEntryConsumed(db: SQLiteDatabase, id: number, consumed: boolean) {
  await db.runAsync('UPDATE diary_entries SET consumed = ? WHERE id = ?', consumed ? 1 : 0, id);
}

/** Marks every entry in one meal of a day eaten (or planned). */
export async function setMealConsumed(db: SQLiteDatabase, date: string, slot: MealSlot, consumed: boolean) {
  await db.runAsync(
    'UPDATE diary_entries SET consumed = ? WHERE date = ? AND meal_slot = ?',
    consumed ? 1 : 0,
    date,
    slot,
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM diary_entries WHERE id = ?', id);
}
