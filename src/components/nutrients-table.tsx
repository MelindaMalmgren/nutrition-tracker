import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Goals } from '@/db/settings';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';
import { NUTRIENTS } from '@/lib/nutrients';
import type { Nutrition } from '@/types';

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 1 : 0 });

type Props = { consumed: Nutrition; planned: Nutrition; goals: Goals };

/** Every nutrient for the day (eaten items only). Nutrients with a goal also show the goal, what's left, and a bar. */
export function NutrientsTable({ consumed, planned, goals }: Props) {
  const theme = useTheme();
  const colors = useRingColors();

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.labelCol} />
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.numCol}>
          Eaten
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.numCol}>
          Goal
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.leftCol}>
          Left
        </ThemedText>
      </View>

      {NUTRIENTS.map((n) => {
        const value = consumed[n.key];
        const goal = n.goal && goals[n.goal] > 0 ? goals[n.goal] : null;
        const left = goal === null ? null : goal - value;
        const over = left !== null && left < 0;
        const barColor = over || !n.goal ? colors.over : colors[n.goal];
        return (
          <View key={n.key} style={[styles.row, { borderTopColor: theme.backgroundSelected }]}>
            <View style={styles.line}>
              <ThemedText style={[styles.labelCol, n.indent && styles.indent]}>{n.label}</ThemedText>
              <ThemedText style={styles.numCol}>{fmt(value)}</ThemedText>
              <ThemedText style={styles.numCol} themeColor="textSecondary">
                {goal === null ? '' : fmt(goal)}
              </ThemedText>
              <ThemedText
                style={[styles.leftCol, over && { color: colors.over }]}
                themeColor={over ? undefined : 'textSecondary'}>
                {left === null ? n.unit : `${fmt(Math.abs(left))} ${n.unit}${over ? ' over' : ''}`}
              </ThemedText>
            </View>
            {goal !== null && (
              <View style={[styles.track, { backgroundColor: colors.track }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: barColor, width: `${Math.min(value / goal, 1) * 100}%` },
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}

      {planned.calories > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.planned}>
          +{fmt(planned.calories)} kcal planned, not counted above
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingVertical: Spacing.two },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.three, gap: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center' },
  labelCol: { flex: 1 },
  indent: { paddingLeft: Spacing.three },
  numCol: { width: 64, textAlign: 'right' },
  leftCol: { width: 104, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  planned: { textAlign: 'center', paddingTop: Spacing.three },
});
