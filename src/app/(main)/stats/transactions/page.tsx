"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SortButton, type SortDirection } from "@/components/expenses/SortButton";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAllCategories } from "@/hooks/useAllCategories";
import { INCOME_CATEGORIES, resolveIncomeCategory } from "@/lib/expenses/incomeCategories";
import { formatYen } from "@/lib/format";
import { normalizeKana } from "@/lib/normalizeKana";

type SortKey = "date" | "amount";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const { transactions } = useExpenses();
  const { categories: expenseCategories, resolve: resolveExpenseCategory } = useAllCategories();
  const { activeHousehold } = useHousehold();

  // カテゴリIDは支出/収入で名前空間が重ならないため、これで種別を判別できる
  const isExpenseCategoryId = (id: string) => expenseCategories.some((category) => category.id === id);
  const resolveCategory = (categoryId: string) =>
    isExpenseCategoryId(categoryId) ? resolveExpenseCategory(categoryId) : resolveIncomeCategory(categoryId);

  // 2人以上で共有している家計簿でのみ「誰が記録したか」を表示する
  const showRecorder = (activeHousehold?.members.length ?? 0) > 1;
  const resolveMemberName = (userId: string) =>
    activeHousehold?.members.find((member) => member.userId === userId)?.displayName ?? "メンバー";

  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory ?? "all");
  const [categorySearch, setCategorySearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const searchQuery = normalizeKana(categorySearch.trim());
  const matchesSearch = (label: string) => !searchQuery || normalizeKana(label).includes(searchQuery);
  const visibleExpenseCategories = expenseCategories.filter((category) => matchesSearch(category.label));
  const visibleIncomeCategories = INCOME_CATEGORIES.filter((category) => matchesSearch(category.label));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const filtered = useMemo(() => {
    const base =
      categoryFilter === "all"
        ? transactions
        : transactions.filter((transaction) => transaction.categoryId === categoryFilter);

    const sorted = [...base].sort((a, b) => {
      if (sortKey === "amount") return b.amount - a.amount;
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    });
    if (sortDirection === "asc") sorted.reverse();
    return sorted;
  }, [transactions, categoryFilter, sortKey, sortDirection]);

  const expenseTotal = useMemo(
    () => filtered.filter((transaction) => transaction.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  );
  const incomeTotal = useMemo(
    () => filtered.filter((transaction) => transaction.type === "income").reduce((sum, t) => sum + t.amount, 0),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-4 px-6 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/stats" aria-label="統計に戻る" className="text-lg text-ink-muted">
          ←
        </Link>
        <h1 className="text-lg font-bold">取引履歴</h1>
      </div>

      <input
        type="text"
        value={categorySearch}
        onChange={(event) => setCategorySearch(event.target.value)}
        placeholder="カテゴリを検索"
        className="rounded-xl bg-surface px-3 py-2 text-sm shadow-sm outline-none"
      />

      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
            categoryFilter === "all" ? "bg-brand-500 text-white" : "bg-surface text-ink-muted shadow-sm"
          }`}
        >
          すべて
        </button>
        {visibleExpenseCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryFilter(category.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              categoryFilter === category.id ? "bg-brand-500 text-white" : "bg-surface text-ink-muted shadow-sm"
            }`}
          >
            {category.emoji} {category.label}
          </button>
        ))}
        {visibleIncomeCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryFilter(category.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              categoryFilter === category.id ? "bg-brand-500 text-white" : "bg-surface text-ink-muted shadow-sm"
            }`}
          >
            {category.emoji} {category.label}
          </button>
        ))}
        {searchQuery && visibleExpenseCategories.length === 0 && visibleIncomeCategories.length === 0 && (
          <p className="shrink-0 self-center text-xs text-ink-muted">一致するカテゴリがありません</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted">並び替え:</span>
        <SortButton
          label="日付"
          active={sortKey === "date"}
          direction={sortDirection}
          onClick={() => handleSort("date")}
        />
        <SortButton
          label="金額"
          active={sortKey === "amount"}
          direction={sortDirection}
          onClick={() => handleSort("amount")}
        />
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length}件 ・ 支出 {formatYen(expenseTotal)} ・ 収入 {formatYen(incomeTotal)}
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">記録がありません</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((transaction) => {
            const category = resolveCategory(transaction.categoryId);
            const isIncome = transaction.type === "income";
            return (
              <li key={transaction.id}>
                <Link
                  href={`/input?id=${transaction.id}`}
                  className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="text-lg">
                      {category.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{category.label}</p>
                      <p className="text-xs text-ink-muted">
                        {transaction.date}
                        {showRecorder ? ` ・ 👤 ${resolveMemberName(transaction.createdBy)}` : ""}
                      </p>
                      {transaction.memo && <p className="text-xs text-ink-muted">{transaction.memo}</p>}
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isIncome ? "text-brand-600" : ""}`}>
                    {isIncome ? "+" : ""}
                    {formatYen(transaction.amount)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  );
}
