import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailySummary } from '@/components/daily-summary';
import { DateSwitcher } from '@/components/date-switcher';
import { MealSummaryCard } from '@/components/meal-summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getEntriesForDate, setMealConsumed } from '@/db/diary';
import { useSettings } from '@/hooks/use-settings';
import { goalsForDate } from '@/lib/goals';
import { sumConsumed, sumPlanned } from '@/lib/nutrition';
import { useSelectedDate } from '@/lib/selected-date';
import { MEAL_SLOTS, type DiaryEntry, type MealSlot } from '@/types';

export default function DiaryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const settings = useSettings();
  const { date, setDate } = useSelectedDate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getEntriesForDate(db, date).then((rows) => {
        if (!cancelled) setEntries(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [db, date]),
  );

  const openDay = (slot?: MealSlot) => router.push({ pathname: '/day', params: slot ? { slot } : {} });

  // If everything in the meal is eaten, un-eat it all; otherwise mark it all eaten.
  const toggleMeal = (slot: MealSlot) => {
    const mealEntries = entries.filter((e) => e.meal_slot === slot);
    const next = !mealEntries.every((e) => e.consumed === 1);
    setEntries((current) => current.map((e) => (e.meal_slot === slot ? { ...e, consumed: next ? 1 : 0 } : e)));
    setMealConsumed(db, date, slot, next);
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <DateSwitcher date={date} onChange={setDate} />
        <DailySummary
          consumed={sumConsumed(entries)}
          planned={sumPlanned(entries)}
          goals={goalsForDate(settings, date)}
          ringMode={settings.ringMode}
        />

        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.mealsHeader}>
            <ThemedText type="subtitle" style={styles.mealsTitle}>
              Meals
            </ThemedText>
            <Pressable onPress={() => openDay()} hitSlop={8}>
              <ThemedText type="linkPrimary">View diary</ThemedText>
            </Pressable>
          </View>

          {MEAL_SLOTS.map((slot) => (
            <MealSummaryCard
              key={slot}
              slot={slot}
              entries={entries.filter((e) => e.meal_slot === slot)}
              onOpen={() => openDay(slot)}
              onLog={() => router.push({ pathname: '/add-food', params: { date, slot } })}
              onToggleAll={() => toggleMeal(slot)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: BottomTabInset + Spacing.four },
  mealsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mealsTitle: { fontSize: 22, lineHeight: 30 },
});
