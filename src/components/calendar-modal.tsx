import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getDatesWithEntries } from '@/db/diary';
import { useTheme } from '@/hooks/use-theme';
import { toISODate, todayISO } from '@/lib/dates';

type Props = { visible: boolean; selectedDate: string; onSelect: (date: string) => void; onClose: () => void };

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseISO(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: month - 1, day };
}

/** A month grid for jumping to any date. Days that have diary entries get a dot. */
export function CalendarModal({ visible, selectedDate, onSelect, onClose }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [view, setView] = useState(() => parseISO(selectedDate));
  const [marked, setMarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setView(parseISO(selectedDate));
  }, [visible, selectedDate]);

  const { year, month } = view;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const first = toISODate(new Date(year, month, 1));
  const last = toISODate(new Date(year, month, daysInMonth));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getDatesWithEntries(db, first, last).then((dates) => {
      if (!cancelled) setMarked(dates);
    });
    return () => {
      cancelled = true;
    };
  }, [db, visible, first, last]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth(), day: 1 });
  };

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayISO();
  const title = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close calendar" />
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
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

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={styles.cell} />;
              const iso = toISODate(new Date(year, month, day));
              const selected = iso === selectedDate;
              return (
                <Pressable key={i} style={styles.cell} onPress={() => onSelect(iso)}>
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.daySelected,
                      !selected && iso === today && { borderColor: theme.textSecondary, borderWidth: 1 },
                    ]}>
                    <ThemedText style={selected ? styles.daySelectedText : undefined}>{day}</ThemedText>
                  </View>
                  <View style={[styles.dot, marked.has(iso) && { backgroundColor: selected ? 'transparent' : '#3c87f7' }]} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => onSelect(today)} hitSlop={8}>
              <ThemedText type="linkPrimary">Today</ThemedText>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText type="linkPrimary">Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: Spacing.three, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  arrow: { fontSize: 28, lineHeight: 32, paddingHorizontal: Spacing.two },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#3c87f7' },
  daySelectedText: { color: '#ffffff', fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.two },
});
