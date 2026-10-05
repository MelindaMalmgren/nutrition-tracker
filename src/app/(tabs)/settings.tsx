import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addEntry } from '@/db/diary';
import { todayISO } from '@/lib/dates';

export default function SettingsScreen() {
  const db = useSQLiteContext();

  const addSampleEntry = async () => {
    await addEntry(db, {
      date: todayISO(),
      meal_slot: 'Breakfast',
      name: 'Sample oatmeal',
      servings: 1,
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
      fiber: 4,
      sugar: 1,
      sodium: 0,
    });
    Alert.alert('Added', 'Sample entry added to today\'s Breakfast.');
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="subtitle">Settings</ThemedText>
        <ThemedText themeColor="textSecondary">Backup export and import will live here.</ThemedText>

        <ThemedText type="smallBold" style={styles.heading}>
          Dev tools
        </ThemedText>
        <Pressable onPress={addSampleEntry}>
          <ThemedText type="linkPrimary">Add sample entry to today's Breakfast</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  heading: { marginTop: Spacing.four },
});
