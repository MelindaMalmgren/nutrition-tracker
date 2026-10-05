import { StyleSheet } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Rounded corners plus a hairline edge, so cards separate from the screen behind them. */
export function useCard() {
  const theme = useTheme();
  return { borderRadius: Radii.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected };
}
