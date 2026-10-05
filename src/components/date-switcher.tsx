import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CalendarModal } from '@/components/calendar-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addDays, formatDateLabel, todayISO } from '@/lib/dates';

type Props = { date: string; onChange: (date: string) => void };

/** Centered ‹ date ▾ › line; tap the date for a calendar. A Today shortcut appears at the right when away from today. */
export function DateSwitcher({ date, onChange }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = date === todayISO();

  return (
    <View style={styles.row}>
      <Pressable onPress={() => onChange(addDays(date, -1))} hitSlop={12} accessibilityLabel="Previous day">
        <ThemedText style={styles.arrow}>‹</ThemedText>
      </Pressable>

      <Pressable onPress={() => setCalendarOpen(true)} hitSlop={8} accessibilityLabel="Choose a date" style={styles.labelButton}>
        <ThemedText style={styles.label}>{formatDateLabel(date)}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.caret}>
          ▾
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => onChange(addDays(date, 1))} hitSlop={12} accessibilityLabel="Next day">
        <ThemedText style={styles.arrow}>›</ThemedText>
      </Pressable>

      {!isToday && (
        <Pressable onPress={() => onChange(todayISO())} hitSlop={8} style={styles.todayShortcut}>
          <ThemedText type="linkPrimary">Today</ThemedText>
        </Pressable>
      )}

      <CalendarModal
        visible={calendarOpen}
        selectedDate={date}
        onSelect={(picked) => {
          onChange(picked);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    height: 48,
  },
  arrow: { fontSize: 28, lineHeight: 32 },
  labelButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  label: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  caret: { fontSize: 12 },
  todayShortcut: { position: 'absolute', right: Spacing.three },
});
