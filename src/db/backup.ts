import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATION_COUNT } from '@/db/migrations';

const APP_ID = 'nutrition-tracker';
const FORMAT_VERSION = 1;

// Parents before children, so inserts satisfy foreign keys; deletes run in reverse.
const TABLES = ['foods', 'meals', 'recipes', 'meal_items', 'recipe_ingredients', 'diary_entries', 'settings'] as const;
type TableName = (typeof TABLES)[number];

type Value = string | number | null;
type Row = Record<string, Value>;

export type Backup = {
  app: typeof APP_ID;
  format: number;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<TableName, Row[]>;
};

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const tables = {} as Record<TableName, Row[]>;
  for (const table of TABLES) tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
  return { app: APP_ID, format: FORMAT_VERSION, schemaVersion: MIGRATION_COUNT, exportedAt: new Date().toISOString(), tables };
}

/** Parses and checks a backup file's text; throws an Error with a user-readable message if it can't be restored. */
export function parseBackup(text: string): Backup {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || data.app !== APP_ID || typeof data.tables !== 'object' || data.tables === null) {
    throw new Error('That file is not a Nutrition Tracker backup.');
  }
  if (data.format !== FORMAT_VERSION) {
    throw new Error('That backup was made by a different version of the app and can\'t be read.');
  }
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > MIGRATION_COUNT) {
    throw new Error('That backup comes from a newer version of the app. Update the app and try again.');
  }
  for (const table of TABLES) {
    const rows = data.tables[table];
    if (!Array.isArray(rows)) throw new Error(`The backup is missing its "${table}" data.`);
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`The backup has a damaged row in "${table}".`);
      for (const value of Object.values(row)) {
        if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
          throw new Error(`The backup has a damaged row in "${table}".`);
        }
      }
    }
  }
  return data as Backup;
}

export type Category = 'diary' | 'foods' | 'meals' | 'recipes' | 'settings';

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'diary', label: 'Diary (daily logs)' },
  { key: 'foods', label: 'Foods' },
  { key: 'meals', label: 'Meals' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'settings', label: 'Goals and settings' },
];

/** How many items of each category the backup holds (recipe foods count under Recipes, not Foods). */
export function categoryCounts(backup: Backup): Record<Category, number> {
  const t = backup.tables;
  return {
    diary: t.diary_entries.length,
    foods: t.foods.filter((f) => f.source !== 'recipe').length,
    meals: t.meals.length,
    recipes: t.recipes.length,
    settings: t.settings.length,
  };
}

/** Replaces everything in the database with the backup, all-or-nothing. */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup) {
  const columns = {} as Record<TableName, Set<string>>;
  for (const table of TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    columns[table] = new Set(info.map((c) => c.name));
  }

  await db.withTransactionAsync(async () => {
    for (const table of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${table}`);

    for (const table of TABLES) {
      for (const row of backup.tables[table]) {
        // Only columns this version of the app knows; columns an older backup lacks fall back to their defaults.
        const names = Object.keys(row).filter((name) => columns[table].has(name));
        if (names.length === 0) continue;
        await db.runAsync(
          `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
          names.map((name) => row[name]),
        );
      }
    }
  });
}

type Columns = Record<TableName, Set<string>>;

async function loadColumns(db: SQLiteDatabase) {
  const columns = {} as Columns;
  for (const table of TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    columns[table] = new Set(info.map((c) => c.name));
  }
  return columns;
}

/** Inserts a backup row as a new row (fresh id), with some columns overridden. Returns the new id. */
async function insertRow(db: SQLiteDatabase, columns: Columns, table: TableName, row: Row, overrides: Row = {}) {
  const values: Row = { ...row, ...overrides };
  const names = Object.keys(values).filter((name) => name !== 'id' && columns[table].has(name));
  const result = await db.runAsync(
    `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    names.map((name) => values[name]),
  );
  return result.lastInsertRowId;
}

async function updateFood(db: SQLiteDatabase, columns: Columns, id: number, row: Row) {
  const names = Object.keys(row).filter((n) => n !== 'id' && n !== 'created_at' && columns.foods.has(n));
  await db.runAsync(`UPDATE foods SET ${names.map((n) => `${n} = ?`).join(', ')} WHERE id = ?`, [
    ...names.map((n) => row[n]),
    id,
  ]);
}

/** The saved food that is the same item as a backup food: same external id, same barcode, or same name and brand. */
async function findFood(db: SQLiteDatabase, food: Row) {
  let found: { id: number } | null = null;
  if (food.external_id != null) {
    found = await db.getFirstAsync('SELECT id FROM foods WHERE source = ? AND external_id = ?', [food.source, food.external_id]);
  }
  if (!found && food.barcode) {
    found = await db.getFirstAsync('SELECT id FROM foods WHERE barcode = ?', [food.barcode]);
  }
  if (!found) {
    found = await db.getFirstAsync("SELECT id FROM foods WHERE source = ? AND name = ? AND IFNULL(brand, '') = ?", [
      food.source,
      food.name,
      food.brand ?? '',
    ]);
  }
  return found?.id ?? null;
}

export type ImportMode = 'update' | 'add';

export type ImportResult = {
  skippedMealItems: number;
  /** Add-new-only mode: things left alone because they already exist here. */
  skippedExisting: { recipes: number; meals: number; diaryDays: number };
};

/**
 * Imports only the chosen categories, all-or-nothing.
 *
 * mode 'add' never changes or deletes anything that exists: recipes and meals are added only if no one of that name
 * exists, diary entries only for days with no entries yet, settings only for keys not yet set.
 *
 * mode 'update': with every category chosen this is a full restore. Otherwise diary and settings are replaced; foods already saved are kept and missing ones added; meals and
 * recipes are added, or updated in place when one with the same name exists (so anything else that uses them
 * keeps working). Foods that chosen meals and recipes need are added even if Foods isn't chosen.
 */
export async function importSelection(
  db: SQLiteDatabase,
  backup: Backup,
  selected: ReadonlySet<Category>,
  mode: ImportMode = 'update',
): Promise<ImportResult> {
  const skippedExisting = { recipes: 0, meals: 0, diaryDays: 0 };
  if (mode === 'update' && CATEGORIES.every((c) => selected.has(c.key))) {
    await restoreBackup(db, backup);
    return { skippedMealItems: 0, skippedExisting };
  }
  const addOnly = mode === 'add';

  const columns = await loadColumns(db);
  const t = backup.tables;
  const backupFoods = new Map(t.foods.map((f) => [f.id, f]));
  const foodIds = new Map<Value, number>();
  let skippedMealItems = 0;

  // Maps a backup food id to the id of the same food here, adding it first if `create` and it isn't saved yet.
  const localFood = async (backupId: Value, create: boolean): Promise<number | null> => {
    const known = foodIds.get(backupId);
    if (known !== undefined) return known;
    const food = backupFoods.get(backupId);
    if (!food) return null;

    let id: number | null;
    if (food.source === 'recipe') {
      const recipe = t.recipes.find((r) => r.food_id === backupId);
      const local = recipe && (await db.getFirstAsync<{ food_id: number | null }>('SELECT food_id FROM recipes WHERE name = ?', [recipe.name]));
      id = local?.food_id ?? null;
    } else {
      id = await findFood(db, food);
      if (id === null && create) id = await insertRow(db, columns, 'foods', food);
    }
    if (id !== null) foodIds.set(backupId, id);
    return id;
  };

  await db.withTransactionAsync(async () => {
    if (selected.has('foods')) {
      for (const food of t.foods) if (food.source !== 'recipe') await localFood(food.id, true);
    }

    if (selected.has('recipes')) {
      const recipeIds = new Map<Value, number>();
      for (const recipe of t.recipes) {
        const existing = await db.getFirstAsync<{ id: number; food_id: number | null }>(
          'SELECT id, food_id FROM recipes WHERE name = ?',
          [recipe.name],
        );
        if (existing && addOnly) {
          skippedExisting.recipes++;
          continue;
        }
        const food = backupFoods.get(recipe.food_id);
        let foodId = existing?.food_id ?? null;
        if (food) {
          if (foodId !== null) await updateFood(db, columns, foodId, food);
          else foodId = await insertRow(db, columns, 'foods', food);
        }
        if (existing) {
          await db.runAsync('UPDATE recipes SET yield_servings = ?, notes = ?, food_id = ? WHERE id = ?', [
            recipe.yield_servings,
            recipe.notes ?? null,
            foodId,
            existing.id,
          ]);
          await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [existing.id]);
          recipeIds.set(recipe.id, existing.id);
        } else {
          recipeIds.set(recipe.id, await insertRow(db, columns, 'recipes', recipe, { food_id: foodId }));
        }
      }
      for (const ingredient of t.recipe_ingredients) {
        const recipeId = recipeIds.get(ingredient.recipe_id);
        if (recipeId === undefined) continue;
        const foodId = await localFood(ingredient.food_id, true);
        if (foodId === null) throw new Error('The backup is missing a food that one of its recipes uses.');
        await insertRow(db, columns, 'recipe_ingredients', ingredient, { recipe_id: recipeId, food_id: foodId });
      }
    }

    if (selected.has('meals')) {
      for (const meal of t.meals) {
        const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM meals WHERE name = ?', [meal.name]);
        if (existing && addOnly) {
          skippedExisting.meals++;
          continue;
        }
        let mealId: number;
        if (existing) {
          mealId = existing.id;
          await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', [mealId]);
        } else {
          mealId = await insertRow(db, columns, 'meals', meal);
        }
        for (const item of t.meal_items.filter((i) => i.meal_id === meal.id)) {
          const foodId = await localFood(item.food_id, true);
          if (foodId === null) skippedMealItems++;
          else await insertRow(db, columns, 'meal_items', item, { meal_id: mealId, food_id: foodId });
        }
      }
    }

    if (selected.has('diary')) {
      const loggedDays = new Set<Value>();
      if (addOnly) {
        const rows = await db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM diary_entries');
        for (const row of rows) loggedDays.add(row.date);
        skippedExisting.diaryDays = new Set(t.diary_entries.filter((e) => loggedDays.has(e.date)).map((e) => e.date)).size;
      } else {
        await db.runAsync('DELETE FROM diary_entries');
      }
      for (const entry of t.diary_entries) {
        if (loggedDays.has(entry.date)) continue;
        await insertRow(db, columns, 'diary_entries', entry, { food_id: await localFood(entry.food_id, false) });
      }
    }

    if (selected.has('settings')) {
      if (addOnly) {
        const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM settings');
        const have = new Set(rows.map((r) => r.key));
        for (const setting of t.settings) if (!have.has(setting.key as string)) await insertRow(db, columns, 'settings', setting);
      } else {
        await db.runAsync('DELETE FROM settings');
        for (const setting of t.settings) await insertRow(db, columns, 'settings', setting);
      }
    }
  });

  return { skippedMealItems, skippedExisting };
}
