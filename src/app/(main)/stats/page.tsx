"use client";

import Link from "next/link";
import { useMemo } from "react";
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
import {
  getMonthKey,
  groupExpensesByCategory,
  groupExpensesByDay,
  sumExpensesForMonth,
  type CategoryTotal,
  type DailyTotal,
} from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

const INCOME_BAR_COLOR = "#38bdf8";

function CategoryBreakdownSection({
  title,
  categoryTotals,
  transactionsHref,
}: {
  title: string;
  categoryTotals: CategoryTotal[];
  transactionsHref: string;
}) {
  const hasData = categoryTotals.length > 0;
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-muted">{title}</h2>
        <Link href={transactionsHref} className="text-xs font-bold text-brand-600">
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
  );
}

function DailyBreakdownSection({
  title,
  dailyTotals,
  hasData,
  color,
  dailyAverage,
}: {
  title: string;
  dailyTotals: DailyTotal[];
  hasData: boolean;
  color?: string;
  dailyAverage: number;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-ink-muted">{title}</h2>
        {hasData && (
          <span className="text-xs text-ink-muted">1日あたりの平均 {formatYen(Math.round(dailyAverage))}</span>
        )}
      </div>
      {hasData ? (
        <DailyBarChart data={dailyTotals} color={color} />
      ) : (
        <p className="mt-3 text-sm text-ink-muted">まだ記録がありません</p>
      )}
    </section>
  );
}

export default function StatsPage() {
  const { activeHousehold } = useHousehold();
  const monthlyBudget = activeHousehold?.monthlyBudget ?? 0;
  const { expenses, incomes } = useExpenses();
  const { categories } = useAllCategories();
  const { categoryBudgets } = useCategoryBudgets();
  const monthKey = getMonthKey();

  const monthlySpent = useMemo(() => sumExpensesForMonth(expenses, monthKey), [expenses, monthKey]);
  const monthlyIncome = useMemo(() => sumExpensesForMonth(incomes, monthKey), [incomes, monthKey]);
  const diagnosis = useMemo(
    () => diagnoseMonth(expenses, monthlyBudget, monthKey, categories, categoryBudgets),
    [expenses, monthlyBudget, monthKey, categories, categoryBudgets],
  );

  const expenseCategoryTotals = useMemo(
    () => groupExpensesByCategory(expenses, monthKey, categories),
    [expenses, monthKey, categories],
  );
  const incomeCategoryTotals = useMemo(
    () => groupExpensesByCategory(incomes, monthKey, INCOME_CATEGORIES),
    [incomes, monthKey],
  );
  const expenseDailyTotals = useMemo(() => groupExpensesByDay(expenses, monthKey), [expenses, monthKey]);
  const incomeDailyTotals = useMemo(() => groupExpensesByDay(incomes, monthKey), [incomes, monthKey]);

  // このアプリは当月のみを扱うため、経過日数は「今日の日付」でそのまま求められる
  const elapsedDays = new Date().getDate();
  const expenseDailyAverage = monthlySpent / elapsedDays;
  const incomeDailyAverage = monthlyIncome / elapsedDays;

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

      <CategoryBreakdownSection
        title="カテゴリ別の支出内訳"
        categoryTotals={expenseCategoryTotals}
        transactionsHref="/stats/transactions"
      />
      <DailyBreakdownSection
        title="日別の支出"
        dailyTotals={expenseDailyTotals}
        hasData={expenseCategoryTotals.length > 0}
        dailyAverage={expenseDailyAverage}
      />

      <CategoryBreakdownSection
        title="カテゴリ別の収入内訳"
        categoryTotals={incomeCategoryTotals}
        transactionsHref="/stats/transactions"
      />
      <DailyBreakdownSection
        title="日別の収入"
        dailyTotals={incomeDailyTotals}
        hasData={incomeCategoryTotals.length > 0}
        color={INCOME_BAR_COLOR}
        dailyAverage={incomeDailyAverage}
      />
    </div>
  );
}
