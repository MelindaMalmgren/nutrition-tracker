import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountOverlay } from '@/components/amount-overlay';
import { Button } from '@/components/button';
import { FoodPickerModal } from '@/components/food-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteRecipe, getRecipe, getRecipeIngredients, saveRecipe } from '@/db/recipes';
import { useRingColors } from '@/hooks/use-ring-colors';
import { scaleNutrition, sumNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import { ingredientMultiplier, recipeNutrition } from '@/lib/recipes';
import { plainServing } from '@/lib/serving-options';
import type { Food } from '@/types';

/** One ingredient: `servings` of `size` (in the food's unit); `label` is household wording like "1 cup (158 g)". */
type Row = { key: number; food: Food; servings: number; size: number; label: string | null };

/** The ingredient being added (no row yet) or edited (row set). */
type Editing = { food: Food; row?: Row };

const describe = (row: Row) => `${row.servings} × ${row.label ?? plainServing(row.size, row.food.serving_unit)}`;

export default function RecipeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const nextKey = useRef(1);
  const colors = useRingColors();

  const [name, setName] = useState('');
  const [makes, setMakes] = useState('1');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    (async () => {
      const recipe = await getRecipe(db, editingId);
      if (cancelled) return;
      if (!recipe) {
        router.back();
        return;
      }
      const ingredients = await getRecipeIngredients(db, editingId);
      if (cancelled) return;
      setName(recipe.name);
      setMakes(String(recipe.yield_servings));
      setNotes(recipe.notes ?? '');
      setRows(
        ingredients.map((item) => ({
          key: nextKey.current++,
          food: item,
          servings: item.item_servings,
          size: item.item_serving_size ?? item.serving_size,
          label: item.item_serving_label,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editingId, router]);

  const confirmAmount = (choice: { servings: number; serving_size: number; serving_label: string | null }) => {
    if (!editing) return;
    const { food, row } = editing;
    const updated = { food, servings: choice.servings, size: choice.serving_size, label: choice.serving_label };
    setRows((current) =>
      row
        ? current.map((r) => (r.key === row.key ? { ...r, ...updated } : r))
        : [...current, { key: nextKey.current++, ...updated }],
    );
    setEditing(null);
  };

  const makesValue = parseNumber(makes);
  const makesValid = makesValue !== null && makesValue > 0;
  const ingredientInputs = rows.map((r) => ({
    food: r.food,
    servings: ingredientMultiplier(r.food, r.servings, r.size),
  }));
  const wholeRecipe = sumNutrition(ingredientInputs.map((i) => scaleNutrition(i.food, i.servings)));
  const perServing = makesValid ? recipeNutrition(ingredientInputs, makesValue) : null;

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give the recipe a name.');
    if (!makesValid) return Alert.alert('Invalid servings', 'The number of servings the recipe makes must be greater than 0.');
    if (rows.length === 0) return Alert.alert('No ingredients', 'Add at least one ingredient.');

    await saveRecipe(
      db,
      editingId,
      { name: name.trim(), yield_servings: makesValue, notes: notes.trim() || null },
      rows.map((r) => ({ food: r.food, servings: r.servings, serving_size: r.size, serving_label: r.label })),
    );
    router.back();
  };

  const confirmDelete = () => {
    if (editingId === null) return;
    Alert.alert(
      'Delete recipe',
      `Delete "${name}"? It will also be removed from any saved meals. Diary entries already logged from it are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipe(db, editingId);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: editingId === null ? 'New recipe' : 'Edit recipe' }} />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <ThemedText type="smallBold">Name</ThemedText>
            <ThemedTextInput value={name} onChangeText={setName} placeholder="e.g. Chicken stir-fry" />
          </View>

          <View style={styles.inlineRow}>
            <ThemedText style={styles.fill}>Makes (servings)</ThemedText>
            <ThemedTextInput style={styles.smallInput} value={makes} onChangeText={setMakes} keyboardType="decimal-pad" />
          </View>

          <ThemedText type="smallBold">Ingredients</ThemedText>
          {rows.length === 0 && <ThemedText themeColor="textSecondary">No ingredients added yet.</ThemedText>}
          {rows.map((row) => (
            <View key={row.key} style={styles.inlineRow}>
              <Pressable
                style={styles.fill}
                onPress={() => setEditing({ food: row.food, row })}
                accessibilityLabel={`Edit ${row.food.name}`}>
                <ThemedText>{row.food.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {describe(row)} · {Math.round(row.food.calories * ingredientMultiplier(row.food, row.servings, row.size))}{' '}
                  kcal
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                hitSlop={8}
                accessibilityLabel={`Remove ${row.food.name}`}>
                <ThemedText themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            </View>
          ))}
          {rows.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Tap an ingredient to change its servings or serving size.
            </ThemedText>
          )}

          <Button title="+ Add ingredient" variant="secondary" onPress={() => setPickerOpen(true)} />

          <ThemedView type="backgroundElement" style={styles.totals}>
            <ThemedText type="smallBold">Per serving</ThemedText>
            <ThemedText type="subtitle" style={styles.totalCalories}>
              {perServing ? Math.round(perServing.calories) : '–'} kcal
            </ThemedText>
            {perServing && (
              <ThemedText type="small" themeColor="textSecondary">
                P {Math.round(perServing.protein)}g · C {Math.round(perServing.carbs)}g · F {Math.round(perServing.fat)}g
                · Fiber {Math.round(perServing.fiber)}g
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Whole recipe: {Math.round(wholeRecipe.calories)} kcal
            </ThemedText>
          </ThemedView>

          {editingId !== null && (
            <Pressable onPress={confirmDelete} hitSlop={8} style={styles.deleteLink} accessibilityLabel="Delete recipe">
              <ThemedText type="small" style={{ color: colors.over }}>
                Delete recipe
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.field}>
            <ThemedText type="smallBold">Notes (optional)</ThemedText>
            <ThemedTextInput
              style={styles.notes}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Instructions, tips..."
            />
          </View>

          <Button title={editingId === null ? 'Save recipe' : 'Save changes'} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>

      <FoodPickerModal
        visible={pickerOpen}
        title="Add an ingredient"
        includeRecipes={false}
        onClose={() => setPickerOpen(false)}
        onSelect={(food) => setEditing({ food })}
      />

      {editing && (
        <AmountOverlay
          key={editing.row?.key ?? `new-${editing.food.id}`}
          food={editing.food}
          actionLabel={editing.row ? 'Save' : 'Add to recipe'}
          initialServings={editing.row?.servings}
          initialOption={
            editing.row
              ? {
                  label: editing.row.label ?? plainServing(editing.row.size, editing.food.serving_unit),
                  size: editing.row.size,
                  unit: editing.food.serving_unit,
                }
              : undefined
          }
          onCancel={() => setEditing(null)}
          onConfirm={confirmAmount}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  smallInput: { width: 80, textAlign: 'right' },
  totals: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  totalCalories: { fontSize: 24, lineHeight: 32 },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  deleteLink: { alignSelf: 'flex-start' },
});
