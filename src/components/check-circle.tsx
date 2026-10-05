import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';

export type CheckState = 'checked' | 'partial' | 'unchecked';

/** Checked when every item is eaten, partial when some are, unchecked when none (or there are no items). */
export function mealCheckState(entries: { consumed: number }[]): CheckState {
  const eaten = entries.filter((e) => e.consumed === 1).length;
  if (eaten === 0) return 'unchecked';
  return eaten === entries.length ? 'checked' : 'partial';
}

/** The fraction of a meal's items that are eaten, for filling the circle. */
export function mealProgress(entries: { consumed: number }[]): number {
  return entries.length === 0 ? 0 : entries.filter((e) => e.consumed === 1).length / entries.length;
}

type Props = { state: CheckState; onPress: () => void; label: string; progress?: number };

export function CheckCircle({ state, onPress, label, progress = 0.5 }: Props) {
  const theme = useTheme();
  const colors = useRingColors();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === 'partial' ? 'mixed' : state === 'checked' }}
      accessibilityLabel={label}
      style={[
        styles.circle,
        state === 'checked' && { backgroundColor: colors.check, borderColor: colors.check },
        state === 'partial' && { borderColor: colors.check },
        state === 'unchecked' && { borderColor: theme.textSecondary },
      ]}>
      {state === 'checked' && <ThemedText style={styles.mark}>✓</ThemedText>}
      {state === 'partial' && (
        <View style={[styles.fill, { height: `${Math.round(progress * 100)}%`, backgroundColor: colors.check }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mark: { color: '#ffffff', fontSize: 14, lineHeight: 16, fontWeight: '700' },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
