import type { DayStatus } from '@/db/diary';
import { addDays, toISODate } from '@/lib/dates';

export type DayStatuses = Map<string, DayStatus>;

/** How many days of the month have passed (through today) and how many of those were logged. */
export function monthSummary(statuses: DayStatuses, year: number, month: number, today: string) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let elapsed = 0;
  let logged = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISODate(new Date(year, month, day));
    if (iso > today) break;
    elapsed++;
    if (statuses.get(iso) === 'logged') logged++;
  }
  return { elapsed, logged };
}

/** Consecutive logged days ending today, or ending yesterday if today isn't logged yet. */
export function currentStreak(statuses: DayStatuses, today: string): number {
  let day = statuses.get(today) === 'logged' ? today : addDays(today, -1);
  let streak = 0;
  while (statuses.get(day) === 'logged') {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
