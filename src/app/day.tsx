import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { CheckCircle, mealCheckState, mealProgress } from '@/components/check-circle';
import { DailySummary } from '@/components/daily-summary';
import { DateSwitcher } from '@/components/date-switcher';
import { EntryRow } from '@/components/entry-row';
import { MacroLine } from '@/components/macro-line';
import { MealIcon } from '@/components/meal-icon';
import { NutrientsTable } from '@/components/nutrients-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UnderlineTabs } from '@/components/underline-tabs';
import { Spacing } from '@/constants/theme';
import { deleteEntry, getEntriesForDate, setEntryConsumed, setMealConsumed } from '@/db/diary';
import { useCard } from '@/hooks/use-card';
import { useRadius } from '@/hooks/use-radius';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { goalsForDate } from '@/lib/goals';
import { entryTotal, macroPercents, sumConsumed, sumNutrition, sumPlanned } from '@/lib/nutrition';
import { useSelectedDate } from '@/lib/selected-date';
import { MEAL_SLOTS, type DiaryEntry, type MealSlot } from '@/types';

const VIEWS = ['Daily Log', 'Nutrients'] as const;

export default function DayScreen() {
  const radius = useRadius();
  const card = useCard();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const settings = useSettings();
  const params = useLocalSearchParams<{ slot?: string }>();
  const { date, setDate } = useSelectedDate();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]>('Daily Log');
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
      <UnderlineTabs options={VIEWS} value={view} onChange={setView} />
      <DateSwitcher date={date} onChange={setDate} />

      {view === 'Nutrients' ? (
        <ScrollView contentContainerStyle={styles.nutrients}>
          <NutrientsTable
            consumed={sumConsumed(entries)}
            planned={sumPlanned(entries)}
            goals={goalsForDate(settings, date)}
          />
        </ScrollView>
      ) : (
        <>
          <DailySummary
            consumed={sumConsumed(entries)}
            planned={sumPlanned(entries)}
            goals={goalsForDate(settings, date)}
            ringMode={settings.ringMode}
          />

          <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
            {loaded &&
              MEAL_SLOTS.map((slot) => {
                const slotEntries = entries.filter((e) => e.meal_slot === slot);
                const slotTotal = sumNutrition(slotEntries.map(entryTotal));
                const percents = macroPercents(slotTotal);
                const incomplete = slotEntries.length > 0 && mealCheckState(slotEntries) !== 'checked';
                return (
                  <ThemedView
                    key={slot}
                    type="backgroundElement"
                    style={[
                      styles.card,
                      card,
                      slotEntries.length === 0 && { backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.textSecondary },
                      incomplete && { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.textSecondary },
                    ]}
                    onLayout={onSectionLayout(slot)}>
                    <View style={styles.sectionHeader}>
                      {slotEntries.length > 0 && (
                        <CheckCircle
                          state={mealCheckState(slotEntries)}
                          progress={mealProgress(slotEntries)}
                          onPress={() => toggleMeal(slot)}
                          label={`Mark all of ${slot} eaten`}
                        />
                      )}
                      <View style={slotEntries.length === 0 && styles.dimmed}>
                        <MealIcon slot={slot} size={32} />
                      </View>
                      <ThemedText style={[styles.sectionTitle, styles.fill]}>{slot}</ThemedText>
                      <ThemedText style={styles.sectionTitle}>{Math.round(slotTotal.calories)} cal</ThemedText>
                    </View>
                    {percents && (
                      <MacroLine carbs={percents.carbs} fat={percents.fat} protein={percents.protein} unit="%" />
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
                        style={[styles.logButton, { borderRadius: radius.button }, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="linkPrimary" style={styles.logText}>
                          {slotEntries.length > 0 ? 'Log more' : 'Log food'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                );
              })}
          </ScrollView>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  nutrients: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  card: { padding: Spacing.three, gap: Spacing.one },
  dimmed: { opacity: 0.45 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.one },
  logRow: { alignItems: 'flex-end', marginTop: Spacing.one },
  logButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, },
  logText: { fontWeight: '700' },
});
