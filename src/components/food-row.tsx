import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Food } from '@/types';

type RowFood = Pick<Food, 'name' | 'brand' | 'serving_size' | 'serving_unit' | 'calories'>;

export function FoodRow({ food, onPress }: { food: RowFood; onPress?: () => void }) {
  const detail = [food.brand, `${food.serving_size} ${food.serving_unit}`].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.text}>
        <ThemedText>{food.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <ThemedText>{Math.round(food.calories)} cal</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, paddingRight: Spacing.two },
});
