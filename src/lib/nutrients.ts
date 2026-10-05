import type { Goals } from '@/db/settings';
import type { NutrientKey } from '@/types';

export type NutrientDef = {
  key: NutrientKey;
  label: string;
  unit: string;
  /** 'main' nutrients are always shown; 'more' ones are hidden on an entry when they are zero. */
  group: 'main' | 'more';
  /** Sub-types of fat are indented under Fat. */
  indent?: boolean;
  /** The daily goal this nutrient is measured against, if it has one. */
  goal?: keyof Goals;
};

/** In the order they appear on the Nutrients view. */
export const NUTRIENTS: NutrientDef[] = [
  { key: 'calories', label: 'Calories', unit: 'cal', group: 'main', goal: 'calories' },
  { key: 'protein', label: 'Protein', unit: 'g', group: 'main', goal: 'protein' },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', group: 'main', goal: 'carbs' },
  { key: 'fiber', label: 'Fiber', unit: 'g', group: 'main', goal: 'fiber' },
  { key: 'sugar', label: 'Sugar', unit: 'g', group: 'main', goal: 'sugar' },
  { key: 'fat', label: 'Fat', unit: 'g', group: 'main', goal: 'fat' },
  { key: 'sat_fat', label: 'Saturated Fat', unit: 'g', group: 'more', indent: true },
  { key: 'poly_fat', label: 'Polyunsaturated Fat', unit: 'g', group: 'more', indent: true },
  { key: 'mono_fat', label: 'Monounsaturated Fat', unit: 'g', group: 'more', indent: true },
  { key: 'trans_fat', label: 'Trans Fat', unit: 'g', group: 'more', indent: true },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', group: 'more' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'more', goal: 'sodium' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'more' },
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'mcg', group: 'more' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', group: 'more' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'more' },
  { key: 'iron', label: 'Iron', unit: 'mg', group: 'more' },
];
