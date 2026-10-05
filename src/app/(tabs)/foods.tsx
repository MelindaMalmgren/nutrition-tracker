import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FoodRow } from '@/components/food-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listFoods } from '@/db/foods';
import type { Food } from '@/types';

export default function FoodsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);

  const load = useCallback(async () => setFoods(await listFoods(db, query)), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.top}>
          <ThemedText type="subtitle">Foods</ThemedText>
          <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your foods" />
          <Button title="+ New custom food" onPress={() => router.push('/custom-food')} />
        </View>
        <FlatList
          data={foods}
          keyExtractor={(f) => String(f.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FoodRow
              food={item}
              onPress={
                item.source === 'custom'
                  ? () => router.push({ pathname: '/custom-food', params: { id: String(item.id) } })
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              {query ? 'No matching foods.' : 'No foods yet. Create a custom food to get started.'}
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { padding: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
});
