import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props<T extends string> = { options: readonly T[]; value: T; onChange: (value: T) => void };

/** Equal-width text tabs with an underline under the selected one. */
export function UnderlineTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.tab, selected && { borderBottomColor: theme.accentText }]}>
            <ThemedText type="smallBold" style={[styles.label, selected && { color: theme.accentText }]} themeColor={selected ? undefined : 'textSecondary'}>
              {option.toUpperCase()}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  label: { letterSpacing: 0.8 },
});
