import { RingColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useRingColors() {
  const scheme = useColorScheme();
  return RingColors[scheme === 'dark' ? 'dark' : 'light'];
}
