import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ServingPanel } from '@/components/serving-panel';
import { Spacing } from '@/constants/theme';
import { addFoodEntry } from '@/db/diary';
import { getFood, listFoods, upsertExternalFood } from '@/db/foods';
import { lookupBarcode, savedToLookup } from '@/lib/barcode-lookup';
import { describeError } from '@/lib/lookup-errors';
import { fetchUsdaPortions, searchUsda } from '@/services/usda';
import type { LookupFood, MealSlot } from '@/types';

export function AddSearchPane({ date, slot }: { date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LookupFood[] | null>(null);
  const [saved, setSaved] = useState<LookupFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LookupFood | null>(null);
  const [loadingMeasures, setLoadingMeasures] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    listFoods(db).then((foods) =>
      setSaved(foods.map(savedToLookup).filter((f): f is LookupFood => f !== null)),
    );
  }, [db]);

  // Household measures aren't in USDA search results; fetch them for non-branded foods (no barcode) once.
  const selectFood = (food: LookupFood) => {
    setSelected(food);
    setLoadingMeasures(false);
    if (food.source !== 'usda' || food.portions !== undefined || food.barcode) return;

    setLoadingMeasures(true);
    fetchUsdaPortions(food.external_id)
      .then((portions) =>
        setSelected((current) => (current?.external_id === food.external_id ? { ...current, portions } : current)),
      )
      .catch(() => {})
      .finally(() => setLoadingMeasures(false));
  };

  const startRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setSelected(null);
    return controller;
  };

  const search = async () => {
    const text = query.trim();
    if (!text) return;
    const controller = startRequest();
    try {
      setResults(await searchUsda(text, controller.signal));
    } catch (e) {
      if (controller.signal.aborted) return;
      setResults(null);
      setError(describeError(e));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleScan = async (barcode: string) => {
    setScanning(false);
    const controller = startRequest();
    try {
      const food = await lookupBarcode(db, barcode, controller.signal);
      if (food) selectFood(food);
      else setError(`No product found for barcode ${barcode}. Try searching by name, or create a custom food.`);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(describeError(e));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const logFood = async (choice: { servings: number; serving_size: number; serving_label: string | null }) => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const id = await upsertExternalFood(db, selected);
      const food = await getFood(db, id);
      if (!food) return;
      await addFoodEntry(db, food, { date, meal_slot: slot, ...choice });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (scanning) return <BarcodeScanner onScanned={handleScan} onCancel={() => setScanning(false)} />;

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
        <Button title="Scan barcode" variant="secondary" onPress={() => setScanning(true)} disabled={loading} />

        {error && <ThemedText>{error}</ThemedText>}

        {selected && (
          <ServingPanel
            key={`${selected.source}-${selected.external_id}`}
            food={selected}
            portions={selected.portions}
            loadingMeasures={loadingMeasures}
            actionLabel={`Add to ${slot}`}
            busy={saving}
            onCancel={() => setSelected(null)}
            onAdd={logFood}
          />
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
          keyExtractor={(f) => `${f.source}-${f.external_id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FoodRow food={item} onPress={() => selectFood(item)} />}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              {results ? 'No results. Try different words.' : 'Search for a food by name, or scan its barcode.'}
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
});
