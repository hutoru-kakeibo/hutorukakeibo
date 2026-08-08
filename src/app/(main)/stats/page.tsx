"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryBudgetProgressList } from "@/components/expenses/CategoryBudgetProgressList";
import { CategoryPieChart, PIE_COLORS } from "@/components/stats/CategoryPieChart";
import { DailyBarChart } from "@/components/stats/DailyBarChart";
import { DiagnosisCard } from "@/components/stats/DiagnosisCard";
import { useCategoryBudgets } from "@/contexts/CategoryBudgetsContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { diagnoseMonth } from "@/lib/character/diagnosis";
import { INCOME_CATEGORIES } from "@/lib/expenses/incomeCategories";
import { getMonthKey, groupExpensesByCategory, groupExpensesByDay, sumExpensesForMonth } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

type ViewType = "expense" | "income";

const INCOME_BAR_COLOR = "#38bdf8";

export default function StatsPage() {
  const { activeHousehold } = useHousehold();
  const monthlyBudget = activeHousehold?.monthlyBudget ?? 0;
  const { expenses, incomes } = useExpenses();
  const { categories } = useAllCategories();
  const { categoryBudgets } = useCategoryBudgets();
  const monthKey = getMonthKey();

  const [viewType, setViewType] = useState<ViewType>("expense");

  const monthlySpent = useMemo(() => sumExpensesForMonth(expenses, monthKey), [expenses, monthKey]);
  const monthlyIncome = useMemo(() => sumExpensesForMonth(incomes, monthKey), [incomes, monthKey]);
  const diagnosis = useMemo(
    () => diagnoseMonth(expenses, monthlyBudget, monthKey, categories, categoryBudgets),
    [expenses, monthlyBudget, monthKey, categories, categoryBudgets],
  );

  const viewTransactions = viewType === "income" ? incomes : expenses;
  const viewCategories = viewType === "income" ? INCOME_CATEGORIES : categories;
  const categoryTotals = useMemo(
    () => groupExpensesByCategory(viewTransactions, monthKey, viewCategories),
    [viewTransactions, monthKey, viewCategories],
  );
  const dailyTotals = useMemo(
    () => groupExpensesByDay(viewTransactions, monthKey),
    [viewTransactions, monthKey],
  );

  const hasData = categoryTotals.length > 0;

  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4">
      <header>
        <h1 className="text-lg font-bold">統計・診断</h1>
        <p className="text-xs text-ink-muted">
          今月の支出: {formatYen(monthlySpent)} ・ 今月の収入: {formatYen(monthlyIncome)}
        </p>
      </header>

      <DiagnosisCard diagnosis={diagnosis} />

      <CategoryBudgetProgressList />

      <div className="flex gap-1 rounded-2xl bg-canvas p-1">
        <button
          type="button"
          onClick={() => setViewType("expense")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
            viewType === "expense" ? "bg-surface shadow-sm" : "text-ink-muted"
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setViewType("income")}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
            viewType === "income" ? "bg-surface shadow-sm" : "text-ink-muted"
          }`}
        >
          収入
        </button>
      </div>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-muted">カテゴリ別の内訳</h2>
          <Link href={`/stats/transactions?type=${viewType}`} className="text-xs font-bold text-brand-600">
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
                    href={`/stats/transactions?type=${viewType}&category=${entry.categoryId}`}
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
        <h2 className="text-sm font-bold text-ink-muted">{viewType === "income" ? "日別の収入" : "日別の支出"}</h2>
        {hasData ? (
          <DailyBarChart data={dailyTotals} color={viewType === "income" ? INCOME_BAR_COLOR : undefined} />
        ) : (
          <p className="mt-3 text-sm text-ink-muted">まだ記録がありません</p>
        )}
      </section>
    </div>
  );
}
