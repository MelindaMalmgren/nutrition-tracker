import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addFoodEntry } from '@/db/diary';
import { getFood, listFoods, upsertExternalFood } from '@/db/foods';
import { parseNumber } from '@/lib/parse';
import { searchUsda, USDA_KEY_MISSING, type UsdaFood } from '@/services/usda';
import type { MealSlot } from '@/types';

export function AddUsdaPane({ date, slot }: { date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UsdaFood[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UsdaFood | null>(null);
  const [servings, setServings] = useState('1');
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState<UsdaFood[]>([]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    listFoods(db, '', 'usda').then((foods) =>
      setSaved(foods.map((f) => ({ ...f, external_id: f.external_id ?? String(f.id) }))),
    );
  }, [db]);

  useEffect(() => {
    setServings('1');
  }, [selected]);

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      setResults(await searchUsda(text, controller.signal));
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : '';
      setResults(null);
      setError(
        message === USDA_KEY_MISSING
          ? 'No USDA API key found. Add EXPO_PUBLIC_USDA_API_KEY to .env, then restart Expo with: npx expo start -c'
          : message.startsWith('USDA')
            ? message
            : 'Could not reach USDA. Check your connection and try again.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const servingsValue = parseNumber(servings);
  const validServings = servingsValue !== null && servingsValue > 0;

  const logFood = async () => {
    if (!selected || !validServings || saving) return;
    setSaving(true);
    try {
      const id = await upsertExternalFood(db, 'usda', selected);
      const food = await getFood(db, id);
      if (!food) return;
      await addFoodEntry(db, food, { date, meal_slot: slot, servings: servingsValue });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <ThemedTextInput
            style={styles.fill}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Search foods"
          />
          <View>
            <Button title="Search" onPress={search} disabled={!query.trim() || loading} />
          </View>
        </View>

        {selected && (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <ThemedText type="smallBold">{selected.name}</ThemedText>
            {selected.brand && (
              <ThemedText type="small" themeColor="textSecondary">
                {selected.brand}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Per {selected.serving_size} {selected.serving_unit}: {Math.round(selected.calories)} kcal · P{' '}
              {Math.round(selected.protein)}g · C {Math.round(selected.carbs)}g · F {Math.round(selected.fat)}g
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
                <Button title={`Add to ${slot}`} onPress={logFood} disabled={!validServings || saving} />
              </View>
            </View>
          </ThemedView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.status} />
      ) : (
        <FlatList
          data={results ?? saved}
          ListHeaderComponent={
            results === null && saved.length > 0 ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                Previously added
              </ThemedText>
            ) : null
          }
          keyExtractor={(f) => f.external_id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FoodRow food={item} onPress={() => setSelected(item)} />}
          ListEmptyComponent={
            <ThemedText themeColor={error ? undefined : 'textSecondary'}>
              {error ?? (results ? 'No results. Try different words.' : 'Search for a food by name.')}
            </ThemedText>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: Spacing.three, gap: Spacing.three },
  searchRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  status: { marginTop: Spacing.four },
  panel: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  servingsInput: { width: 100, textAlign: 'right' },
  row: { flexDirection: 'row', gap: Spacing.two },
});
