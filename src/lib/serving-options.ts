import type { Food, ServingOption } from '@/types';

export const plainServing = (size: number, unit: string) => `${size} ${unit}`;

/** The food's own serving first, then handy gram/ml amounts, then household measures from the source. */
export function buildServingOptions(
  food: Pick<Food, 'serving_size' | 'serving_unit'> & { serving_label?: string | null },
  portions: ServingOption[] = [],
): ServingOption[] {
  const { serving_size: size, serving_unit: unit } = food;
  const options: ServingOption[] = [
    { label: food.serving_label?.trim() || plainServing(size, unit), size, unit },
  ];

  const isMass = unit === 'g';
  if (isMass || unit === 'ml') {
    const quick: ServingOption[] = [{ label: plainServing(1, unit), size: 1, unit }];
    if (isMass) quick.push({ label: '1 oz (28.35 g)', size: 28.35, unit });
    quick.push({ label: plainServing(100, unit), size: 100, unit });
    for (const option of quick) {
      if (!options.some((o) => o.size === option.size)) options.push(option);
    }
  }

  if (isMass) {
    for (const portion of portions) {
      if (!options.some((o) => o.label === portion.label)) options.push(portion);
    }
  }
  return options;
}

/** Only store a household label when it says more than "<size> <unit>". */
export function labelForEntry(option: ServingOption): string | null {
  return option.label === plainServing(option.size, option.unit) ? null : option.label;
}

export function parsePortions(json: string | null): ServingOption[] | undefined {
  if (json === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ServingOption[]) : undefined;
  } catch {
    return undefined;
  }
}
