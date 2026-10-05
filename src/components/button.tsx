import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRadius } from '@/hooks/use-radius';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled }: Props) {
  const theme = useTheme();
  const radius = useRadius();
  const background =
    variant === 'primary' ? theme.accent : variant === 'danger' ? theme.danger : theme.backgroundSelected;
  const color = variant === 'primary' ? theme.onAccent : variant === 'danger' ? '#ffffff' : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: background, borderRadius: radius.button }, disabled && styles.disabled]}>
      <ThemedText style={{ color, fontWeight: 600 }}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  disabled: { opacity: 0.5 },
});
