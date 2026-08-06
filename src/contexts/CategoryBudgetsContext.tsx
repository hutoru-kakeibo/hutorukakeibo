"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryBudget } from "@/lib/expenses/types";
import { useHousehold } from "./HouseholdContext";

interface CategoryBudgetsContextValue {
  categoryBudgets: CategoryBudget[];
  loading: boolean;
  setCategoryBudget: (categoryId: string, amount: number) => Promise<void>;
  removeCategoryBudget: (categoryId: string) => Promise<void>;
}

const CategoryBudgetsContext = createContext<CategoryBudgetsContextValue | null>(null);

export function CategoryBudgetsProvider({ children }: { children: ReactNode }) {
  const { activeHousehold } = useHousehold();
  const supabase = useMemo(() => createClient(), []);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 効果(useEffect)本体から同期的に setState してしまわないよう、必ずマイクロタスクを1つ挟む
    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!activeHousehold) {
        setCategoryBudgets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("category_budgets")
        .select("category_id, monthly_budget")
        .eq("household_id", activeHousehold.id);
      if (cancelled) return;
      if (error) console.error("[category_budgets] 一覧の取得に失敗しました", error);
      setCategoryBudgets(
        (data ?? []).map((row) => ({ categoryId: row.category_id, monthlyBudget: row.monthly_budget })),
      );
      setLoading(false);
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [supabase, activeHousehold]);

  const setCategoryBudget = useCallback(
    async (categoryId: string, amount: number) => {
      if (!activeHousehold) return;
      const { data, error } = await supabase
        .from("category_budgets")
        .upsert(
          { household_id: activeHousehold.id, category_id: categoryId, monthly_budget: amount },
          { onConflict: "household_id,category_id" },
        )
        .select("category_id, monthly_budget")
        .single();

      if (error) {
        console.error("[category_budgets] 保存に失敗しました", error);
        return;
      }
      if (data) {
        setCategoryBudgets((prev) => [
          ...prev.filter((entry) => entry.categoryId !== data.category_id),
          { categoryId: data.category_id, monthlyBudget: data.monthly_budget },
        ]);
      }
    },
    [supabase, activeHousehold],
  );

  const removeCategoryBudget = useCallback(
    async (categoryId: string) => {
      if (!activeHousehold) return;
      const { error } = await supabase
        .from("category_budgets")
        .delete()
        .eq("household_id", activeHousehold.id)
        .eq("category_id", categoryId);

      if (error) {
        console.error("[category_budgets] 削除に失敗しました", error);
        return;
      }
      setCategoryBudgets((prev) => prev.filter((entry) => entry.categoryId !== categoryId));
    },
    [supabase, activeHousehold],
  );

  const value = useMemo<CategoryBudgetsContextValue>(
    () => ({ categoryBudgets, loading, setCategoryBudget, removeCategoryBudget }),
    [categoryBudgets, loading, setCategoryBudget, removeCategoryBudget],
  );

  return <CategoryBudgetsContext.Provider value={value}>{children}</CategoryBudgetsContext.Provider>;
}

export function useCategoryBudgets() {
  const ctx = useContext(CategoryBudgetsContext);
  if (!ctx) throw new Error("useCategoryBudgets must be used within CategoryBudgetsProvider");
  return ctx;
}
