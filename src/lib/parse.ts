/** Parses user-typed numbers, accepting a comma as the decimal separator. Returns null if blank or invalid. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
