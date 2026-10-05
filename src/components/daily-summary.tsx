import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { MacroRing } from '@/components/macro-ring';
import { Spacing } from '@/constants/theme';
import type { GoalKey, Goals, RingMode } from '@/db/settings';
import { useRingColors } from '@/hooks/use-ring-colors';
import type { Nutrition } from '@/types';

const RINGS: { key: GoalKey; label: string }[] = [
  { key: 'calories', label: 'Calories' },
  { key: 'fat', label: 'Fat' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'protein', label: 'Protein' },
  { key: 'fiber', label: 'Fiber' },
];

type Props = { consumed: Nutrition; goals: Goals; ringMode: RingMode };

/** Five goal rings for the day (eaten items only). */
export function DailySummary({ consumed, goals, ringMode }: Props) {
  const colors = useRingColors();
  const { width } = useWindowDimensions();
  const size = Math.min(68, Math.floor((width - Spacing.three * 2) / RINGS.length) - 4);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {RINGS.map(({ key, label }) => (
          <MacroRing
            key={key}
            label={label}
            value={consumed[key]}
            goal={goals[key]}
            color={colors[key]}
            mode={ringMode}
            size={size}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
