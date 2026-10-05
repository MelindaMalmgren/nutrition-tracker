import { addDays } from '@/lib/dates';

export type DayPoint = { iso: string; calories: number | null; goal: number };
export type GoalStatus = 'under' | 'on' | 'over';

/** Within 10% of the goal counts as on target. */
export function goalStatus(eaten: number, goal: number): GoalStatus {
  const ratio = eaten / goal;
  return ratio > 1.1 ? 'over' : ratio < 0.9 ? 'under' : 'on';
}

/** One point per day for the `days` days ending at `end`; days with nothing eaten have null calories (a gap, not zero). */
export function buildSeries(
  calories: Map<string, number>,
  end: string,
  days: number,
  goalFor: (iso: string) => number,
): DayPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const iso = addDays(end, i - (days - 1));
    return { iso, calories: calories.get(iso) ?? null, goal: goalFor(iso) };
  });
}

export function summarize(points: DayPoint[]) {
  const logged = points.filter((p): p is DayPoint & { calories: number } => p.calories !== null);
  const average = logged.length > 0 ? logged.reduce((sum, p) => sum + p.calories, 0) / logged.length : 0;
  const onTarget = logged.filter((p) => goalStatus(p.calories, p.goal) === 'on').length;
  return { logged: logged.length, average, onTarget };
}
