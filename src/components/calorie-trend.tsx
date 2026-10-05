import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { ClipPath, Circle, Defs, Line, Path, Rect } from 'react-native-svg';

import { ColorBars, Sparkline } from '@/components/sparkline';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCard } from '@/hooks/use-card';
import { useRadius } from '@/hooks/use-radius';
import { useRingColors } from '@/hooks/use-ring-colors';
import { useTheme } from '@/hooks/use-theme';
import { buildSeries, goalStatus, summarize } from '@/lib/calorie-series';
import { runs, smoothPath } from '@/lib/chart';

const RANGES = ['7 days', '30 days', '90 days'] as const;
const DAYS: Record<(typeof RANGES)[number], number> = { '7 days': 7, '30 days': 30, '90 days': 90 };

const HEIGHT = 190;
const TOP = 52;
const BOTTOM = 14;
const PAD_X = 16;
const TOOLTIP_WIDTH = 116;

type Props = { calories: Map<string, number>; today: string; goalFor: (iso: string) => number };

function shortDate(iso: string, withWeekday = false) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    ...(withWeekday ? { weekday: 'short' } : {}),
    month: 'short',
    day: 'numeric',
  });
}

/** Calories eaten per day over the last week, month or quarter, with a tap-or-drag tooltip (hidden until touched) and the goal as a dashed line. */
export function CalorieTrend({ calories, today, goalFor }: Props) {
  const theme = useTheme();
  const card = useCard();
  const radius = useRadius();
  const colors = useRingColors();
  const [range, setRange] = useState<(typeof RANGES)[number]>('30 days');
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const tappedSelected = useRef(false);
  const dragged = useRef(false);

  const points = useMemo(() => buildSeries(calories, today, DAYS[range], goalFor), [calories, today, range, goalFor]);
  const stats = summarize(points);
  const values = points.map((p) => p.calories);

  const n = points.length;
  const loggedValues = values.filter((v): v is number => v !== null);
  const all = [...loggedValues, ...points.map((p) => p.goal)];
  const lo = Math.min(...all) * 0.85;
  const hi = Math.max(...all) * 1.08;
  const x = (i: number) => PAD_X + (i * (width - PAD_X * 2)) / (n - 1);
  const y = (v: number) => TOP + ((hi - v) / (hi - lo || 1)) * (HEIGHT - TOP - BOTTOM);

  const selected = picked !== null && values[picked] !== null ? picked : null;

  const nearest = (e: GestureResponderEvent) => {
    const touchX = e.nativeEvent.locationX;
    let best: number | null = null;
    values.forEach((v, i) => {
      if (v !== null && (best === null || Math.abs(x(i) - touchX) < Math.abs(x(best) - touchX))) best = i;
    });
    return best;
  };

  const grab = (e: GestureResponderEvent) => {
    const best = nearest(e);
    tappedSelected.current = best !== null && best === selected;
    dragged.current = false;
    if (best !== null) setPicked(best);
  };

  const drag = (e: GestureResponderEvent) => {
    dragged.current = true;
    const best = nearest(e);
    if (best !== null) setPicked(best);
  };

  const release = () => {
    if (tappedSelected.current && !dragged.current) setPicked(null);
  };

  const statusColor = { on: colors.check, under: colors.carbs, over: colors.calories };
  const dayColors = points.map((p) => (p.calories === null ? null : statusColor[goalStatus(p.calories, p.goal)]));

  const segments = runs(values).map((run) => run.map((p) => ({ x: x(p.index), y: y(p.value) })));
  const goalPath = smoothPath(points.map((p, i) => ({ x: x(i), y: y(p.goal) })));

  const selX = selected !== null ? x(selected) : 0;
  const selY = selected !== null ? y(values[selected]!) : 0;
  const tooltipLeft = Math.min(Math.max(selX - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0));

  return (
    <ThemedView type="backgroundElement" style={[styles.card, card]}>
      <ThemedText style={styles.title}>Calories</ThemedText>
      <SegmentedControl
        options={RANGES}
        value={range}
        onChange={(next) => {
          setRange(next);
          setPicked(null);
        }}
      />

      {stats.logged === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Nothing logged in the last {DAYS[range]} days yet.
        </ThemedText>
      ) : (
        <>
          <View
            style={styles.chart}
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={grab}
            onResponderMove={drag}
            onResponderRelease={release}>
            {width > 0 && (
              <>
                <Svg width={width} height={HEIGHT}>
                  <Defs>
                    <ClipPath id="past">
                      <Rect x={0} y={0} width={selX} height={HEIGHT} />
                    </ClipPath>
                  </Defs>

                  <Path d={goalPath} stroke={theme.textSecondary} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 5" fill="none" />

                  {segments.map((seg, i) =>
                    seg.length === 1 ? (
                      <Circle key={i} cx={seg[0].x} cy={seg[0].y} r={4} fill={theme.accentText} fillOpacity={0.4} />
                    ) : (
                      <Path
                        key={i}
                        d={smoothPath(seg)}
                        stroke={theme.accentText}
                        strokeOpacity={0.35}
                        strokeWidth={3}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ),
                  )}
                  {segments.map((seg, i) =>
                    seg.length === 1 ? null : (
                      <Path
                        key={i}
                        d={smoothPath(seg)}
                        stroke={theme.accentText}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        fill="none"
                        clipPath="url(#past)"
                      />
                    ),
                  )}

                  {selected !== null && (
                    <>
                      <Line x1={selX} y1={selY} x2={selX} y2={HEIGHT - BOTTOM} stroke={theme.textSecondary} strokeOpacity={0.5} strokeDasharray="3 4" />
                      <Circle cx={selX} cy={selY} r={7} fill={theme.accentText} stroke={theme.backgroundElement} strokeWidth={3} />
                    </>
                  )}
                </Svg>

                {selected !== null && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.tooltip,
                      { left: tooltipLeft, top: Math.max(selY - 56, 0), backgroundColor: theme.text, borderRadius: radius.control },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.background }}>
                      {Math.round(values[selected]!).toLocaleString()} kcal
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.background, opacity: 0.75 }}>
                      {shortDate(points[selected].iso, true)}
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.axis}>
            <ThemedText type="small" themeColor="textSecondary">
              {shortDate(points[0].iso)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {shortDate(points[Math.floor((n - 1) / 2)].iso)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {shortDate(points[n - 1].iso)}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Dashed line is your goal. Days you didn't log are left blank.
          </ThemedText>

          <View style={styles.tiles}>
            <View style={[styles.tile, { backgroundColor: theme.background, borderRadius: radius.control }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Average
              </ThemedText>
              <ThemedText style={styles.big}>{Math.round(stats.average).toLocaleString()}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                kcal per logged day
              </ThemedText>
              <Sparkline values={values} color={theme.accentText} />
            </View>
            <View style={[styles.tile, { backgroundColor: theme.background, borderRadius: radius.control }]}>
              <ThemedText type="small" themeColor="textSecondary">
                On target
              </ThemedText>
              <ThemedText style={styles.big}>
                {stats.onTarget} of {stats.logged}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                logged days
              </ThemedText>
              <ColorBars colors={dayColors} faint={theme.backgroundSelected} />
            </View>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.two },
  title: { fontSize: 18, fontWeight: '600' },
  empty: { paddingVertical: Spacing.three },
  chart: { height: HEIGHT, marginTop: Spacing.two },
  tooltip: { position: 'absolute', width: TOOLTIP_WIDTH, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.one },
  tiles: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  tile: { flex: 1, padding: Spacing.three, gap: Spacing.half },
  big: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
});
