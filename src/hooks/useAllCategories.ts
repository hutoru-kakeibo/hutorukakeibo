"use client";

import { useMemo } from "react";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/categories";
import type { AnyCategory } from "@/lib/expenses/types";

const UNKNOWN_CATEGORY: AnyCategory = { id: "", label: "不明なカテゴリ", emoji: "❓", isCustom: false };

/** 固定カテゴリとカスタムカテゴリを合わせて扱うためのフック */
export function useAllCategories() {
  const { customCategories } = useCustomCategories();

  const categories = useMemo<AnyCategory[]>(
    () => [
      ...EXPENSE_CATEGORIES.map((category) => ({ ...category, isCustom: false })),
      ...customCategories.map((category) => ({ ...category, isCustom: true })),
    ],
    [customCategories],
  );

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const resolve = (categoryId: string): AnyCategory =>
    byId.get(categoryId) ?? { ...UNKNOWN_CATEGORY, id: categoryId };

  return { categories, resolve };
}
