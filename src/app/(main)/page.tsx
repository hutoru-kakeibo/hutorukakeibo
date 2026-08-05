"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import { HouseholdSwitcher } from "@/components/household/HouseholdSwitcher";
import { ShareButton } from "@/components/share/ShareButton";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { computeCharacterStatus } from "@/lib/character/logic";
import { getMonthKey, sumExpensesForMonth } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

export default function HomePage() {
  const { user } = useAuth();
  const { activeHousehold, loading: householdLoading } = useHousehold();
  const { expenses, removeExpense } = useExpenses();
  const { resolve } = useAllCategories();

  const monthlyBudget = activeHousehold?.monthlyBudget ?? 0;
  const monthKey = getMonthKey();
  const monthlySpent = useMemo(
    () => sumExpensesForMonth(expenses, monthKey),
    [expenses, monthKey],
  );
  const status = useMemo(
    () => computeCharacterStatus(monthlySpent, monthlyBudget),
    [monthlySpent, monthlyBudget],
  );
  const remaining = monthlyBudget - monthlySpent;
  const progressPercent = monthlyBudget > 0 ? Math.min(100, (monthlySpent / monthlyBudget) * 100) : 100;

  const myDisplayName =
    activeHousehold?.members.find((member) => member.userId === user?.id)?.displayName ??
    user?.user_metadata?.full_name ??
    user?.email ??
    "ゲスト";

  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [expenses],
  );

  if (householdLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 pt-8">
        <p className="text-sm text-ink-muted">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-ink-muted">{myDisplayName} さん、こんにちは</p>
        <HouseholdSwitcher />
      </header>

      <CharacterAvatar status={status} />

      <section className="rounded-2xl bg-surface p-5 text-center shadow-sm">
        <p className="text-lg font-bold" style={{ color: status.accentColor }}>
          {status.label}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{status.message}</p>
      </section>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-muted">今月の支出</span>
          <span className="text-xs text-ink-muted">予算 {formatYen(monthlyBudget)}</span>
        </div>
        <p className="mt-1 text-2xl font-bold">{formatYen(monthlySpent)}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, backgroundColor: status.accentColor }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {remaining >= 0 ? `残り ${formatYen(remaining)}` : `${formatYen(Math.abs(remaining))} 超過`}
        </p>
      </section>

      <Link
        href="/input"
        className="rounded-2xl bg-brand-500 py-3 text-center text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
      >
        + 支出を記録する
      </Link>

      <ShareButton status={status} spent={monthlySpent} budget={monthlyBudget} monthKey={monthKey} />

      <section>
        <h2 className="text-sm font-bold text-ink-muted">最近の記録</h2>
        {recentExpenses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">まだ記録がありません</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recentExpenses.map((expense) => {
              const category = resolve(expense.categoryId);
              return (
                <li
                  key={expense.id}
                  className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="text-lg">
                      {category.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{category.label}</p>
                      <p className="text-xs text-ink-muted">
                        {expense.date}
                        {expense.memo ? ` ・ ${expense.memo}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{formatYen(expense.amount)}</span>
                    <button
                      type="button"
                      onClick={() => void removeExpense(expense.id)}
                      aria-label="削除"
                      className="text-ink-muted"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
