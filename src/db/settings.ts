import type { SQLiteDatabase } from 'expo-sqlite';

export const GOAL_KEYS = ['calories', 'fat', 'carbs', 'protein', 'fiber'] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];
export type Goals = Record<GoalKey, number>;
export type RingMode = 'up' | 'down';

export type AppSettings = { goals: Goals; ringMode: RingMode };

export const DEFAULT_GOALS: Goals = { calories: 2000, fat: 65, carbs: 250, protein: 100, fiber: 28 };
export const DEFAULT_SETTINGS: AppSettings = { goals: DEFAULT_GOALS, ringMode: 'up' };

const goalKey = (key: GoalKey) => `goal_${key}`;

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  const goals = { ...DEFAULT_GOALS };
  for (const key of GOAL_KEYS) {
    const value = Number(stored.get(goalKey(key)));
    if (stored.has(goalKey(key)) && Number.isFinite(value) && value > 0) goals[key] = value;
  }
  return { goals, ringMode: stored.get('ring_mode') === 'down' ? 'down' : 'up' };
}

async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function saveGoals(db: SQLiteDatabase, goals: Goals) {
  await db.withTransactionAsync(async () => {
    for (const key of GOAL_KEYS) await setSetting(db, goalKey(key), String(goals[key]));
  });
}

export async function saveRingMode(db: SQLiteDatabase, mode: RingMode) {
  await setSetting(db, 'ring_mode', mode);
}
