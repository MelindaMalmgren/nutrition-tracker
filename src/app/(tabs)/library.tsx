import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodsList } from '@/components/library/foods-list';
import { MealsList } from '@/components/library/meals-list';
import { RecipesList } from '@/components/library/recipes-list';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const SECTIONS = ['Foods', 'Meals', 'Recipes'] as const;

export default function LibraryScreen() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('Foods');

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Library</ThemedText>
          <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
        </View>
        {section === 'Foods' && <FoodsList />}
        {section === 'Meals' && <MealsList />}
        {section === 'Recipes' && <RecipesList />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.three },
});
