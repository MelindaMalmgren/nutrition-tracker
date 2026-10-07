import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { toISODate } from '@/lib/dates';

type Props = {
  year: number;
  /** 0 = January. */
  month: number;
  onChangeMonth: (year: number, month: number) => void;
  onSelect: (iso: string) => void;
  /** Draws the inside of one day cell; the cell itself handles layout and taps. */
  renderDay: (iso: string, day: number) => ReactNode;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A month grid (weeks start on Sunday) with previous/next month arrows. Callers decide how each day looks. */
export function MonthCalendar({ year, month, onChangeMonth, onSelect, renderDay }: Props) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const title = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <ThemedText style={styles.arrow}>‹</ThemedText>
        </Pressable>
        <ThemedText style={styles.monthTitle}>{title}</ThemedText>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12} accessibilityLabel="Next month">
          <ThemedText style={styles.arrow}>›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekday}>
            {d}
          </ThemedText>
        ))}
      </View>

      <View>
        {weeks.map((week, w) => (
          <View key={w} style={styles.weekRow}>
            {week.map((day, i) => {
              if (day === null) return <View key={i} style={styles.cell} />;
              const iso = toISODate(new Date(year, month, day));
              return (
                <Pressable key={i} style={styles.cell} onPress={() => onSelect(iso)}>
                  {renderDay(iso, day)}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  arrow: { fontSize: 28, lineHeight: 32, paddingHorizontal: Spacing.two },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
});
