import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';
import type { RingMode } from '@/db/settings';

type Props = {
  label: string;
  value: number;
  goal: number;
  color: string;
  mode: RingMode;
  size?: number;
};

const STROKE = 6;

/** A progress ring. Count up shows what's eaten ("of goal"); count down shows what's left. */
export function MacroRing({ label, value, goal, color, mode, size = 64 }: Props) {
  const theme = useTheme();
  const colors = useRingColors();

  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(Math.max(value / goal, 0), 1) : 0;
  const over = value > goal;
  const remaining = Math.round(goal - value);

  const main = mode === 'up' ? Math.round(value) : over ? `+${-remaining}` : remaining;
  const sub = mode === 'up' ? `of ${Math.round(goal)}` : over ? 'over' : 'left';

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.track} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={over ? colors.over : color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color: over && mode === 'down' ? colors.over : color }]} numberOfLines={1}>
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
