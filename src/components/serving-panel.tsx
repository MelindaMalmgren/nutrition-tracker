import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Dropdown } from '@/components/dropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { scaleNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import { buildServingOptions, labelForEntry } from '@/lib/serving-options';
import type { Food, MealSlot, Nutrition, ServingOption } from '@/types';

export type PanelFood = Pick<Food, 'name' | 'brand' | 'serving_size' | 'serving_unit'> &
  Nutrition & { serving_label?: string | null };

type Props = {
  food: PanelFood;
  /** Household measures from the source (e.g. "1 cup, sliced (150 g)"), if known. */
  portions?: ServingOption[];
  loadingMeasures?: boolean;
  slot: MealSlot;
  busy?: boolean;
  onCancel: () => void;
  onAdd: (choice: { servings: number; serving_size: number; serving_label: string | null }) => void;
};

/** Pick how much of a food to log: a number of servings of a chosen serving size. Mount with a `key` per food. */
export function ServingPanel({ food, portions, loadingMeasures, slot, busy, onCancel, onAdd }: Props) {
  const [servings, setServings] = useState('1');
  const [optionIndex, setOptionIndex] = useState(0);

  const options = useMemo(() => buildServingOptions(food, portions), [food, portions]);
  const option = options[optionIndex] ?? options[0];

  const servingsValue = parseNumber(servings);
  const valid = servingsValue !== null && servingsValue > 0;

  const perServing = scaleNutrition(food, option.size / food.serving_size);
  const total = valid ? scaleNutrition(perServing, servingsValue) : null;

  return (
    <ThemedView type="backgroundElement" style={styles.panel}>
      <ThemedText type="smallBold">{food.name}</ThemedText>
      {food.brand && (
        <ThemedText type="small" themeColor="textSecondary">
          {food.brand}
        </ThemedText>
      )}

      <View style={styles.row}>
        <View style={[styles.field, styles.servings]}>
          <ThemedText type="smallBold">Servings</ThemedText>
          <ThemedTextInput value={servings} onChangeText={setServings} keyboardType="decimal-pad" />
        </View>
        <View style={[styles.field, styles.size]}>
          <ThemedText type="smallBold">Serving size</ThemedText>
          <Dropdown
            options={options.map((o) => o.label)}
            selectedIndex={optionIndex}
            onSelect={setOptionIndex}
            title="Serving size"
          />
        </View>
      </View>

      {loadingMeasures && (
        <ThemedText type="small" themeColor="textSecondary">
          Loading more measures…
        </ThemedText>
      )}

      {total ? (
        <ThemedText type="small" themeColor="textSecondary">
          Total: {Math.round(total.calories)} kcal · P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g · F{' '}
          {Math.round(total.fat)}g
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Servings must be greater than 0.
        </ThemedText>
      )}

      <View style={styles.row}>
        <View style={styles.fill}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
        <View style={styles.fill}>
          <Button
            title={`Add to ${slot}`}
            disabled={!valid || busy}
            onPress={() =>
              valid && onAdd({ servings: servingsValue, serving_size: option.size, serving_label: labelForEntry(option) })
            }
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  field: { gap: Spacing.one },
  servings: { flex: 1 },
  size: { flex: 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
