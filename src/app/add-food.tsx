import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { AddMealPane } from '@/components/add-meal-pane';
import { AddSearchPane } from '@/components/add-search-pane';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { SegmentedControl } from '@/components/segmented-control';
import { ServingPanel } from '@/components/serving-panel';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addFoodEntry } from '@/db/diary';
import { listFoods } from '@/db/foods';
import { groupMostUsed } from '@/lib/most-used';
import { MEAL_SLOTS, type Food, type MealSlot } from '@/types';

const MODES = ['Food', 'Meals', 'Recipes', 'Custom'] as const;

const SAVED_COPY = {
  custom: {
    search: 'Search your custom foods',
    create: '+ Create custom food',
    createRoute: '/custom-food',
    empty: 'No custom foods yet. Create one to get started.',
    noMatch: 'No matching foods.',
  },
  recipe: {
    search: 'Search your recipes',
    create: '+ Create recipe',
    createRoute: '/recipe',
    empty: 'No recipes yet. Create one to get started.',
    noMatch: 'No matching recipes.',
  },
} as const;

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
      {mode === 'Recipes' && <AddSavedPane kind="recipe" date={params.date} slot={slot} />}
      {mode === 'Custom' && <AddSavedPane kind="custom" date={params.date} slot={slot} />}
    </ThemedView>
  );
}

function AddSavedPane({ kind, date, slot }: { kind: 'custom' | 'recipe'; date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const copy = SAVED_COPY[kind];

  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<(Food & { use_count: number })[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);

  const load = useCallback(async () => setFoods(await listFoods(db, query, kind, true)), [db, query, kind]);

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
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder={copy.search} />

        {selected ? (
          <ServingPanel
            key={selected.id}
            food={selected}
            actionLabel={`Add to ${slot}`}
            onCancel={() => setSelected(null)}
            onAdd={logFood}
          />
        ) : (
          <Button title={copy.create} variant="secondary" onPress={() => router.push(copy.createRoute)} />
        )}
      </View>

      <SectionList
        sections={groupMostUsed(foods, query.trim() !== '', kind === 'recipe' ? 'All recipes' : 'All foods')}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.title ? <SectionHeader title={section.title} /> : null
        }
        renderItem={({ item }) => <FoodRow food={item} onPress={() => setSelected(item)} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            {query ? copy.noMatch : copy.empty}
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
