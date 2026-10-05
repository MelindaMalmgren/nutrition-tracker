import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listRecipes, type RecipeSummary } from '@/db/recipes';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);

  const load = useCallback(async () => setRecipes(await listRecipes(db, query)), [db, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.top}>
          <ThemedText type="subtitle">Recipes</ThemedText>
          <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your recipes" />
          <Button title="+ New recipe" onPress={() => router.push('/recipe')} />
        </View>
        <FlatList
          data={recipes}
          keyExtractor={(r) => String(r.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/recipe', params: { id: String(item.id) } })}
              style={styles.row}>
              <View style={styles.fill}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Makes {item.yield_servings} serving{item.yield_servings === 1 ? '' : 's'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Per serving: {Math.round(item.calories)} cal · C {Math.round(item.carbs)}g · F {Math.round(item.fat)}g
                  · P {Math.round(item.protein)}g
                </ThemedText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              {query ? 'No matching recipes.' : 'No recipes yet. Create one to log a whole dish as a single item.'}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two },
});
