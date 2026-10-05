export type Pt = { x: number; y: number };

/** An SVG path through the points, smoothed so it never overshoots the data (monotone cubic). */
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p.x - pts[i].x);
  const slope = pts.slice(1).map((p, i) => (p.y - pts[i].y) / dx[i]);

  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const size = Math.hypot(a, b);
    if (size > 3) {
      tangent[i] = (3 * a * slope[i]) / size;
      tangent[i + 1] = (3 * b * slope[i]) / size;
    }
  }

  const f = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C ${f(pts[i].x + h)} ${f(pts[i].y + tangent[i] * h)} ${f(pts[i + 1].x - h)} ${f(pts[i + 1].y - tangent[i + 1] * h)} ${f(pts[i + 1].x)} ${f(pts[i + 1].y)}`;
  }
  return d;
}

/** Splits a series into runs of consecutive non-null values, keeping each value's index. */
export function runs<T>(values: (T | null)[]): { index: number; value: T }[][] {
  const out: { index: number; value: T }[][] = [];
  let current: { index: number; value: T }[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) out.push(current);
      current = [];
    } else {
      current.push({ index, value });
    }
  });
  if (current.length > 0) out.push(current);
  return out;
}
