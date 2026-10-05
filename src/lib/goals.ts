import type { AppSettings, Goals, MacroSplit } from '@/db/settings';
import { weekdayOf } from '@/lib/dates';

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const splitTotal = (split: MacroSplit) => split.protein + split.fat + split.carbs;

/** A split is usable when its three percentages add up to 100 (allowing for decimal typing). */
export const isValidSplit = (split: MacroSplit) => Math.abs(splitTotal(split) - 100) < 0.01;

/** Macro goals in grams from a calorie goal and a percentage split. Fiber is a fixed amount. */
export function computeGoals(
  calories: number,
  split: MacroSplit,
  fixed: { fiber: number; sugar: number; sodium: number },
): Goals {
  const grams = (percent: number, kcalPerGram: number) => Math.round((calories * percent) / 100 / kcalPerGram);
  return {
    calories,
    protein: grams(split.protein, KCAL_PER_GRAM.protein),
    fat: grams(split.fat, KCAL_PER_GRAM.fat),
    carbs: grams(split.carbs, KCAL_PER_GRAM.carbs),
    fiber: fixed.fiber,
    sugar: fixed.sugar,
    sodium: fixed.sodium,
  };
}

/** The calorie goal for a given day: that weekday's goal if per-day goals are on, otherwise the single goal. */
export function caloriesForDate(settings: AppSettings, date: string): number {
  return settings.perDay ? settings.weekdayCalories[weekdayOf(date)] : settings.calories;
}

export function goalsForDate(settings: AppSettings, date: string): Goals {
  return computeGoals(caloriesForDate(settings, date), settings.split, settings);
}
