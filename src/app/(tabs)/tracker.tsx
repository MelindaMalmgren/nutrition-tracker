import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieTrend } from '@/components/calorie-trend';
import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getDayCalories, getDayStatuses } from '@/db/diary';
import { useCard } from '@/hooks/use-card';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { goalStatus } from '@/lib/calorie-series';
import { readableOn } from '@/lib/color';
import { todayISO } from '@/lib/dates';
import { caloriesForDate } from '@/lib/goals';
import { useSelectedDate } from '@/lib/selected-date';
import { currentStreak, monthSummary, type DayStatuses } from '@/lib/tracker';

export default function TrackerScreen() {
  const card = useCard();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const colors = useRingColors();
  const { setDate } = useSelectedDate();
  const settings = useSettings();

  const today = todayISO();
  const goalColor = (eaten: number, goal: number) => {
    const status = goalStatus(eaten, goal);
    return status === 'over' ? colors.calories : status === 'under' ? colors.carbs : colors.check;
  };
  const goalFor = useCallback((iso: string) => caloriesForDate(settings, iso), [settings]);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [statuses, setStatuses] = useState<DayStatuses>(new Map());
  const [calories, setCalories] = useState<Map<string, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getDayStatuses(db), getDayCalories(db)]).then(([nextStatuses, nextCalories]) => {
        if (cancelled) return;
        setStatuses(nextStatuses);
        setCalories(nextCalories);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const { elapsed, logged } = monthSummary(statuses, view.year, view.month, today);
  const streak = currentStreak(statuses, today);
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long' });

  const openDay = (iso: string) => {
    setDate(iso);
    router.navigate('/');
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Tracker</ThemedText>

          <CalorieTrend calories={calories} today={today} goalFor={goalFor} />

          <ThemedView type="backgroundElement" style={[styles.card, card]}>
            <ThemedText style={styles.big}>
              {elapsed > 0 ? `${logged} of ${elapsed} days logged` : 'Nothing to track yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {elapsed > 0 ? `So far in ${monthName}` : `${monthName} hasn't started yet`}
              {streak > 0 ? ` · ${streak}-day streak` : ''}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.card, card]}>
            <MonthCalendar
              year={view.year}
              month={view.month}
              onChangeMonth={(year, month) => setView({ year, month })}
              onSelect={openDay}
              renderDay={(iso, day) => {
                const status = statuses.get(iso);
                const pastEmpty = iso < today && !status;
                const fill = status === 'logged' ? goalColor(calories.get(iso) ?? 0, caloriesForDate(settings, iso)) : null;
                return (
                  <>
                    <View
                      style={[
                        styles.dayCircle,
                        fill && { backgroundColor: fill },
                        status === 'planned' && { borderColor: colors.check, borderWidth: 2 },
                        pastEmpty && styles.faded,
                      ]}>
                      <ThemedText style={[fill && { color: readableOn(fill), fontWeight: '700' }, iso === today && styles.todayText]}>
                        {day}
                      </ThemedText>
                    </View>
                    <View style={[styles.dot, iso === today && { backgroundColor: theme.accentText }]} />
                  </>
                );
              }}
            />
          </ThemedView>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.check }]} />
              <ThemedText type="small" themeColor="textSecondary">
                On target
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.carbs }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Under
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.calories }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Over
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { borderColor: colors.check, borderWidth: 2 }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Planned only
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, styles.faded, { borderColor: theme.textSecondary, borderWidth: 1 }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Past, nothing logged
              </ThemedText>
            </View>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Days are colored by calories eaten against that day's goal: within 10% is on target. Tap a day to open its log.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  card: { padding: Spacing.three, gap: Spacing.one },
  big: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.35 },
  todayText: { fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: Spacing.four, rowGap: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 16, height: 16, borderRadius: 8 },
});
