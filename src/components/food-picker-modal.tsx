import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getFood, listFoods, upsertExternalFood } from '@/db/foods';
import { lookupBarcode } from '@/lib/barcode-lookup';
import { describeError } from '@/lib/lookup-errors';
import { searchUsda } from '@/services/usda';
import type { Food, LookupFood } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (food: Food) => void;
  title?: string;
  /** Recipes can't contain themselves, so the recipe editor leaves them out. */
  includeRecipes?: boolean;
};

type ListItem =
  | { type: 'header'; title: string }
  | { type: 'saved'; food: Food }
  | { type: 'usda'; food: LookupFood }
  | { type: 'loading' }
  | { type: 'note'; text: string };

/**
 * One search over your saved foods (filtered as you type) and USDA (when you press Search), plus barcode scanning.
 * Anything picked from USDA or a scan is saved to your foods first.
 */
export function FoodPickerModal({ visible, onClose, onSelect, title = 'Add a food', includeRecipes = true }: Props) {
  const db = useSQLiteContext();
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<Food[]>([]);
  const [results, setResults] = useState<LookupFood[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort();
      return;
    }
    setQuery('');
    setResults(null);
    setError(null);
    setScanning(false);
    setLoading(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    listFoods(db, query).then((rows) => {
      if (!cancelled) setSaved(includeRecipes ? rows : rows.filter((f) => f.source !== 'recipe'));
    });
    return () => {
      cancelled = true;
    };
  }, [db, visible, query, includeRecipes]);

  const choose = (food: Food) => {
    onSelect(food);
    onClose();
  };

  const chooseLookup = async (lookup: LookupFood) => {
    const food = await getFood(db, await upsertExternalFood(db, lookup));
    if (food) choose(food);
  };

  const startRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
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
      if (food) await chooseLookup(food);
      else setError(`No product found for barcode ${barcode}. Try searching by name.`);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(describeError(e));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const changeQuery = (text: string) => {
    setQuery(text);
    setResults(null); // results belong to the previous search text
    setError(null);
  };

  const items: ListItem[] = [];
  if (saved.length > 0) {
    items.push({ type: 'header', title: query.trim() ? 'Your foods' : 'Saved foods' });
    saved.forEach((food) => items.push({ type: 'saved', food }));
  }
  if (loading || results || error) {
    items.push({ type: 'header', title: 'USDA results' });
    if (loading) items.push({ type: 'loading' });
    else if (error) items.push({ type: 'note', text: error });
    else if (results) {
      // Hide USDA results you already have saved; they're listed above.
      const fresh = results.filter(
        (r) => !saved.some((s) => s.source === r.source && s.external_id === r.external_id),
      );
      if (fresh.length === 0) items.push({ type: 'note', text: 'No new results. Try different words.' });
      fresh.forEach((food) => items.push({ type: 'usda', food }));
    }
  }
  if (items.length === 0) {
    items.push({ type: 'note', text: 'Search for a food by name, or scan its barcode.' });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.fill}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="linkPrimary">Close</ThemedText>
            </Pressable>
          </View>

          {scanning ? (
            <BarcodeScanner onScanned={handleScan} onCancel={() => setScanning(false)} />
          ) : (
            <>
              <View style={styles.controls}>
                <View style={styles.searchRow}>
                  <ThemedTextInput
                    style={styles.fill}
                    value={query}
                    onChangeText={changeQuery}
                    onSubmitEditing={search}
                    returnKeyType="search"
                    placeholder="Search saved foods and USDA"
                  />
                  <View>
                    <Button title="Search" onPress={search} disabled={!query.trim() || loading} />
                  </View>
                </View>
                <Button title="Scan barcode" variant="secondary" onPress={() => setScanning(true)} disabled={loading} />
              </View>

              <FlatList
                data={items}
                keyExtractor={(item, i) =>
                  item.type === 'saved'
                    ? `saved-${item.food.id}`
                    : item.type === 'usda'
                      ? `usda-${item.food.source}-${item.food.external_id}`
                      : `${item.type}-${i}`
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  switch (item.type) {
                    case 'header':
                      return (
                        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
                          {item.title}
                        </ThemedText>
                      );
                    case 'saved':
                      return <FoodRow food={item.food} onPress={() => choose(item.food)} />;
                    case 'usda':
                      return <FoodRow food={item.food} onPress={() => chooseLookup(item.food)} />;
                    case 'loading':
                      return <ActivityIndicator style={styles.status} />;
                    case 'note':
                      return <ThemedText themeColor="textSecondary">{item.text}</ThemedText>;
                  }
                }}
              />
            </>
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  title: { fontSize: 22, lineHeight: 30 },
  controls: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.three },
  searchRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  sectionHeader: { paddingTop: Spacing.two },
  status: { marginTop: Spacing.three },
});
