import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addMealToDiary, listMeals, type MealSummary } from '@/db/meals';
import { groupMostUsed } from '@/lib/most-used';
import { parseNumber } from '@/lib/parse';
import type { MealSlot } from '@/types';

export function AddMealPane({ date, slot }: { date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selected, setSelected] = useState<MealSummary | null>(null);
  const [multiplier, setMultiplier] = useState('1');

  const load = useCallback(async () => setMeals(await listMeals(db, query)), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setMultiplier('1');
  }, [selected]);

  const multiplierValue = parseNumber(multiplier);
  const valid = multiplierValue !== null && multiplierValue > 0;

  const logMeal = async () => {
    if (!selected || !valid) return;
    await addMealToDiary(db, selected.id, date, slot, multiplierValue);
    router.back();
  };

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your meals" />

        {selected ? (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <ThemedText type="smallBold">{selected.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selected.item_count} item{selected.item_count === 1 ? '' : 's'} · {Math.round(selected.calories)} kcal
            </ThemedText>
            <View style={styles.servingsRow}>
              <ThemedText style={styles.fill}>Servings of this meal</ThemedText>
              <ThemedTextInput
                style={styles.servingsInput}
                value={multiplier}
                onChangeText={setMultiplier}
                keyboardType="decimal-pad"
              />
            </View>
            {valid && (
              <ThemedText type="small" themeColor="textSecondary">
                {Math.round(selected.calories * multiplierValue)} kcal total, logged as separate entries
              </ThemedText>
            )}
            <View style={styles.row}>
              <View style={styles.fill}>
                <Button title="Cancel" variant="secondary" onPress={() => setSelected(null)} />
              </View>
              <View style={styles.fill}>
                <Button title={`Add to ${slot}`} onPress={logMeal} disabled={!valid} />
              </View>
            </View>
          </ThemedView>
        ) : (
          <Button title="+ Create meal" variant="secondary" onPress={() => router.push('/meal')} />
        )}
      </View>

      <SectionList
        sections={groupMostUsed(meals, query.trim() !== '', 'All meals')}
        keyExtractor={(m) => String(m.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)} style={styles.mealRow}>
            <View style={styles.fill}>
              <ThemedText>{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.item_count} item{item.item_count === 1 ? '' : 's'}
              </ThemedText>
            </View>
            <ThemedText>{Math.round(item.calories)} kcal</ThemedText>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            {query ? 'No matching meals.' : 'No meals yet. Create one to get started.'}
          </ThemedText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  sectionTitle: { paddingTop: Spacing.two, paddingBottom: Spacing.one },
  panel: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  servingsInput: { width: 100, textAlign: 'right' },
  row: { flexDirection: 'row', gap: Spacing.two },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two },
});
