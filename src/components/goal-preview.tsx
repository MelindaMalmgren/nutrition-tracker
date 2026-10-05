import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Goals, MacroSplit } from '@/db/settings';

type Props = { goals: Goals; split: MacroSplit };

/** The macro goals that follow from a calorie goal, shown read-only. */
export function GoalPreview({ goals, split }: Props) {
  const rows = [
    { label: 'Protein', value: `${goals.protein} g`, percent: `${split.protein}%` },
    { label: 'Fat', value: `${goals.fat} g`, percent: `${split.fat}%` },
    { label: 'Carbs', value: `${goals.carbs} g`, percent: `${split.carbs}%` },
    { label: 'Fiber', value: `${goals.fiber} g`, percent: '' },
    { label: 'Sugar', value: goals.sugar > 0 ? `${goals.sugar} g` : 'No goal', percent: '' },
    { label: 'Sodium', value: goals.sodium > 0 ? `${goals.sodium} mg` : 'No goal', percent: '' },
  ];
  return (
    <View style={styles.wrap}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            {row.label}
          </ThemedText>
          <ThemedText style={styles.value}>{row.value}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.percent}>
            {row.percent}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
  value: { width: 80, textAlign: 'right', fontWeight: '600' },
  percent: { width: 56, textAlign: 'right' },
});
