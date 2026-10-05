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
  source: FoodSource;
  serving_size: number;
  serving_unit: string;
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
};
