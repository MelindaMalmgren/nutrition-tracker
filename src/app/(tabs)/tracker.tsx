import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getDayStatuses } from '@/db/diary';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { useSelectedDate } from '@/lib/selected-date';
import { currentStreak, monthSummary, type DayStatuses } from '@/lib/tracker';

export default function TrackerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const colors = useRingColors();
  const { setDate } = useSelectedDate();

  const today = todayISO();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [statuses, setStatuses] = useState<DayStatuses>(new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getDayStatuses(db).then((result) => {
        if (!cancelled) setStatuses(result);
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

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.big}>
              {elapsed > 0 ? `${logged} of ${elapsed} days logged` : 'Nothing to track yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {elapsed > 0 ? `So far in ${monthName}` : `${monthName} hasn't started yet`}
              {streak > 0 ? ` · ${streak}-day streak` : ''}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <MonthCalendar
              year={view.year}
              month={view.month}
              onChangeMonth={(year, month) => setView({ year, month })}
              onSelect={openDay}
              renderDay={(iso, day) => {
                const status = statuses.get(iso);
                const pastEmpty = iso < today && !status;
                return (
                  <>
                    <View
                      style={[
                        styles.dayCircle,
                        status === 'logged' && { backgroundColor: colors.check },
                        status === 'planned' && { borderColor: colors.check, borderWidth: 2 },
                        pastEmpty && styles.faded,
                      ]}>
                      <ThemedText style={[status === 'logged' && styles.loggedText, iso === today && styles.todayText]}>
                        {day}
                      </ThemedText>
                    </View>
                    <View style={[styles.dot, iso === today && { backgroundColor: '#3c87f7' }]} />
                  </>
                );
              }}
            />
          </ThemedView>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.check }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Logged
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
            Tap a day to open its log.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  big: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.35 },
  loggedText: { color: '#ffffff', fontWeight: '700' },
  todayText: { fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  legend: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 16, height: 16, borderRadius: 8 },
});
