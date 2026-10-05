import { Pressable, StyleSheet, View } from 'react-native';

import { CheckCircle, mealCheckState } from '@/components/check-circle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sumConsumed, sumPlanned } from '@/lib/nutrition';
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
  const theme = useTheme();
  const eaten = sumConsumed(entries);
  const planned = sumPlanned(entries);

  const preview =
    entries.length === 0
      ? null
      : entries.length === 1
        ? entries[0].name
        : `${entries[0].name} and ${entries.length - 1} more`;

  return (
    <Pressable onPress={onOpen}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.info}>
          <ThemedText style={styles.title}>{slot}</ThemedText>
          {preview && (
            <>
              <ThemedText themeColor="textSecondary" numberOfLines={2}>
                {preview}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Math.round(eaten.calories)} cal
                {planned.calories > 0 ? ` · +${Math.round(planned.calories)} planned` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                C {Math.round(eaten.carbs)}g · F {Math.round(eaten.fat)}g · P {Math.round(eaten.protein)}g
              </ThemedText>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onLog} hitSlop={8} style={[styles.logButton, { backgroundColor: theme.backgroundSelected }]}>
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
  card: { flexDirection: 'row', padding: Spacing.three, borderRadius: 16, gap: Spacing.four },
  info: { flex: 1, gap: Spacing.one },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 32 },
  actions: { alignItems: 'flex-end', justifyContent: 'space-between' },
  logButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: 16 },
  logText: { fontWeight: '700' },
});
