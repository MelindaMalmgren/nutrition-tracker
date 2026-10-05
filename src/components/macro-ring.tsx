import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { RingMode } from '@/db/settings';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: number;
  goal: number;
  color: string;
  mode: RingMode;
  size?: number;
};

const STROKE = 6;
const OVERAGE_SHADE = 0.6;

/** Scales a #rrggbb color toward black (factor 0..1) for the overage arc. */
function darken(hex: string, factor: number): string {
  const channel = (start: number) =>
    Math.round(parseInt(hex.slice(start, start + 2), 16) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * A progress ring. Count up shows what's eaten ("of goal"); count down shows what's left.
 * Past the goal the ring stays full in its own color, a darker arc from the top shows the overage,
 * and the label turns red.
 */
export function MacroRing({ label, value, goal, color, mode, size = 64 }: Props) {
  const theme = useTheme();
  const colors = useRingColors();

  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(Math.max(value / goal, 0), 1) : 0;
  const over = goal > 0 && value > goal;
  const overFraction = over ? Math.min((value - goal) / goal, 1) : 0;
  const remaining = Math.round(goal - value);

  const main = mode === 'up' ? Math.round(value) : over ? `+${-remaining}` : remaining;
  const sub = mode === 'up' ? `of ${Math.round(goal)}` : over ? 'over' : 'left';

  const center = size / 2;
  const startAtTop = `rotate(-90 ${center} ${center})`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.track} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={startAtTop}
        />
        {over && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={darken(color, OVERAGE_SHADE)}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * overFraction} ${circumference}`}
            transform={startAtTop}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.label, { color: over ? colors.over : theme.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color }]} numberOfLines={1}>
          {main}
        </Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9, fontWeight: '600', lineHeight: 11 },
  value: { fontSize: 15, fontWeight: '700', lineHeight: 18 },
  sub: { fontSize: 9, lineHeight: 11 },
});
