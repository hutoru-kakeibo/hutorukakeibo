"use client";

import { useState } from "react";
import { useCategoryBudgets } from "@/contexts/CategoryBudgetsContext";
import { useAllCategories } from "@/hooks/useAllCategories";

export function CategoryBudgetsSection() {
  const { categories } = useAllCategories();
  const { categoryBudgets, setCategoryBudget, removeCategoryBudget } = useCategoryBudgets();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const budgetFor = (categoryId: string) =>
    categoryBudgets.find((entry) => entry.categoryId === categoryId)?.monthlyBudget;

  const draftFor = (categoryId: string) => {
    if (drafts[categoryId] !== undefined) return drafts[categoryId];
    const current = budgetFor(categoryId);
    return current ? String(current) : "";
  };

  const handleBlur = async (categoryId: string) => {
    const raw = drafts[categoryId];
    if (raw === undefined) return;

    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value <= 0) {
      if (budgetFor(categoryId) !== undefined) await removeCategoryBudget(categoryId);
    } else {
      await setCategoryBudget(categoryId, Math.round(value));
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <p className="text-xs font-bold text-ink-muted">カテゴリ別の予算（任意）</p>
      <p className="mt-1 text-[11px] text-ink-muted">
        全体の予算とは別に、カテゴリごとに予算を設定できます。超過すると「統計」の診断でお知らせします。
      </p>
      <ul className="mt-3 space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs">
              {category.emoji} {category.label}
            </span>
            <span className="text-ink-muted">¥</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="未設定"
              value={draftFor(category.id)}
              onChange={(event) =>
                setDrafts((prev) => ({
                  ...prev,
                  [category.id]: event.target.value.replace(/[^0-9]/g, ""),
                }))
              }
              onBlur={() => void handleBlur(category.id)}
              className="w-full min-w-0 rounded-xl bg-canvas px-3 py-1.5 text-sm outline-none"
            />
          </li>
        ))}
      </ul>
      {categoryBudgets.length > 0 && (
        <p className="mt-3 text-[11px] text-ink-muted">
          設定済み: {categoryBudgets.length}件（0円または空欄にすると解除されます）
        </p>
      )}
    </section>
  );
}
