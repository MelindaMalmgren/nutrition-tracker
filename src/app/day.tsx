import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { CheckCircle, mealCheckState } from '@/components/check-circle';
import { DailySummary } from '@/components/daily-summary';
import { DateSwitcher } from '@/components/date-switcher';
import { EntryRow } from '@/components/entry-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteEntry, getEntriesForDate, setEntryConsumed, setMealConsumed } from '@/db/diary';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { macroPercents, sumConsumed, sumPlanned } from '@/lib/nutrition';
import { useSelectedDate } from '@/lib/selected-date';
import { MEAL_SLOTS, type DiaryEntry, type MealSlot } from '@/types';

export default function DayScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const settings = useSettings();
  const params = useLocalSearchParams<{ slot?: string }>();
  const { date, setDate } = useSelectedDate();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToSlot = useRef(false);

  const load = useCallback(async () => {
    setEntries(await getEntriesForDate(db, date));
    setLoaded(true);
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmDelete = (entry: DiaryEntry) =>
    Alert.alert('Remove entry', `Remove "${entry.name}" from ${entry.meal_slot}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entry.id);
          load();
        },
      },
    ]);

  // Updates the screen first so the rings move immediately, then saves.
  const toggle = (entry: DiaryEntry) => {
    const next = entry.consumed !== 1;
    setEntries((current) => current.map((e) => (e.id === entry.id ? { ...e, consumed: next ? 1 : 0 } : e)));
    setEntryConsumed(db, entry.id, next);
  };

  const toggleMeal = (slot: MealSlot) => {
    const next = !entries.filter((e) => e.meal_slot === slot).every((e) => e.consumed === 1);
    setEntries((current) => current.map((e) => (e.meal_slot === slot ? { ...e, consumed: next ? 1 : 0 } : e)));
    setMealConsumed(db, date, slot, next);
  };

  // Sections only render once data is loaded, so their measured positions are final when we scroll.
  const onSectionLayout = (slot: string) => (e: LayoutChangeEvent) => {
    if (scrolledToSlot.current || slot !== params.slot) return;
    scrolledToSlot.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(e.nativeEvent.layout.y - Spacing.two, 0), animated: false });
  };

  return (
    <ThemedView style={styles.fill}>
      <DateSwitcher date={date} onChange={setDate} />
      <DailySummary consumed={sumConsumed(entries)} planned={sumPlanned(entries)} settings={settings} />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {loaded &&
          MEAL_SLOTS.map((slot) => {
            const slotEntries = entries.filter((e) => e.meal_slot === slot);
            const slotEaten = sumConsumed(slotEntries);
            const percents = macroPercents(slotEaten);
            return (
              <ThemedView key={slot} type="backgroundElement" style={styles.card} onLayout={onSectionLayout(slot)}>
                <View style={styles.sectionHeader}>
                  {slotEntries.length > 0 && (
                    <CheckCircle
                      state={mealCheckState(slotEntries)}
                      onPress={() => toggleMeal(slot)}
                      label={`Mark all of ${slot} eaten`}
                    />
                  )}
                  <ThemedText style={[styles.sectionTitle, styles.fill]}>{slot}</ThemedText>
                  <ThemedText style={styles.sectionTitle}>{Math.round(slotEaten.calories)} cal</ThemedText>
                </View>
                {percents && (
                  <ThemedText type="small" themeColor="textSecondary">
                    C {percents.carbs}% · F {percents.fat}% · P {percents.protein}%
                  </ThemedText>
                )}

                {slotEntries.length > 0 && <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />}
                {slotEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onPress={() => router.push({ pathname: '/edit-entry', params: { id: String(entry.id) } })}
                    onLongPress={() => confirmDelete(entry)}
                    onToggle={() => toggle(entry)}
                  />
                ))}

                <View style={styles.logRow}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/add-food', params: { date, slot } })}
                    style={[styles.logButton, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="linkPrimary" style={styles.logText}>
                      {slotEntries.length > 0 ? 'Log more' : 'Log food'}
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            );
          })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.one },
  logRow: { alignItems: 'flex-end', marginTop: Spacing.one },
  logButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 16 },
  logText: { fontWeight: '700' },
});
