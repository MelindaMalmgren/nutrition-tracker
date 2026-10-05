import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useRadius } from '@/hooks/use-radius';
import { useTheme } from '@/hooks/use-theme';

export function ThemedTextInput({ style, ...rest }: TextInputProps) {
  const radius = useRadius();
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { borderRadius: radius.control },
        { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
        paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
});
