import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { deleteEntry, getEntriesForDate } from '@/db/diary';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDateLabel, todayISO } from '@/lib/dates';
import { entryTotal, sumNutrition } from '@/lib/nutrition';
import { MEAL_SLOTS, type DiaryEntry, type Nutrition } from '@/types';

const round = (n: number) => Math.round(n);

function MacroLine({ n }: { n: Nutrition }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      P {round(n.protein)}g · C {round(n.carbs)}g · F {round(n.fat)}g
    </ThemedText>
  );
}

export default function DiaryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  const load = useCallback(async () => {
    setEntries(await getEntriesForDate(db, date));
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dayTotal = sumNutrition(entries.map(entryTotal));

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

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.dateRow}>
          <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12}>
            <ThemedText type="subtitle">‹</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.dateLabel}>
            {formatDateLabel(date)}
          </ThemedText>
          <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={12}>
            <ThemedText type="subtitle">›</ThemedText>
          </Pressable>
        </View>

        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="subtitle">{round(dayTotal.calories)} kcal</ThemedText>
          <MacroLine n={dayTotal} />
        </ThemedView>

        <ScrollView contentContainerStyle={styles.list}>
          {MEAL_SLOTS.map((slot) => {
            const slotEntries = entries.filter((e) => e.meal_slot === slot);
            const slotTotal = sumNutrition(slotEntries.map(entryTotal));
            return (
              <ThemedView key={slot} type="backgroundElement" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">{slot}</ThemedText>
                  <ThemedText type="smallBold">{round(slotTotal.calories)} kcal</ThemedText>
                </View>

                {slotEntries.map((entry) => {
                  const total = entryTotal(entry);
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => router.push({ pathname: '/edit-entry', params: { id: String(entry.id) } })}
                      onLongPress={() => confirmDelete(entry)}
                      style={styles.entry}>
                      <View style={styles.entryText}>
                        <ThemedText>{entry.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {entry.servings} × {entry.serving_label ?? `${entry.serving_size} ${entry.serving_unit}`}
                        </ThemedText>
                      </View>
                      <ThemedText>{round(total.calories)}</ThemedText>
                    </Pressable>
                  );
                })}

                {slotEntries.length > 0 && <MacroLine n={slotTotal} />}

                <Pressable
                  onPress={() => router.push({ pathname: '/add-food', params: { date, slot } })}
                  style={[styles.addButton, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="linkPrimary">+ Add food</ThemedText>
                </Pressable>
              </ThemedView>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  dateLabel: { fontSize: 22, lineHeight: 30 },
  summary: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  section: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryText: { flex: 1, paddingRight: Spacing.two },
  addButton: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
});
