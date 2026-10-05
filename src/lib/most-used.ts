export type ListSection<T> = { title: string | null; data: T[] };

/**
 * Splits an alphabetical list into a "Most used" group (up to `limit` items that have been used, most used first)
 * and the rest. While searching there are no groups: used items just come first.
 */
export function groupMostUsed<T extends { use_count: number }>(
  items: T[],
  searching: boolean,
  restTitle: string,
  limit = 5,
): ListSection<T>[] {
  if (items.length === 0) return [];
  const used = items.filter((i) => i.use_count > 0).sort((a, b) => b.use_count - a.use_count);
  if (used.length === 0) return [{ title: null, data: items }];
  if (searching) return [{ title: null, data: [...used, ...items.filter((i) => i.use_count === 0)] }];

  const top = used.slice(0, limit);
  const rest = items.filter((i) => !top.includes(i));
  return rest.length > 0
    ? [
        { title: 'Most used', data: top },
        { title: restTitle, data: rest },
      ]
    : [{ title: 'Most used', data: top }];
}
