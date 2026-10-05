import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { addEntry } from '@/db/diary';
import { GOAL_KEYS, getSettings, saveGoals, saveRingMode, type GoalKey, type RingMode } from '@/db/settings';
import { todayISO } from '@/lib/dates';
import { parseNumber } from '@/lib/parse';

const GOAL_LABELS: Record<GoalKey, { label: string; unit: string }> = {
  calories: { label: 'Calories', unit: 'kcal' },
  fat: { label: 'Fat', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  protein: { label: 'Protein', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
};

const RING_OPTIONS = ['Count up', 'Count down'] as const;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [goals, setGoals] = useState<Record<GoalKey, string>>({
    calories: '',
    fat: '',
    carbs: '',
    protein: '',
    fiber: '',
  });
  const [ringMode, setRingMode] = useState<RingMode>('up');

  useEffect(() => {
    getSettings(db).then((settings) => {
      setRingMode(settings.ringMode);
      setGoals(Object.fromEntries(GOAL_KEYS.map((k) => [k, String(settings.goals[k])])) as Record<GoalKey, string>);
    });
  }, [db]);

  const changeRingMode = (option: (typeof RING_OPTIONS)[number]) => {
    const mode: RingMode = option === 'Count up' ? 'up' : 'down';
    setRingMode(mode);
    saveRingMode(db, mode);
  };

  const submitGoals = async () => {
    const parsed = {} as Record<GoalKey, number>;
    for (const key of GOAL_KEYS) {
      const value = parseNumber(goals[key]);
      if (value === null || value <= 0) {
        return Alert.alert('Invalid goal', `${GOAL_LABELS[key].label} must be a number greater than 0.`);
      }
      parsed[key] = value;
    }
    await saveGoals(db, parsed);
    Alert.alert('Saved', 'Your daily goals were updated.');
  };

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
      <SafeAreaView style={styles.fill} edges={['top']}>
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Settings</ThemedText>

            <ThemedText type="smallBold" style={styles.heading}>
              Ring display
            </ThemedText>
            <SegmentedControl
              options={RING_OPTIONS}
              value={ringMode === 'up' ? 'Count up' : 'Count down'}
              onChange={changeRingMode}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Count up shows what you've eaten out of your goal. Count down shows what's left.
            </ThemedText>

            <ThemedText type="smallBold" style={styles.heading}>
              Daily goals
            </ThemedText>
            {GOAL_KEYS.map((key) => (
              <View key={key} style={styles.goalRow}>
                <ThemedText style={styles.fill}>
                  {GOAL_LABELS[key].label} ({GOAL_LABELS[key].unit})
                </ThemedText>
                <ThemedTextInput
                  style={styles.goalInput}
                  value={goals[key]}
                  onChangeText={(text) => setGoals((g) => ({ ...g, [key]: text }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <Button title="Save goals" onPress={submitGoals} />

            <ThemedText type="small" themeColor="textSecondary" style={styles.heading}>
              Backup export and import will live here.
            </ThemedText>

            <ThemedText type="smallBold" style={styles.heading}>
              Dev tools
            </ThemedText>
            <Pressable onPress={addSampleEntry}>
              <ThemedText type="linkPrimary">Add sample entry to today's Breakfast</ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  heading: { marginTop: Spacing.three },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  goalInput: { width: 110, textAlign: 'right' },
});
