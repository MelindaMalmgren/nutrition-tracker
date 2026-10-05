import { createContext, useContext, useState, type ReactNode } from 'react';

import { todayISO } from '@/lib/dates';

type SelectedDate = { date: string; setDate: (date: string) => void };

const SelectedDateContext = createContext<SelectedDate | null>(null);

/** The day being viewed, shared so the Diary tab and the day detail screen stay on the same date. */
export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(todayISO());
  return <SelectedDateContext.Provider value={{ date, setDate }}>{children}</SelectedDateContext.Provider>;
}

export function useSelectedDate(): SelectedDate {
  const value = useContext(SelectedDateContext);
  if (!value) throw new Error('useSelectedDate must be used inside SelectedDateProvider');
  return value;
}
