"use client";

import { useMemo } from "react";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/categories";
import type { AnyCategory } from "@/lib/expenses/types";

const UNKNOWN_CATEGORY: AnyCategory = { id: "", label: "不明なカテゴリ", emoji: "❓", isCustom: false };

/** 固定カテゴリとカスタムカテゴリを合わせて扱うためのフック */
export function useAllCategories() {
  const { customCategories } = useCustomCategories();
  const { activeHousehold } = useHousehold();

  const categories = useMemo<AnyCategory[]>(() => {
    const categoryOrder = activeHousehold?.categoryOrder ?? [];
    const combined = [
      ...EXPENSE_CATEGORIES.map((category) => ({ ...category, isCustom: false })),
      ...customCategories.map((category) => ({ ...category, isCustom: true })),
    ];
    if (categoryOrder.length === 0) return combined;

    const rank = new Map(categoryOrder.map((id, index) => [id, index]));
    return [...combined].sort((a, b) => {
      const rankA = rank.get(a.id) ?? categoryOrder.length;
      const rankB = rank.get(b.id) ?? categoryOrder.length;
      return rankA - rankB;
    });
  }, [customCategories, activeHousehold?.categoryOrder]);

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const resolve = (categoryId: string): AnyCategory =>
    byId.get(categoryId) ?? { ...UNKNOWN_CATEGORY, id: categoryId };

  return { categories, resolve };
}
