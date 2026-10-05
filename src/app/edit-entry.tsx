import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEntry, updateEntry } from '@/db/diary';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLabel } from '@/lib/dates';
import { scaleNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import { MEAL_SLOTS, type DiaryEntry, type MealSlot, type NutrientKey } from '@/types';

const NUTRIENT_ROWS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export default function EditEntryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [slot, setSlot] = useState<MealSlot>('Breakfast');
  const [menuOpen, setMenuOpen] = useState(false);
  const [servings, setServings] = useState('1');
  const [servingSize, setServingSize] = useState('1');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getEntry(db, Number(params.id));
      if (cancelled) return;
      if (!loaded) {
        router.back();
        return;
      }
      setEntry(loaded);
      setSlot(loaded.meal_slot);
      setServings(String(loaded.servings));
      setServingSize(String(loaded.serving_size));
    })();
    return () => {
      cancelled = true;
    };
  }, [db, params.id, router]);

  if (!entry) return <ThemedView style={styles.fill} />;

  const servingsValue = parseNumber(servings);
  const sizeValue = parseNumber(servingSize);
  const valid = servingsValue !== null && servingsValue > 0 && sizeValue !== null && sizeValue > 0;

  const perServing = valid ? scaleNutrition(entry, sizeValue / entry.serving_size) : null;
  const total = perServing && valid ? scaleNutrition(perServing, servingsValue) : null;

  const save = async () => {
    if (!valid) return;
    await updateEntry(db, entry, { meal_slot: slot, servings: servingsValue, serving_size: sizeValue });
    router.back();
  };

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: 'Edit entry' }} />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <ThemedText type="subtitle" style={styles.name}>
              {entry.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Logged {formatDateLabel(entry.date)}
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Meal</ThemedText>
            <Pressable onPress={() => setMenuOpen((open) => !open)} style={[styles.dropdown, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
              <ThemedText>{slot}</ThemedText>
              <ThemedText themeColor="textSecondary">{menuOpen ? '▲' : '▼'}</ThemedText>
            </Pressable>
            {menuOpen && (
              <ThemedView type="backgroundElement" style={[styles.menu, { borderColor: theme.backgroundSelected }]}>
                {MEAL_SLOTS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setSlot(s);
                      setMenuOpen(false);
                    }}
                    style={[styles.menuItem, s === slot && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText>{s}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.fill]}>
              <ThemedText type="smallBold">Servings</ThemedText>
              <ThemedTextInput value={servings} onChangeText={setServings} keyboardType="decimal-pad" />
            </View>
            <View style={[styles.field, styles.fill]}>
              <ThemedText type="smallBold">Serving size ({entry.serving_unit})</ThemedText>
              <ThemedTextInput value={servingSize} onChangeText={setServingSize} keyboardType="decimal-pad" />
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.table}>
            <View style={styles.tableRow}>
              <ThemedText type="smallBold" style={styles.labelCol}>
                Nutrition
              </ThemedText>
              <ThemedText type="smallBold" style={styles.numCol}>
                Per serving
              </ThemedText>
              <ThemedText type="smallBold" style={styles.numCol}>
                Total
              </ThemedText>
            </View>
            {NUTRIENT_ROWS.filter((r) => r.key !== 'sodium' || entry.sodium > 0).map((r) => (
              <View key={r.key} style={styles.tableRow}>
                <ThemedText style={styles.labelCol}>{r.label}</ThemedText>
                <ThemedText style={styles.numCol}>
                  {perServing ? fmt(perServing[r.key]) : '–'} {r.unit}
                </ThemedText>
                <ThemedText style={styles.numCol}>
                  {total ? fmt(total[r.key]) : '–'} {r.unit}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

          {!valid && (
            <ThemedText type="small" themeColor="textSecondary">
              Servings and serving size must both be greater than 0.
            </ThemedText>
          )}

          <Button title="Save changes" onPress={save} disabled={!valid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  name: { fontSize: 24, lineHeight: 32 },
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.three },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  menu: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + Spacing.one },
  table: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  tableRow: { flexDirection: 'row' },
  labelCol: { flex: 1.2 },
  numCol: { flex: 1, textAlign: 'right' },
});
