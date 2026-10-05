import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AddMealPane } from '@/components/add-meal-pane';
import { AddUsdaPane } from '@/components/add-usda-pane';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addFoodEntry } from '@/db/diary';
import { listFoods } from '@/db/foods';
import { parseNumber } from '@/lib/parse';
import { MEAL_SLOTS, type Food, type MealSlot } from '@/types';

const MODES = ['Food', 'Meals', 'Custom'] as const;

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date: string; slot: string }>();
  const slot = (MEAL_SLOTS as readonly string[]).includes(params.slot) ? (params.slot as MealSlot) : 'Breakfast';
  const [mode, setMode] = useState<(typeof MODES)[number]>('Food');

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: `Add to ${slot}` }} />
      <View style={styles.modeRow}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
      </View>
      {mode === 'Food' && <AddUsdaPane date={params.date} slot={slot} />}
      {mode === 'Meals' && <AddMealPane date={params.date} slot={slot} />}
      {mode === 'Custom' && <AddCustomPane date={params.date} slot={slot} />}
    </ThemedView>
  );
}

function AddCustomPane({ date, slot }: { date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState('1');

  const load = useCallback(async () => setFoods(await listFoods(db, query, 'custom')), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setServings('1');
  }, [selected]);

  const servingsValue = parseNumber(servings);
  const validServings = servingsValue !== null && servingsValue > 0;

  const logFood = async () => {
    if (!selected || !validServings) return;
    await addFoodEntry(db, selected, { date, meal_slot: slot, servings: servingsValue });
    router.back();
  };

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your custom foods" />

        {selected ? (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <ThemedText type="smallBold">{selected.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Per {selected.serving_size} {selected.serving_unit}: {Math.round(selected.calories)} kcal
            </ThemedText>
            <View style={styles.servingsRow}>
              <ThemedText style={styles.fill}>Servings</ThemedText>
              <ThemedTextInput
                style={styles.servingsInput}
                value={servings}
                onChangeText={setServings}
                keyboardType="decimal-pad"
              />
            </View>
            {validServings && (
              <ThemedText type="small" themeColor="textSecondary">
                {Math.round(selected.calories * servingsValue)} kcal total
              </ThemedText>
            )}
            <View style={styles.row}>
              <View style={styles.fill}>
                <Button title="Cancel" variant="secondary" onPress={() => setSelected(null)} />
              </View>
              <View style={styles.fill}>
                <Button title={`Add to ${slot}`} onPress={logFood} disabled={!validServings} />
              </View>
            </View>
          </ThemedView>
        ) : (
          <Button title="+ Create custom food" variant="secondary" onPress={() => router.push('/custom-food')} />
        )}
      </View>

      <FlatList
        data={foods}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <FoodRow food={item} onPress={() => setSelected(item)} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            {query ? 'No matching foods.' : 'No custom foods yet. Create one to get started.'}
          </ThemedText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  modeRow: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  top: { padding: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  panel: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  servingsInput: { width: 100, textAlign: 'right' },
  row: { flexDirection: 'row', gap: Spacing.two },
});
