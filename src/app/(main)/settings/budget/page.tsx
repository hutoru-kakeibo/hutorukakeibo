"use client";

import Link from "next/link";
import { useCategoryBudgets } from "@/contexts/CategoryBudgetsContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { formatYen } from "@/lib/format";

export default function BudgetManagePage() {
  const { activeHousehold } = useHousehold();
  const { categoryBudgets } = useCategoryBudgets();

  return (
    <div className="flex flex-col gap-4 px-6 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" aria-label="設定に戻る" className="text-lg text-ink-muted">
          ←
        </Link>
        <h1 className="text-lg font-bold">予算管理</h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm">
        <Link
          href="/settings/budget/overall"
          className="flex items-center justify-between px-5 py-4 active:bg-canvas"
        >
          <div>
            <p className="text-sm font-medium">家計簿全体の予算</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatYen(activeHousehold?.monthlyBudget ?? 0)}
            </p>
          </div>
          <span aria-hidden className="text-ink-muted">
            ›
          </span>
        </Link>
        <div className="h-px bg-black/5" />
        <Link
          href="/settings/budget/categories"
          className="flex items-center justify-between px-5 py-4 active:bg-canvas"
        >
          <div>
            <p className="text-sm font-medium">カテゴリ別の予算</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {categoryBudgets.length > 0 ? `${categoryBudgets.length}件設定中` : "未設定"}
            </p>
          </div>
          <span aria-hidden className="text-ink-muted">
            ›
          </span>
        </Link>
      </div>
    </div>
  );
}
