"use client";

import Link from "next/link";
import { useState } from "react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { formatYen } from "@/lib/format";

export default function OverallBudgetPage() {
  const { activeHousehold, setMonthlyBudget } = useHousehold();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const budgetDraft = draft ?? String(activeHousehold?.monthlyBudget ?? 0);

  const handleSaveBudget = () => {
    const value = Number(budgetDraft);
    if (Number.isFinite(value) && value >= 0) void setMonthlyBudget(Math.round(value));
  };

  return (
    <div className="flex flex-col gap-4 px-6 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/settings/budget" aria-label="予算管理に戻る" className="text-lg text-ink-muted">
          ←
        </Link>
        <h1 className="text-lg font-bold">家計簿全体の予算</h1>
      </div>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <label htmlFor="monthlyBudget" className="text-xs font-bold text-ink-muted">
          表示中の家計簿の予算
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ink-muted">¥</span>
          <input
            id="monthlyBudget"
            inputMode="numeric"
            pattern="[0-9]*"
            value={budgetDraft}
            onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-canvas px-3 py-2 text-lg font-bold outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          現在の設定: {formatYen(activeHousehold?.monthlyBudget ?? 0)}
        </p>
        <button
          type="button"
          onClick={handleSaveBudget}
          className="mt-4 w-full rounded-xl bg-brand-500 py-2 text-sm font-bold text-white"
        >
          保存する
        </button>
      </section>
    </div>
  );
}
