/** Dark text on light backgrounds and white text on dark ones, so numbers stay readable on any theme color. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1B1B16' : '#ffffff';
}
