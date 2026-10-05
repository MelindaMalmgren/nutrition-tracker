import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupSection } from '@/components/backup-section';
import { Button } from '@/components/button';
import { GoalPreview } from '@/components/goal-preview';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { addEntry } from '@/db/diary';
import {
  DEFAULT_FIBER,
  DEFAULT_SODIUM,
  DEFAULT_SUGAR,
  DEFAULT_SPLIT,
  getSettings,
  saveGoalSettings,
  saveRingMode,
  type RingMode,
} from '@/db/settings';
import { todayISO } from '@/lib/dates';
import { computeGoals, isValidSplit, WEEKDAY_NAMES } from '@/lib/goals';
import { emptyNutrition } from '@/lib/nutrition';
import { parseNumber } from '@/lib/parse';
import { useCard } from '@/hooks/use-card';
import { useTheme } from '@/hooks/use-theme';

const RING_OPTIONS = ['Count up', 'Count down'] as const;

export default function SettingsScreen() {
  const card = useCard();
  const theme = useTheme();
  const db = useSQLiteContext();
  const [ringMode, setRingMode] = useState<RingMode>('up');
  const [calories, setCalories] = useState('');
  const [perDay, setPerDay] = useState(false);
  const [dayCalories, setDayCalories] = useState<string[]>(Array(7).fill(''));
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');

  const loadSettings = useCallback(() => {
    getSettings(db).then((s) => {
      setRingMode(s.ringMode);
      setCalories(String(s.calories));
      setPerDay(s.perDay);
      setDayCalories(s.weekdayCalories.map(String));
      setProtein(String(s.split.protein));
      setFat(String(s.split.fat));
      setCarbs(String(s.split.carbs));
      setFiber(String(s.fiber));
      setSugar(String(s.sugar));
      setSodium(String(s.sodium));
    });
  }, [db]);

  useEffect(loadSettings, [loadSettings]);

  const changeRingMode = (option: (typeof RING_OPTIONS)[number]) => {
    const mode: RingMode = option === 'Count up' ? 'up' : 'down';
    setRingMode(mode);
    saveRingMode(db, mode);
  };

  const togglePerDay = (on: boolean) => {
    setPerDay(on);
    // First time on: start every day at the single goal rather than at blank or stale numbers.
    if (on) setDayCalories((days) => (days.every((d) => d === days[0]) ? Array(7).fill(calories) : days));
  };

  // Live values, so the macro amounts follow whatever is typed.
  const proteinPct = parseNumber(protein);
  const fatPct = parseNumber(fat);
  const carbsPct = parseNumber(carbs);
  const fiberGrams = parseNumber(fiber);
  const typedTotal = (proteinPct ?? 0) + (fatPct ?? 0) + (carbsPct ?? 0);
  const candidate =
    proteinPct !== null && fatPct !== null && carbsPct !== null && proteinPct >= 0 && fatPct >= 0 && carbsPct >= 0
      ? { protein: proteinPct, fat: fatPct, carbs: carbsPct }
      : null;
  const split = candidate && isValidSplit(candidate) ? candidate : null;
  const fiberOk = fiberGrams !== null && fiberGrams >= 0;
  const sugarGrams = parseNumber(sugar);
  const sodiumMg = parseNumber(sodium);
  const sugarOk = sugarGrams !== null && sugarGrams >= 0;
  const sodiumOk = sodiumMg !== null && sodiumMg >= 0;
  const caloriesNum = parseNumber(calories);

  const previewFor = (kcal: number | null) =>
    split && fiberOk && sugarOk && sodiumOk && kcal !== null && kcal > 0
      ? computeGoals(kcal, split, { fiber: fiberGrams, sugar: sugarGrams, sodium: sodiumMg })
      : null;

  const resetSplit = () => {
    setProtein(String(DEFAULT_SPLIT.protein));
    setFat(String(DEFAULT_SPLIT.fat));
    setCarbs(String(DEFAULT_SPLIT.carbs));
    setFiber(String(DEFAULT_FIBER));
    setSugar(String(DEFAULT_SUGAR));
    setSodium(String(DEFAULT_SODIUM));
  };

  const save = async () => {
    if (!split) {
      return Alert.alert(
        'Invalid split',
        `Protein, fat and carbs must be numbers (0 or more) that add up to 100%. They currently add up to ${Math.round(typedTotal * 100) / 100}%.`,
      );
    }
    if (!fiberOk) return Alert.alert('Invalid fiber', 'Fiber must be a number, 0 or greater.');
    if (!sugarOk) return Alert.alert('Invalid sugar', 'Sugar must be a number, 0 or greater.');
    if (!sodiumOk) return Alert.alert('Invalid sodium', 'Sodium must be a number, 0 or greater.');
    if (caloriesNum === null || caloriesNum <= 0) {
      return Alert.alert('Invalid calories', 'Calories must be a number greater than 0.');
    }

    const weekdayCalories: number[] = [];
    for (let day = 0; day < 7; day++) {
      const value = parseNumber(dayCalories[day]);
      if (perDay && (value === null || value <= 0)) {
        return Alert.alert('Invalid calories', `${WEEKDAY_NAMES[day]} must be a number greater than 0.`);
      }
      weekdayCalories.push(value !== null && value > 0 ? value : caloriesNum);
    }

    await saveGoalSettings(db, {
      calories: caloriesNum,
      perDay,
      weekdayCalories,
      split,
      fiber: fiberGrams,
      sugar: sugarGrams,
      sodium: sodiumMg,
    });
    Alert.alert('Saved', 'Your daily goals were updated.');
  };

  const addSampleEntry = async () => {
    await addEntry(db, {
      ...emptyNutrition(),
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
    });
    Alert.alert('Added', 'Sample entry added to today\'s Breakfast.');
  };

  const singlePreview = previewFor(caloriesNum);

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
            <ThemedText type="small" themeColor="textSecondary">
              Set calories and the other goals follow from your macro split below.
            </ThemedText>

            <View style={styles.switchRow}>
              <View style={styles.fill}>
                <ThemedText>Different calories each day of the week</ThemedText>
              </View>
              <Switch value={perDay} onValueChange={togglePerDay} />
            </View>

            {!perDay ? (
              <ThemedView type="backgroundElement" style={[styles.card, card]}>
                <View style={styles.inputRow}>
                  <ThemedText style={styles.fill}>Calories (kcal)</ThemedText>
                  <ThemedTextInput
                    style={styles.input}
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="decimal-pad"
                  />
                </View>
                {singlePreview ? (
                  <GoalPreview goals={singlePreview} split={split as NonNullable<typeof split>} />
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Enter valid calories and a valid macro split to see your goals.
                  </ThemedText>
                )}
              </ThemedView>
            ) : (
              WEEKDAY_NAMES.map((name, day) => {
                const preview = previewFor(parseNumber(dayCalories[day]));
                return (
                  <ThemedView key={name} type="backgroundElement" style={[styles.card, card]}>
                    <View style={styles.inputRow}>
                      <ThemedText style={styles.fill}>{name}</ThemedText>
                      <ThemedTextInput
                        style={styles.input}
                        value={dayCalories[day]}
                        onChangeText={(text) => setDayCalories((days) => days.map((d, i) => (i === day ? text : d)))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {preview && (
                      <ThemedText type="small" themeColor="textSecondary">
                        P {preview.protein}g · F {preview.fat}g · C {preview.carbs}g · Fiber {preview.fiber}g
                      </ThemedText>
                    )}
                  </ThemedView>
                );
              })
            )}

            <ThemedText type="smallBold" style={styles.heading}>
              Macro split
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Percent of calories from each macro; the three should add up to 100%. Fiber, sugar and sodium are fixed
              daily amounts that don't change with calories. Set sugar or sodium to 0 for no goal.
            </ThemedText>
            <ThemedView type="backgroundElement" style={[styles.card, card]}>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Protein (%)</ThemedText>
                <ThemedTextInput style={styles.input} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Fat (%)</ThemedText>
                <ThemedTextInput style={styles.input} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Carbs (%)</ThemedText>
                <ThemedTextInput style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <ThemedText themeColor="textSecondary" style={styles.fill}>
                  Total
                </ThemedText>
                <ThemedText style={[split ? styles.totalOk : styles.totalBad, !split && { color: theme.danger }]}>
                  {Math.round(typedTotal * 100) / 100}%{split ? '' : ' (needs to be 100%)'}
                </ThemedText>
              </View>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Fiber (g)</ThemedText>
                <ThemedTextInput style={styles.input} value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Sugar (g)</ThemedText>
                <ThemedTextInput style={styles.input} value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputRow}>
                <ThemedText style={styles.fill}>Sodium (mg)</ThemedText>
                <ThemedTextInput style={styles.input} value={sodium} onChangeText={setSodium} keyboardType="decimal-pad" />
              </View>
              <Pressable onPress={resetSplit} hitSlop={8}>
                <ThemedText type="linkPrimary">
                  Reset to defaults (30% protein, 30% fat, 40% carbs, 25 g fiber, 50 g sugar, 2,300 mg sodium)
                </ThemedText>
              </Pressable>
            </ThemedView>

            <Button title="Save goals" onPress={save} />

            <BackupSection onRestored={loadSettings} />

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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.two },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  input: { width: 110, textAlign: 'right' },
  totalOk: { fontWeight: '600', textAlign: 'right' },
  totalBad: { fontWeight: '600', textAlign: 'right' },
});
