import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled }: Props) {
  const theme = useTheme();
  const filled = variant !== 'secondary';
  const background = variant === 'primary' ? '#3c87f7' : variant === 'danger' ? '#d93025' : theme.backgroundSelected;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: background }, disabled && styles.disabled]}>
      <ThemedText style={{ color: filled ? '#ffffff' : theme.text, fontWeight: 600 }}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  disabled: { opacity: 0.5 },
});
