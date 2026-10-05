import type { SQLiteDatabase } from 'expo-sqlite';

export const GOAL_KEYS = ['calories', 'fat', 'carbs', 'protein', 'fiber'] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];
export type Goals = Record<GoalKey, number>;
export type RingMode = 'up' | 'down';

/** Percent of calories from each macro; the three add up to 100. */
export type MacroSplit = { protein: number; fat: number; carbs: number };

export type AppSettings = {
  ringMode: RingMode;
  /** The daily calorie goal, used every day unless perDay is on. */
  calories: number;
  perDay: boolean;
  /** Calorie goal per weekday, index 0 = Sunday. Used when perDay is on. */
  weekdayCalories: number[];
  split: MacroSplit;
  /** Fixed daily fiber goal in grams (does not scale with calories). */
  fiber: number;
};

export const DEFAULT_SPLIT: MacroSplit = { protein: 30, fat: 30, carbs: 40 };
export const DEFAULT_FIBER = 25;
export const DEFAULT_CALORIES = 2000;

export const DEFAULT_SETTINGS: AppSettings = {
  ringMode: 'up',
  calories: DEFAULT_CALORIES,
  perDay: false,
  weekdayCalories: Array(7).fill(DEFAULT_CALORIES),
  split: DEFAULT_SPLIT,
  fiber: DEFAULT_FIBER,
};

function positive(value: string | undefined, fallback: number, allowZero = false) {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) && (allowZero ? n >= 0 : n > 0) ? n : fallback;
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  const calories = positive(stored.get('goal_calories'), DEFAULT_CALORIES);
  const protein = positive(stored.get('split_protein'), DEFAULT_SPLIT.protein, true);
  const fat = positive(stored.get('split_fat'), DEFAULT_SPLIT.fat, true);
  // Splits saved before carbs became its own setting treated carbs as the remainder; keep that value.
  const carbs = stored.has('split_carbs')
    ? positive(stored.get('split_carbs'), DEFAULT_SPLIT.carbs, true)
    : Math.max(100 - protein - fat, 0);

  return {
    ringMode: stored.get('ring_mode') === 'down' ? 'down' : 'up',
    calories,
    perDay: stored.get('goal_per_day') === '1',
    weekdayCalories: Array.from({ length: 7 }, (_, day) => positive(stored.get(`goal_day_${day}`), calories)),
    split: { protein, fat, carbs },
    fiber: positive(stored.get('goal_fiber'), DEFAULT_FIBER, true),
  };
}

async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function saveGoalSettings(db: SQLiteDatabase, s: Omit<AppSettings, 'ringMode'>) {
  await db.withTransactionAsync(async () => {
    await setSetting(db, 'goal_calories', String(s.calories));
    await setSetting(db, 'goal_per_day', s.perDay ? '1' : '0');
    for (let day = 0; day < 7; day++) await setSetting(db, `goal_day_${day}`, String(s.weekdayCalories[day]));
    await setSetting(db, 'split_protein', String(s.split.protein));
    await setSetting(db, 'split_fat', String(s.split.fat));
    await setSetting(db, 'split_carbs', String(s.split.carbs));
    await setSetting(db, 'goal_fiber', String(s.fiber));
  });
}

export async function saveRingMode(db: SQLiteDatabase, mode: RingMode) {
  await setSetting(db, 'ring_mode', mode);
}
