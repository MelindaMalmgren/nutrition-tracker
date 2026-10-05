import { KeyboardAvoidingView, Pressable, StyleSheet } from 'react-native';

import { ServingPanel } from '@/components/serving-panel';
import { Spacing } from '@/constants/theme';
import { useFoodPortions } from '@/hooks/use-food-portions';
import type { Food, ServingOption } from '@/types';

type Props = {
  food: Food;
  actionLabel: string;
  initialServings?: number;
  initialOption?: ServingOption;
  onCancel: () => void;
  onConfirm: (choice: { servings: number; serving_size: number; serving_label: string | null }) => void;
};

/**
 * Covers the screen with a card for choosing how much of a food (servings + serving size). Rendered in place,
 * not as a Modal, so the serving-size dropdown can open its own list above it.
 */
export function AmountOverlay({ food, actionLabel, initialServings, initialOption, onCancel, onConfirm }: Props) {
  const { portions, loading } = useFoodPortions(food);

  return (
    <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss">
      <KeyboardAvoidingView behavior="padding" style={styles.center} pointerEvents="box-none">
        <Pressable>
          <ServingPanel
            key={food.id}
            food={food}
            portions={portions}
            loadingMeasures={loading}
            actionLabel={actionLabel}
            initialServings={initialServings}
            initialOption={initialOption}
            onCancel={onCancel}
            onAdd={onConfirm}
          />
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  center: { flex: 1, justifyContent: 'center', padding: Spacing.three },
});
