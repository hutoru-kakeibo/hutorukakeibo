"use client";

import { useMemo } from "react";
import { useCategoryBudgets } from "@/contexts/CategoryBudgetsContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { getMonthKey, sumExpensesByCategoryId } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

/**
 * カテゴリ別予算が1件でも設定されていれば、当月の支出との比較を進捗バーで表示する。
 * 未設定のカテゴリは表示しない（households.monthly_budget の全体予算とは別枠）。
 */
export function CategoryBudgetProgressList() {
  const { categoryBudgets } = useCategoryBudgets();
  const { expenses } = useExpenses();
  const { resolve } = useAllCategories();

  const rows = useMemo(() => {
    if (categoryBudgets.length === 0) return [];
    const monthKey = getMonthKey();
    const spentByCategory = sumExpensesByCategoryId(expenses, monthKey);

    return categoryBudgets
      .map((budget) => {
        const category = resolve(budget.categoryId);
        const spent = spentByCategory.get(budget.categoryId) ?? 0;
        const percent = budget.monthlyBudget > 0 ? (spent / budget.monthlyBudget) * 100 : 0;
        return { ...budget, category, spent, percent };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [categoryBudgets, expenses, resolve]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-bold text-ink-muted">カテゴリ別予算</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const over = row.spent > row.monthlyBudget;
          const barColor = over ? "#ef4444" : row.percent >= 80 ? "#f59e0b" : "#22a06b";
          return (
            <li key={row.categoryId}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span aria-hidden>{row.category.emoji}</span>
                  {row.category.label}
                </span>
                <span className={over ? "font-bold text-status-over" : "text-ink-muted"}>
                  {formatYen(row.spent)} / {formatYen(row.monthlyBudget)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, row.percent)}%`, backgroundColor: barColor }}
                />
              </div>
              {over && (
                <p className="mt-0.5 text-[11px] text-status-over">
                  {formatYen(row.spent - row.monthlyBudget)} 超過
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
