import Svg, { Circle, Path } from 'react-native-svg';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { MealSlot } from '@/types';

const ICONS: Record<MealSlot, string[]> = {
  Breakfast: [
    'M17 18a5 5 0 0 0-10 0',
    'M12 2v7',
    'M4.22 10.22l1.42 1.42',
    'M1 18h2',
    'M21 18h2',
    'M18.36 11.64l1.42-1.42',
    'M23 22H1',
    'M8 6l4-4 4 4',
  ],
  Lunch: [
    'M12 2v2',
    'M12 20v2',
    'M4.93 4.93l1.41 1.41',
    'M17.66 17.66l1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'M4.93 19.07l1.41-1.41',
    'M17.66 6.34l1.41-1.41',
  ],
  Afternoon: ['M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z', 'M17 11h1a3 3 0 0 1 0 6h-1', 'M8 3v3', 'M12 3v3'],
  Dinner: [],
  Evening: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
};

/** A small line icon for each meal in a tinted circle. It uses only theme neutrals so meals never share a color with a nutrient. */
export function MealIcon({ slot, size = 40 }: { slot: MealSlot; size?: number }) {
  const theme = useTheme();
  const stroke = { stroke: theme.accentText, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.backgroundSelected,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
        {slot === 'Lunch' && <Circle cx={12} cy={12} r={4} {...stroke} />}
        {slot === 'Dinner' && (
          <>
            <Circle cx={12} cy={12} r={9} {...stroke} />
            <Circle cx={12} cy={12} r={4.5} {...stroke} />
          </>
        )}
        {ICONS[slot].map((d) => (
          <Path key={d} d={d} {...stroke} />
        ))}
      </Svg>
    </View>
  );
}
