"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CategoryPieChart, PIE_COLORS } from "@/components/stats/CategoryPieChart";
import { DailyBarChart } from "@/components/stats/DailyBarChart";
import { DiagnosisCard } from "@/components/stats/DiagnosisCard";
import { useCategoryBudgets } from "@/contexts/CategoryBudgetsContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { diagnoseMonth } from "@/lib/character/diagnosis";
import { getMonthKey, groupExpensesByCategory, groupExpensesByDay, sumExpensesForMonth } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

export default function StatsPage() {
  const { activeHousehold } = useHousehold();
  const monthlyBudget = activeHousehold?.monthlyBudget ?? 0;
  const { expenses } = useExpenses();
  const { categories } = useAllCategories();
  const { categoryBudgets } = useCategoryBudgets();
  const monthKey = getMonthKey();

  const monthlySpent = useMemo(() => sumExpensesForMonth(expenses, monthKey), [expenses, monthKey]);
  const categoryTotals = useMemo(
    () => groupExpensesByCategory(expenses, monthKey, categories),
    [expenses, monthKey, categories],
  );
  const dailyTotals = useMemo(() => groupExpensesByDay(expenses, monthKey), [expenses, monthKey]);
  const diagnosis = useMemo(
    () => diagnoseMonth(expenses, monthlyBudget, monthKey, categories, categoryBudgets),
    [expenses, monthlyBudget, monthKey, categories, categoryBudgets],
  );

  const hasData = categoryTotals.length > 0;

  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4">
      <header>
        <h1 className="text-lg font-bold">統計・診断</h1>
        <p className="text-xs text-ink-muted">今月の支出: {formatYen(monthlySpent)}</p>
      </header>

      <DiagnosisCard diagnosis={diagnosis} />

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-muted">カテゴリ別の内訳</h2>
          <Link href="/stats/transactions" className="text-xs font-bold text-brand-600">
            すべての取引を見る →
          </Link>
        </div>
        {hasData ? (
          <>
            <CategoryPieChart data={categoryTotals} />
            <ul className="mt-2 space-y-1.5">
              {categoryTotals.map((entry, index) => (
                <li key={entry.categoryId}>
                  <Link
                    href={`/stats/transactions?category=${entry.categoryId}`}
                    className="flex items-center justify-between rounded-lg px-1 py-0.5 text-xs transition-colors active:bg-canvas"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      {entry.emoji} {entry.label}
                    </span>
                    <span className="text-ink-muted">
                      {formatYen(entry.total)}（{entry.percent}%）
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">まだ記録がありません</p>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink-muted">日別の支出</h2>
        {hasData ? (
          <DailyBarChart data={dailyTotals} />
        ) : (
          <p className="mt-3 text-sm text-ink-muted">まだ記録がありません</p>
        )}
      </section>
    </div>
  );
}
