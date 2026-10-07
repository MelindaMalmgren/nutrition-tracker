import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Spacing } from '@/constants/theme';
import { addEntry } from '@/db/diary';
import { NUTRIENTS } from '@/lib/nutrients';
import { emptyNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import type { MealSlot } from '@/types';

export function AddQuickPane({ date, slot }: { date: string; slot: MealSlot }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give the entry a name.');

    const nutrition = emptyNutrition();
    for (const field of NUTRIENTS) {
      const raw = values[field.key] ?? '';
      const n = parseNumber(raw);
      if (raw.trim() !== '' && (n === null || n < 0)) {
        return Alert.alert('Invalid value', `${field.label} must be a number, 0 or greater.`);
      }
      nutrition[field.key] = n ?? 0;
    }

    await addEntry(db, { date, meal_slot: slot, name: name.trim(), servings: 1, ...nutrition });
    router.back();
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
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          A one-time entry for this day only. It isn't saved to your foods.
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="smallBold">Name</ThemedText>
          <ThemedTextInput value={name} onChangeText={setName} placeholder="e.g. Restaurant pasta" />
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary">
          Nutrition
        </ThemedText>
        {NUTRIENTS.filter((f) => f.group === 'main').map(renderField)}

        <ThemedText type="smallBold" themeColor="textSecondary">
          More nutrients (optional)
        </ThemedText>
        {NUTRIENTS.filter((f) => f.group === 'more').map(renderField)}

        <Button title="Add to Meal" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nutrientInput: { width: 110, textAlign: 'right' },
});
