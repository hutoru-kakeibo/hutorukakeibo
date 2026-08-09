"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PaywallNotice } from "@/components/billing/PaywallNotice";
import { useCustomCategories } from "@/contexts/CustomCategoriesContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { CUSTOM_CATEGORY_EMOJIS, DEFAULT_CUSTOM_CATEGORY_EMOJI } from "@/lib/expenses/customCategoryEmojis";
import { INCOME_CATEGORIES } from "@/lib/expenses/incomeCategories";
import type { AnyCategory, Expense, TransactionType } from "@/lib/expenses/types";
import { DEFAULT_HOUSEHOLD_COLOR } from "@/lib/household/colors";

function SortableCategoryButton({
  category,
  active,
  onSelect,
  onRequestDelete,
  color,
}: {
  category: AnyCategory;
  active: boolean;
  onSelect: () => void;
  onRequestDelete: (() => void) | null;
  color: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        {...attributes}
        {...listeners}
        aria-pressed={active}
        style={active ? { backgroundColor: color } : undefined}
        className={`flex w-full flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-colors ${
          active ? "text-white" : "bg-surface text-ink-muted shadow-sm"
        } ${isDragging ? "opacity-70 shadow-lg" : ""}`}
      >
        <span aria-hidden className="text-lg">
          {category.emoji}
        </span>
        {category.label}
      </button>
      {onRequestDelete && (
        <button
          type="button"
          aria-label={`${category.label}を削除`}
          onClick={onRequestDelete}
          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-status-over text-[10px] font-bold text-white shadow"
        >
          ✕
        </button>
      )}
    </div>
  );
}

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
  const { addExpense, addIncome, updateExpense, removeExpense } = useExpenses();
  const { activeHousehold, setCategoryOrder } = useHousehold();
  const { categories } = useAllCategories();
  const { addCustomCategory, removeCustomCategory } = useCustomCategories();
  const isEditing = Boolean(expense);
  const isPremium = activeHousehold?.plan === "premium";
  const householdColor = activeHousehold?.color ?? DEFAULT_HOUSEHOLD_COLOR;

  const [type, setType] = useState<TransactionType>(expense?.type ?? "expense");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? (type === "income" ? INCOME_CATEGORIES[0]?.id : categories[0]?.id) ?? "",
  );
  const [date, setDate] = useState(expense?.date ?? todayDateString);
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (nextType: TransactionType) => {
    if (nextType === type) return;
    setType(nextType);
    setCategoryId((nextType === "income" ? INCOME_CATEGORIES[0]?.id : categories[0]?.id) ?? "");
  };

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState<string>(DEFAULT_CUSTOM_CATEGORY_EMOJI);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  // window.confirm() は iOS の PWA（ホーム画面から起動したアプリ）で正しく動作しないことがあるため、
  // アプリ内の確認パネルに置き換えている。
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // ドラッグ中に並び順の保存(Supabase往復)を待たず即座に画面へ反映するためのローカルコピー。
  // categories が変わったら追従させる（Reactの「レンダー中にstateを調整する」パターン。useEffectは使わない）
  const [prevCategories, setPrevCategories] = useState(categories);
  const [orderedCategories, setOrderedCategories] = useState(categories);
  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setOrderedCategories(categories);
  }

  // ドラッグ対象には touch-action: none を設定しているため、タップ開始点のブラウザ標準スクロールは
  // 発生しない。distance方式にして、単純なタップでのカテゴリ選択とドラッグ開始を区別する
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleCategoryDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedCategories((prev) => {
      const oldIndex = prev.findIndex((category) => category.id === active.id);
      const newIndex = prev.findIndex((category) => category.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    void setCategoryOrder(orderedCategories.map((category) => category.id));
  };

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
    } else if (type === "income") {
      await addIncome(input);
      router.push("/");
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
      {!isEditing && (
        <div className="flex gap-1 rounded-2xl bg-canvas p-1">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
              type === "expense" ? "bg-surface shadow-sm" : "text-ink-muted"
            }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
              type === "income" ? "bg-surface shadow-sm" : "text-ink-muted"
            }`}
          >
            収入
          </button>
        </div>
      )}

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
        {type === "expense" ? (
          <>
            <p className="mt-1 text-[11px] text-ink-muted">ドラッグすると並び順を変更できます</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <DndContext
                sensors={dragSensors}
                collisionDetection={closestCenter}
                onDragOver={handleCategoryDragOver}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={orderedCategories.map((category) => category.id)}
                  strategy={rectSortingStrategy}
                >
                  {orderedCategories.map((category) => (
                    <SortableCategoryButton
                      key={category.id}
                      category={category}
                      active={category.id === categoryId}
                      onSelect={() => setCategoryId(category.id)}
                      onRequestDelete={category.isCustom ? () => setDeletingCategoryId(category.id) : null}
                      color={householdColor}
                    />
                  ))}
                </SortableContext>
              </DndContext>
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
          </>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {INCOME_CATEGORIES.map((category) => {
              const active = category.id === categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(category.id)}
                  style={active ? { backgroundColor: householdColor } : undefined}
                  className={`flex w-full flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-colors ${
                    active ? "text-white" : "bg-surface text-ink-muted shadow-sm"
                  }`}
                >
                  <span aria-hidden className="text-lg">
                    {category.emoji}
                  </span>
                  {category.label}
                </button>
              );
            })}
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
        style={{ backgroundColor: householdColor }}
        className="rounded-2xl py-3 text-center text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
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
