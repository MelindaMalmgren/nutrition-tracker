
import { ThemedText } from '@/components/themed-text';
import { useRingColors } from '@/hooks/use-ring-colors';

type Props = { carbs: number; fat: number; protein: number; unit: 'g' | '%'; suffix?: string };

/** "C 50g · F 21g · P 38g" with each letter in its nutrient's ring color. */
export function MacroLine({ carbs, fat, protein, unit, suffix }: Props) {
  const colors = useRingColors();
  const parts = [
    { letter: 'C', value: carbs, color: colors.carbs },
    { letter: 'F', value: fat, color: colors.fat },
    { letter: 'P', value: protein, color: colors.protein },
  ];
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {parts.map((part, i) => (
        <ThemedText key={part.letter} type="small" themeColor="textSecondary">
          {i > 0 ? ' · ' : ''}
          <ThemedText type="smallBold" style={{ color: part.color }}>
            {`${part.letter} ${Math.round(part.value)}${unit}`}
          </ThemedText>
        </ThemedText>
      ))}
      {suffix ? ` · ${suffix}` : ''}
    </ThemedText>
  );
}

