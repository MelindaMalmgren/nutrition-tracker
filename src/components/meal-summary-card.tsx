import { Pressable, StyleSheet, View } from 'react-native';

import { CheckCircle, mealCheckState } from '@/components/check-circle';
import { MacroLine } from '@/components/macro-line';
import { MealIcon } from '@/components/meal-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCard } from '@/hooks/use-card';
import { useRadius } from '@/hooks/use-radius';
import { useTheme } from '@/hooks/use-theme';
import { entryTotal, sumNutrition } from '@/lib/nutrition';
import type { DiaryEntry, MealSlot } from '@/types';

type Props = {
  slot: MealSlot;
  entries: DiaryEntry[];
  onOpen: () => void;
  onLog: () => void;
  onToggleAll: () => void;
};

/** One meal in the condensed day view: details on the left; Log and check-all stacked on the right. */
export function MealSummaryCard({ slot, entries, onOpen, onLog, onToggleAll }: Props) {
  const radius = useRadius();
  const card = useCard();
  const theme = useTheme();
  // Everything in the meal counts here, eaten or not, so you can see what it adds once checked.
  const total = sumNutrition(entries.map(entryTotal));
  const eatenCount = entries.filter((e) => e.consumed === 1).length;
  const status =
    entries.length === 0 || eatenCount === entries.length
      ? null
      : eatenCount === 0
        ? 'Planned'
        : `${eatenCount} of ${entries.length} eaten`;

  const preview =
    entries.length === 0
      ? null
      : entries.length === 1
        ? entries[0].name
        : `${entries[0].name} and ${entries.length - 1} more`;

  return (
    <Pressable onPress={onOpen}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          card,
          entries.length === 0 && { backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.textSecondary },
          status && { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.textSecondary },
        ]}>
        <View style={[styles.info, entries.length === 0 && styles.faded]}>
          <View style={styles.titleRow}>
            <View style={entries.length === 0 && styles.dimmed}>
              <MealIcon slot={slot} size={32} />
            </View>
            <ThemedText style={styles.title}>{slot}</ThemedText>
            {status && (
              <View style={[styles.status, { borderColor: theme.textSecondary }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {status}
                </ThemedText>
              </View>
            )}
          </View>
          {preview ? (
            <>
              <ThemedText themeColor="textSecondary" numberOfLines={2}>
                {preview}
              </ThemedText>
              <MacroLine
                carbs={total.carbs}
                fat={total.fat}
                protein={total.protein}
                unit="g"
                suffix={`${Math.round(total.calories)} cal`}
              />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing logged yet. Tap Log to add food.
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onLog} hitSlop={8} style={[styles.logButton, { borderRadius: radius.button }, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="linkPrimary" style={styles.logText}>
              Log
            </ThemedText>
          </Pressable>
          {entries.length > 0 && (
            <CheckCircle state={mealCheckState(entries)} onPress={onToggleAll} label={`Mark all of ${slot} eaten`} />
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: Spacing.three, gap: Spacing.three },
  info: { flex: 1, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  status: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 999, paddingHorizontal: Spacing.two },
  faded: { opacity: 0.8 },
  dimmed: { opacity: 0.45 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 32 },
  actions: { alignItems: 'flex-end', justifyContent: 'space-between' },
  logButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, },
  logText: { fontWeight: '700' },
});
