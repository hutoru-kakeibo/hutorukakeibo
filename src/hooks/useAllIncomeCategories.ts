"use client";

import { useMemo } from "react";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { INCOME_CATEGORIES } from "@/lib/expenses/incomeCategories";
import type { AnyCategory } from "@/lib/expenses/types";

const UNKNOWN_CATEGORY: AnyCategory = { id: "", label: "不明なカテゴリ", emoji: "❓", isCustom: false };

/** 固定の収入カテゴリとカスタム収入カテゴリを合わせて扱うためのフック（useAllCategories の収入版） */
export function useAllIncomeCategories() {
  const { customIncomeCategories } = useCustomCategories();
  const { activeHousehold } = useHousehold();

  const categories = useMemo<AnyCategory[]>(() => {
    const categoryOrder = activeHousehold?.incomeCategoryOrder ?? [];
    const combined = [
      ...INCOME_CATEGORIES.map((category) => ({ ...category, isCustom: false })),
      ...customIncomeCategories.map((category) => ({ ...category, isCustom: true })),
    ];
    if (categoryOrder.length === 0) return combined;

    const rank = new Map(categoryOrder.map((id, index) => [id, index]));
    return [...combined].sort((a, b) => {
      const rankA = rank.get(a.id) ?? categoryOrder.length;
      const rankB = rank.get(b.id) ?? categoryOrder.length;
      return rankA - rankB;
    });
  }, [customIncomeCategories, activeHousehold?.incomeCategoryOrder]);

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const resolve = (categoryId: string): AnyCategory =>
    byId.get(categoryId) ?? { ...UNKNOWN_CATEGORY, id: categoryId };

  return { categories, resolve };
}
