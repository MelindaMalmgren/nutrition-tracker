import { RingColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function useRingColors() {
  const scheme = useColorScheme();
  const theme = useTheme();
  return { ...RingColors[scheme === 'dark' ? 'dark' : 'light'], track: theme.track };
}
