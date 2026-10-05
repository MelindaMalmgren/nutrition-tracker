import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listMeals, type MealSummary } from '@/db/meals';

export function MealsList() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [meals, setMeals] = useState<MealSummary[]>([]);

  const load = useCallback(async () => setMeals(await listMeals(db, query)), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your meals" />
        <Button title="+ New meal" onPress={() => router.push('/meal')} />
      </View>
      <FlatList
        data={meals}
        keyExtractor={(m) => String(m.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/meal', params: { id: String(item.id) } })}
            style={styles.row}>
            <View style={styles.fill}>
              <ThemedText>{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.item_count} item{item.item_count === 1 ? '' : 's'}
              </ThemedText>
            </View>
            <ThemedText>{Math.round(item.calories)} kcal</ThemedText>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">
            {query ? 'No matching meals.' : 'No meals yet. Create one to add a group of foods in one tap.'}
          </ThemedText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two },
});
