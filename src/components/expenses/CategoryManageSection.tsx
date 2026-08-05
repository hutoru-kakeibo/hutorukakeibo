"use client";

import { PaywallNotice } from "@/components/billing/PaywallNotice";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/categories";

export function CategoryManageSection() {
  const { activeHousehold } = useHousehold();
  const { customCategories, removeCustomCategory } = useCustomCategories();
  const isPremium = activeHousehold?.plan === "premium";

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink-muted">カテゴリ管理</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isPremium ? "bg-brand-100 text-brand-700" : "bg-canvas text-ink-muted"
          }`}
        >
          {isPremium ? "プレミアム" : "フリープラン"}
        </span>
      </div>

      <p className="mt-3 text-[11px] text-ink-muted">標準カテゴリ</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {EXPENSE_CATEGORIES.map((category) => (
          <span key={category.id} className="rounded-full bg-canvas px-3 py-1 text-xs text-ink-muted">
            {category.emoji} {category.label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-ink-muted">独自カテゴリ（プレミアム限定）</p>
      {customCategories.length === 0 ? (
        <p className="mt-1 text-xs text-ink-muted">まだ追加されていません</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {customCategories.map((category) => (
            <li key={category.id} className="flex items-center justify-between text-xs">
              <span>
                {category.emoji} {category.label}
              </span>
              <button
                type="button"
                onClick={() => void removeCustomCategory(category.id)}
                className="text-status-over"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isPremium && (
        <div className="mt-4">
          <PaywallNotice message="独自のカテゴリを追加できるのはプレミアムプラン限定です" />
        </div>
      )}
      {isPremium && (
        <p className="mt-3 text-[11px] text-ink-muted">
          新しいカテゴリは「支出を記録する」画面の「＋追加」から作成できます
        </p>
      )}
    </section>
  );
}
