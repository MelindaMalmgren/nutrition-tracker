import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getDatesWithEntries } from '@/db/diary';
import { useTheme } from '@/hooks/use-theme';
import { toISODate, todayISO } from '@/lib/dates';

type Props = { visible: boolean; selectedDate: string; onSelect: (date: string) => void; onClose: () => void };

function parseISO(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  return { year, month: month - 1 };
}

/** A month picker for jumping to any date. Days that have diary entries get a dot. */
export function CalendarModal({ visible, selectedDate, onSelect, onClose }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [view, setView] = useState(() => parseISO(selectedDate));
  const [marked, setMarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setView(parseISO(selectedDate));
  }, [visible, selectedDate]);

  const first = toISODate(new Date(view.year, view.month, 1));
  const last = toISODate(new Date(view.year, view.month + 1, 0));

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

  const today = todayISO();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close calendar" />
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
          <MonthCalendar
            year={view.year}
            month={view.month}
            onChangeMonth={(year, month) => setView({ year, month })}
            onSelect={onSelect}
            renderDay={(iso, day) => {
              const selected = iso === selectedDate;
              return (
                <>
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.daySelected,
                      !selected && iso === today && { borderColor: theme.textSecondary, borderWidth: 1 },
                    ]}>
                    <ThemedText style={selected ? styles.daySelectedText : undefined}>{day}</ThemedText>
                  </View>
                  <View
                    style={[styles.dot, marked.has(iso) && { backgroundColor: selected ? 'transparent' : '#3c87f7' }]}
                  />
                </>
              );
            }}
          />

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
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#3c87f7' },
  daySelectedText: { color: '#ffffff', fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.two },
});
