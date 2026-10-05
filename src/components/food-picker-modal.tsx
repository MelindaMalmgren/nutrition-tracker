import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodRow } from '@/components/food-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listFoods } from '@/db/foods';
import type { Food } from '@/types';

type Props = { visible: boolean; onClose: () => void; onSelect: (food: Food) => void };

export function FoodPickerModal({ visible, onClose, onSelect }: Props) {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    listFoods(db, query).then((rows) => {
      if (!cancelled) setFoods(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, visible, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.fill}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Add a food
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="linkPrimary">Close</ThemedText>
            </Pressable>
          </View>
          <View style={styles.search}>
            <ThemedTextInput value={query} onChangeText={setQuery} placeholder="Search your foods" />
          </View>
          <FlatList
            data={foods}
            keyExtractor={(f) => String(f.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <FoodRow
                food={item}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              />
            )}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary">
                {query ? 'No matching foods.' : 'No foods yet. Create some in the Foods tab first.'}
              </ThemedText>
            }
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  title: { fontSize: 22, lineHeight: 30 },
  search: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
});
