import { Appearance } from 'react-native';

import type { ThemeMode } from '@/db/settings';

/** Forces light or dark for this app only, or hands control back to the phone's setting. */
export function applyThemeMode(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}
