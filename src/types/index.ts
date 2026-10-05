export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner', 'Evening'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type FoodSource = 'off' | 'usda' | 'custom' | 'recipe';

export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrition = Record<NutrientKey, number>;

/** Nutrition values are per one serving (serving_size serving_unit). */
export type Food = Nutrition & {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  /** Id in the source database (e.g. USDA fdcId); null for custom foods. */
  external_id: string | null;
  /** JSON-encoded ServingOption[] of household measures fetched from the source; null if never fetched. */
  portions: string | null;
  source: FoodSource;
  serving_size: number;
  serving_unit: string;
  /** The serving as printed on the label (e.g. "3/4 cup (20g)"), when the source provided it. */
  serving_label: string | null;
};

/** A selectable serving size, e.g. { label: "1 cup, sliced (150 g)", size: 150, unit: "g" }. */
export type ServingOption = { label: string; size: number; unit: string };

/** A food returned by an external database (USDA / Open Food Facts), not yet saved locally. */
export type LookupFood = Pick<
  Food,
  'name' | 'brand' | 'barcode' | 'external_id' | 'serving_size' | 'serving_unit' | NutrientKey
> & {
  external_id: string;
  source: 'usda' | 'off';
  /** The serving as printed on the label (e.g. "2 tbsp (30 g)"), when the source provides it. */
  serving_label?: string | null;
  /** Household measures; undefined means not fetched yet, [] means fetched and none exist. */
  portions?: ServingOption[];
};

/** Nutrition values are a snapshot of one serving of serving_size serving_unit, taken when the entry was logged. */
export type DiaryEntry = Nutrition & {
  id: number;
  date: string;
  meal_slot: MealSlot;
  food_id: number | null;
  name: string;
  servings: number;
  serving_size: number;
  serving_unit: string;
  /** Household wording for the serving (e.g. "1 cup, sliced (150 g)"); null means show serving_size + unit. */
  serving_label: string | null;
};
