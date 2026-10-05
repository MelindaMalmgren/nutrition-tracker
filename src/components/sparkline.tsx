import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { runs, smoothPath } from '@/lib/chart';

type Props = { height?: number; color: string };

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setWidth(e.nativeEvent.layout.width) };
}

/** A tiny line of the values, broken where a value is null. */
export function Sparkline({ values, height = 28, color }: Props & { values: (number | null)[] }) {
  const { width, onLayout } = useWidth();
  const logged = values.filter((v): v is number => v !== null);
  const lo = Math.min(...logged);
  const hi = Math.max(...logged);
  const span = hi - lo || 1;
  const x = (i: number) => 2 + (values.length <= 1 ? 0 : (i * (width - 4)) / (values.length - 1));
  const y = (v: number) => 3 + ((hi - v) / span) * (height - 6);

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && logged.length > 0 && (
        <Svg width={width} height={height}>
          {runs(values).map((run) =>
            run.length === 1 ? (
              <Rect key={run[0].index} x={x(run[0].index) - 1.5} y={y(run[0].value) - 1.5} width={3} height={3} rx={1.5} fill={color} />
            ) : (
              <Path
                key={run[0].index}
                d={smoothPath(run.map((p) => ({ x: x(p.index), y: y(p.value) })))}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
            ),
          )}
        </Svg>
      )}
    </View>
  );
}

/** One thin bar per day in the given color; days without a color are faint stubs. */
export function ColorBars({ colors, height = 28, faint }: { colors: (string | null)[]; height?: number; faint: string }) {
  const { width, onLayout } = useWidth();
  const n = colors.length;
  const gap = n > 40 ? 0.5 : 2;
  const barWidth = Math.max((width - gap * (n - 1)) / n, 1);

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {colors.map((c, i) => (
            <Rect
              key={i}
              x={i * (barWidth + gap)}
              y={c ? 0 : height - 4}
              width={barWidth}
              height={c ? height : 4}
              rx={Math.min(barWidth / 2, 3)}
              fill={c ?? faint}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}
