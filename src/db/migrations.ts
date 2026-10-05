import type { SQLiteDatabase } from 'expo-sqlite';

// Append new migrations to the end; never edit one that has shipped.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    source TEXT NOT NULL CHECK (source IN ('off','usda','custom','recipe')),
    serving_size REAL NOT NULL DEFAULT 100,
    serving_unit TEXT NOT NULL DEFAULT 'g',
    calories REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    fiber REAL NOT NULL DEFAULT 0,
    sugar REAL NOT NULL DEFAULT 0,
    sodium REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_foods_barcode ON foods (barcode);

  CREATE TABLE diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_slot TEXT NOT NULL CHECK (meal_slot IN ('Breakfast','Lunch','Afternoon','Dinner','Evening')),
    food_id INTEGER REFERENCES foods (id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    servings REAL NOT NULL DEFAULT 1,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    fiber REAL NOT NULL DEFAULT 0,
    sugar REAL NOT NULL DEFAULT 0,
    sodium REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_diary_entries_date ON diary_entries (date);

  CREATE TABLE meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE meal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    servings REAL NOT NULL DEFAULT 1
  );

  CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    yield_servings REAL NOT NULL DEFAULT 1,
    notes TEXT,
    food_id INTEGER REFERENCES foods (id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods (id) ON DELETE RESTRICT,
    servings REAL NOT NULL DEFAULT 1
  );
  `,
  `
  ALTER TABLE diary_entries ADD COLUMN serving_size REAL NOT NULL DEFAULT 1;
  ALTER TABLE diary_entries ADD COLUMN serving_unit TEXT NOT NULL DEFAULT 'serving';
  UPDATE diary_entries
    SET serving_size = (SELECT f.serving_size FROM foods f WHERE f.id = diary_entries.food_id),
        serving_unit = (SELECT f.serving_unit FROM foods f WHERE f.id = diary_entries.food_id)
    WHERE food_id IS NOT NULL;
  `,
  `
  ALTER TABLE foods ADD COLUMN external_id TEXT;
  CREATE INDEX idx_foods_external ON foods (source, external_id);
  `,
  `
  ALTER TABLE foods ADD COLUMN portions TEXT;
  ALTER TABLE foods ADD COLUMN serving_label TEXT;
  ALTER TABLE diary_entries ADD COLUMN serving_label TEXT;
  `,
  `
  ALTER TABLE diary_entries ADD COLUMN consumed INTEGER NOT NULL DEFAULT 1;
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  `
  ALTER TABLE recipe_ingredients ADD COLUMN serving_size REAL;
  ALTER TABLE recipe_ingredients ADD COLUMN serving_label TEXT;
  `,
  `
  ALTER TABLE meals ADD COLUMN times_logged INTEGER NOT NULL DEFAULT 0;
  `,
];

export const MIGRATION_COUNT = MIGRATIONS.length;

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
