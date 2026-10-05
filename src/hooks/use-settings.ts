import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { DEFAULT_SETTINGS, getSettings, type AppSettings } from '@/db/settings';

/** Daily goals and ring mode, reloaded whenever the screen regains focus (e.g. after editing Settings). */
export function useSettings(): AppSettings {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      getSettings(db).then(setSettings);
    }, [db]),
  );

  return settings;
}
