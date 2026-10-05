import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FoodPickerModal } from '@/components/food-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteMeal, getMeal, getMealItems, saveMeal } from '@/db/meals';
import { scaleNutrition, sumNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import type { Food } from '@/types';

type Row = { food: Food; servings: string };

export default function MealScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    (async () => {
      const meal = await getMeal(db, editingId);
      if (cancelled) return;
      if (!meal) {
        router.back();
        return;
      }
      const items = await getMealItems(db, editingId);
      if (cancelled) return;
      setName(meal.name);
      setRows(items.map((item) => ({ food: item, servings: String(item.item_servings) })));
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editingId, router]);

  const addFood = (food: Food) =>
    setRows((current) => {
      const existing = current.find((r) => r.food.id === food.id);
      if (!existing) return [...current, { food, servings: '1' }];
      return current.map((r) =>
        r === existing ? { ...r, servings: String((parseNumber(r.servings) ?? 0) + 1) } : r,
      );
    });

  const total = sumNutrition(rows.map((r) => scaleNutrition(r.food, parseNumber(r.servings) ?? 0)));

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give the meal a name.');
    if (rows.length === 0) return Alert.alert('No foods', 'Add at least one food to the meal.');

    const items: { food_id: number; servings: number }[] = [];
    for (const row of rows) {
      const servings = parseNumber(row.servings);
      if (servings === null || servings <= 0) {
        return Alert.alert('Invalid servings', `Servings for "${row.food.name}" must be greater than 0.`);
      }
      items.push({ food_id: row.food.id, servings });
    }

    await saveMeal(db, editingId, name.trim(), items);
    router.back();
  };

  const confirmDelete = () => {
    if (editingId === null) return;
    Alert.alert('Delete meal', `Delete "${name}"? Diary entries already logged from it are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(db, editingId);
          router.back();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: editingId === null ? 'New meal' : 'Edit meal' }} />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <ThemedText type="smallBold">Name</ThemedText>
            <ThemedTextInput value={name} onChangeText={setName} placeholder="e.g. Usual breakfast" />
          </View>

          <ThemedText type="smallBold">Foods</ThemedText>
          {rows.length === 0 && <ThemedText themeColor="textSecondary">No foods added yet.</ThemedText>}
          {rows.map((row) => {
            const servings = parseNumber(row.servings) ?? 0;
            return (
              <View key={row.food.id} style={styles.itemRow}>
                <View style={styles.fill}>
                  <ThemedText>{row.food.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {row.food.serving_size} {row.food.serving_unit} · {Math.round(row.food.calories * servings)} kcal
                  </ThemedText>
                </View>
                <ThemedTextInput
                  style={styles.servingsInput}
                  value={row.servings}
                  onChangeText={(text) =>
                    setRows((current) => current.map((r) => (r === row ? { ...r, servings: text } : r)))
                  }
                  keyboardType="decimal-pad"
                />
                <Pressable
                  onPress={() => setRows((current) => current.filter((r) => r !== row))}
                  hitSlop={8}
                  style={styles.remove}>
                  <ThemedText themeColor="textSecondary">✕</ThemedText>
                </Pressable>
              </View>
            );
          })}

          <Button title="+ Add food" variant="secondary" onPress={() => setPickerOpen(true)} />

          <ThemedView type="backgroundElement" style={styles.totals}>
            <ThemedText type="smallBold">Meal total</ThemedText>
            <ThemedText type="subtitle" style={styles.totalCalories}>
              {Math.round(total.calories)} kcal
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g · F {Math.round(total.fat)}g
            </ThemedText>
          </ThemedView>

          <Button title={editingId === null ? 'Save meal' : 'Save changes'} onPress={save} />
          {editingId !== null && <Button title="Delete meal" variant="danger" onPress={confirmDelete} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <FoodPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addFood} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  servingsInput: { width: 72, textAlign: 'right' },
  remove: { paddingHorizontal: Spacing.one },
  totals: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  totalCalories: { fontSize: 24, lineHeight: 32 },
});
