"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PaywallNotice } from "@/components/billing/PaywallNotice";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { CUSTOM_CATEGORY_EMOJIS, DEFAULT_CUSTOM_CATEGORY_EMOJI } from "@/lib/expenses/customCategoryEmojis";
import type { Expense } from "@/lib/expenses/types";

function todayDateString(): string {
  const now = new Date();
  const localMidnightOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - localMidnightOffsetMs).toISOString().slice(0, 10);
}

interface ExpenseFormProps {
  /** 指定すると編集モードになる */
  expense?: Expense;
}

export function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter();
  const { addExpense, updateExpense, removeExpense } = useExpenses();
  const { activeHousehold } = useHousehold();
  const { categories } = useAllCategories();
  const { addCustomCategory, removeCustomCategory } = useCustomCategories();
  const isEditing = Boolean(expense);
  const isPremium = activeHousehold?.plan === "premium";

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(expense?.date ?? todayDateString);
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState<string>(DEFAULT_CUSTOM_CATEGORY_EMOJI);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  // window.confirm() は iOS の PWA（ホーム画面から起動したアプリ）で正しく動作しないことがあるため、
  // アプリ内の確認パネルに置き換えている。
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("金額は1円以上で入力してください");
      return;
    }
    if (!categoryId) {
      setError("カテゴリを選択してください");
      return;
    }

    setSubmitting(true);
    const input = { amount: Math.round(parsedAmount), categoryId, date, memo: memo.trim() };
    if (expense) {
      await updateExpense(expense.id, input);
      router.back();
    } else {
      await addExpense(input);
      router.push("/");
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setSubmitting(true);
    await removeExpense(expense.id);
    router.back();
  };

  const handleAddCategory = async () => {
    setCategoryError(null);
    const result = await addCustomCategory(newCategoryLabel, newCategoryEmoji);
    if (!result.ok) {
      setCategoryError(result.message);
      return;
    }
    setNewCategoryLabel("");
    setNewCategoryEmoji(DEFAULT_CUSTOM_CATEGORY_EMOJI);
    setAddingCategory(false);
  };

  const handleConfirmDeleteCategory = async (id: string) => {
    await removeCustomCategory(id);
    if (categoryId === id) setCategoryId(categories.find((category) => category.id !== id)?.id ?? "");
    setDeletingCategoryId(null);
  };

  const deletingCategory = categories.find((category) => category.id === deletingCategoryId);

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 flex flex-col gap-5">
      <div>
        <label htmlFor="amount" className="text-xs font-bold text-ink-muted">
          金額
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm">
          <span className="text-ink-muted">¥</span>
          <input
            id="amount"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
            className="w-full bg-transparent text-2xl font-bold outline-none"
          />
        </div>
      </div>

      <div>
        <span className="text-xs font-bold text-ink-muted">カテゴリ</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {categories.map((category) => {
            const active = category.id === categoryId;
            return (
              <div key={category.id} className="relative">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(category.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-colors ${
                    active ? "bg-brand-500 text-white" : "bg-surface text-ink-muted shadow-sm"
                  }`}
                >
                  <span aria-hidden className="text-lg">
                    {category.emoji}
                  </span>
                  {category.label}
                </button>
                {category.isCustom && (
                  <button
                    type="button"
                    aria-label={`${category.label}を削除`}
                    onClick={() => setDeletingCategoryId(category.id)}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-status-over text-[10px] font-bold text-white shadow"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setAddingCategory((v) => !v)}
            className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-black/15 py-3 text-xs font-medium text-ink-muted"
          >
            <span aria-hidden className="text-lg">
              ＋
            </span>
            追加
          </button>
        </div>

        {deletingCategory && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface p-4 shadow-sm">
            <p className="flex-1 text-xs text-ink-muted">
              「{deletingCategory.label}」を削除しますか？
            </p>
            <button
              type="button"
              onClick={() => void handleConfirmDeleteCategory(deletingCategory.id)}
              className="rounded-xl bg-status-over px-3 py-1.5 text-xs font-bold text-white"
            >
              削除する
            </button>
            <button
              type="button"
              onClick={() => setDeletingCategoryId(null)}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-xs text-ink-muted"
            >
              やめる
            </button>
          </div>
        )}

        {addingCategory && (
          <div className="mt-3 rounded-2xl bg-surface p-4 shadow-sm">
            {isPremium ? (
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  value={newCategoryLabel}
                  onChange={(event) => setNewCategoryLabel(event.target.value)}
                  placeholder="例）ペット費"
                  className="w-full rounded-xl bg-canvas px-3 py-2 text-sm outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_CATEGORY_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategoryEmoji(emoji)}
                      aria-pressed={newCategoryEmoji === emoji}
                      className={`flex size-8 items-center justify-center rounded-full text-base ${
                        newCategoryEmoji === emoji ? "bg-brand-100" : "bg-canvas"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {categoryError && <p className="text-xs text-status-over">{categoryError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAddCategory()}
                    className="flex-1 rounded-xl bg-brand-500 py-2 text-xs font-bold text-white"
                  >
                    追加する
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingCategory(false)}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs text-ink-muted"
                  >
                    やめる
                  </button>
                </div>
              </div>
            ) : (
              <PaywallNotice message="独自のカテゴリを追加できるのはプレミアムプラン限定です" />
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="date" className="text-xs font-bold text-ink-muted">
          日付
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 shadow-sm outline-none"
        />
      </div>

      <div>
        <label htmlFor="memo" className="text-xs font-bold text-ink-muted">
          メモ（任意）
        </label>
        <input
          id="memo"
          type="text"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="例）友達とランチ"
          className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 shadow-sm outline-none"
        />
      </div>

      {error && <p className="text-sm text-status-over">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-2xl bg-brand-500 py-3 text-center text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {isEditing ? "更新する" : "記録する"}
      </button>

      {isEditing && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleDelete()}
          className="rounded-2xl border border-black/10 py-3 text-center text-sm font-medium text-status-over disabled:opacity-50"
        >
          この記録を削除する
        </button>
      )}
    </form>
  );
}
