import { Pressable, StyleSheet, View } from 'react-native';

import { CheckCircle } from '@/components/check-circle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { entryTotal } from '@/lib/nutrition';
import type { DiaryEntry } from '@/types';

type Props = {
  entry: DiaryEntry;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: () => void;
};

/** A compact diary line: name, serving, calories, and a check that marks it eaten (vs. only planned). */
export function EntryRow({ entry, onPress, onLongPress, onToggle }: Props) {
  const eaten = entry.consumed === 1;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.row, !eaten && styles.planned]}>
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{entry.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {eaten ? '' : 'Planned · '}
          {entry.servings} × {entry.serving_label ?? `${entry.serving_size} ${entry.serving_unit}`}
        </ThemedText>
      </View>
      <ThemedText>{Math.round(entryTotal(entry).calories)}</ThemedText>
      <CheckCircle state={eaten ? 'checked' : 'unchecked'} onPress={onToggle} label={`${entry.name} eaten`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  planned: { opacity: 0.7 },
  text: { flex: 1 },
});
