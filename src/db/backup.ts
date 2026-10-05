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

export const TABLE_LABELS: Record<TableName, string> = {
  foods: 'foods',
  meals: 'meals',
  recipes: 'recipes',
  meal_items: 'meal items',
  recipe_ingredients: 'recipe ingredients',
  diary_entries: 'diary entries',
  settings: 'settings',
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

export function backupCounts(backup: Backup) {
  return TABLES.map((table) => ({ table, label: TABLE_LABELS[table], count: backup.tables[table].length }));
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
