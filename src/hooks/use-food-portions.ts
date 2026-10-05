import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { saveFoodPortions } from '@/db/foods';
import { parsePortions } from '@/lib/serving-options';
import { fetchUsdaPortions } from '@/services/usda';
import type { Food, ServingOption } from '@/types';

/**
 * Household measures for a saved food. Uses what's stored; for non-branded USDA foods that haven't been
 * looked up yet, fetches them once and stores them so they work offline afterwards.
 */
export function useFoodPortions(food: Food | null) {
  const db = useSQLiteContext();
  const [portions, setPortions] = useState<ServingOption[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!food) return;
    const stored = parsePortions(food.portions);
    setPortions(stored);
    setLoading(false);
    if (stored !== undefined || food.source !== 'usda' || food.barcode || !food.external_id) return;

    let cancelled = false;
    setLoading(true);
    fetchUsdaPortions(food.external_id)
      .then(async (fetched) => {
        await saveFoodPortions(db, food.id, fetched);
        if (!cancelled) setPortions(fetched);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, food]);

  return { portions, loading };
}
