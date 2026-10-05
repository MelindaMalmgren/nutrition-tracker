import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteFood, getFood, insertCustomFood, updateCustomFood } from '@/db/foods';
import { refreshRecipesUsing } from '@/db/recipes';
import { useRingColors } from '@/hooks/use-ring-colors';
import { NUTRIENTS } from '@/lib/nutrients';
import { emptyNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';

export default function CustomFoodScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = useRingColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    (async () => {
      const food = await getFood(db, editingId);
      if (cancelled) return;
      if (!food || food.source !== 'custom') {
        router.back();
        return;
      }
      setName(food.name);
      setBrand(food.brand ?? '');
      setServingSize(String(food.serving_size));
      setServingUnit(food.serving_unit);
      setValues(Object.fromEntries(NUTRIENTS.map((f) => [f.key, food[f.key] ? String(food[f.key]) : ''])));
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editingId, router]);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give the food a name.');

    const size = parseNumber(servingSize);
    if (size === null || size <= 0) return Alert.alert('Invalid serving size', 'Serving size must be greater than 0.');

    const nutrition = emptyNutrition();
    for (const field of NUTRIENTS) {
      const raw = values[field.key] ?? '';
      const n = parseNumber(raw);
      if (raw.trim() !== '' && (n === null || n < 0)) {
        return Alert.alert('Invalid value', `${field.label} must be a number, 0 or greater.`);
      }
      nutrition[field.key] = n ?? 0;
    }

    const food = {
      name: name.trim(),
      brand: brand.trim() || null,
      serving_size: size,
      serving_unit: servingUnit.trim() || 'serving',
      ...nutrition,
    };
    if (editingId === null) await insertCustomFood(db, food);
    else {
      await updateCustomFood(db, editingId, food);
      await refreshRecipesUsing(db, editingId);
    }
    router.back();
  };

  const confirmDelete = () => {
    if (editingId === null) return;
    Alert.alert(
      'Delete food',
      `Delete "${name}"? It will also be removed from any saved meals. Past diary entries keep their values.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const deleted = await deleteFood(db, editingId);
            if (!deleted) {
              Alert.alert('Cannot delete', 'This food is used as an ingredient in a recipe. Remove it from the recipe first.');
              return;
            }
            router.back();
          },
        },
      ],
    );
  };

  const renderField = (field: (typeof NUTRIENTS)[number]) => (
    <View key={field.key} style={styles.nutrientRow}>
      <ThemedText style={styles.fill}>
        {field.label} ({field.unit})
      </ThemedText>
      <ThemedTextInput
        style={styles.nutrientInput}
        value={values[field.key] ?? ''}
        onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
        keyboardType="decimal-pad"
        placeholder="0"
      />
    </View>
  );

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: editingId === null ? 'New custom food' : 'Edit food' }} />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <ThemedText type="smallBold">Name</ThemedText>
          <ThemedTextInput value={name} onChangeText={setName} placeholder="e.g. Homemade granola" />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold">Brand (optional)</ThemedText>
          <ThemedTextInput value={brand} onChangeText={setBrand} />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.fill]}>
            <ThemedText type="smallBold">Serving size</ThemedText>
            <ThemedTextInput value={servingSize} onChangeText={setServingSize} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.field, styles.fill]}>
            <ThemedText type="smallBold">Unit</ThemedText>
            <ThemedTextInput value={servingUnit} onChangeText={setServingUnit} placeholder="g, cup, slice..." />
          </View>
        </View>

        {editingId !== null && (
          <Pressable onPress={confirmDelete} hitSlop={8} style={styles.deleteLink} accessibilityLabel="Delete food">
            <ThemedText type="small" style={{ color: colors.over }}>
              Delete food
            </ThemedText>
          </Pressable>
        )}

        <ThemedText type="smallBold" themeColor="textSecondary">
          Nutrition per serving
        </ThemedText>
        {NUTRIENTS.filter((f) => f.group === 'main').map(renderField)}

        <ThemedText type="smallBold" themeColor="textSecondary">
          More nutrients (optional)
        </ThemedText>
        {NUTRIENTS.filter((f) => f.group === 'more').map(renderField)}

        {editingId !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            Changes apply to future entries only; past diary entries keep their original values.
          </ThemedText>
        )}

        <Button title={editingId === null ? 'Save food' : 'Save changes'} onPress={save} />
      </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.three },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nutrientInput: { width: 110, textAlign: 'right' },
  deleteLink: { alignSelf: 'flex-start' },
});
