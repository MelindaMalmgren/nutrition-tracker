import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AddMealPane } from '@/components/add-meal-pane';
import { AddSearchPane } from '@/components/add-search-pane';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { SegmentedControl } from '@/components/segmented-control';
import { ServingPanel } from '@/components/serving-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addFoodEntry } from '@/db/diary';
import { listFoods } from '@/db/foods';
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
      {mode === 'Food' && <AddSearchPane date={params.date} slot={slot} />}
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

  const load = useCallback(async () => setFoods(await listFoods(db, query, 'custom')), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const logFood = async (choice: { servings: number; serving_size: number; serving_label: string | null }) => {
    if (!selected) return;
    await addFoodEntry(db, selected, { date, meal_slot: slot, ...choice });
    router.back();
  };

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your custom foods" />

        {selected ? (
          <ServingPanel
            key={selected.id}
            food={selected}
            slot={slot}
            onCancel={() => setSelected(null)}
            onAdd={logFood}
          />
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
});
