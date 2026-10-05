import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRadius } from '@/hooks/use-radius';
import { useTheme } from '@/hooks/use-theme';

type Props<T extends string> = { options: readonly T[]; value: T; onChange: (value: T) => void };

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const radius = useRadius();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement, borderRadius: radius.segmentTrack }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, { borderRadius: radius.segment }, selected && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: Spacing.one },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two },
});
