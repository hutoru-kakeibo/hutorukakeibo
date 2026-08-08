"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Expense, NewExpenseInput } from "@/lib/expenses/types";
import { useHousehold } from "./HouseholdContext";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

const SELECT_COLUMNS = "id, household_id, created_by, category_id, amount, expense_date, memo, type, created_at";

interface ExpensesContextValue {
  /** type === 'expense' の記録のみ */
  expenses: Expense[];
  /** type === 'income' の記録のみ */
  incomes: Expense[];
  /** 支出・収入をまとめた全件（編集画面でのID検索などに使う） */
  transactions: Expense[];
  loading: boolean;
  addExpense: (input: NewExpenseInput) => Promise<void>;
  addIncome: (input: NewExpenseInput) => Promise<void>;
  updateExpense: (id: string, input: NewExpenseInput) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function mapRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    categoryId: row.category_id as Expense["categoryId"],
    amount: row.amount,
    date: row.expense_date,
    memo: row.memo,
    createdAt: row.created_at,
    createdBy: row.created_by,
    type: row.type === "income" ? "income" : "expense",
  };
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { activeHousehold: household } = useHousehold();
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 効果(useEffect)本体から同期的に setState してしまわないよう、必ずマイクロタスクを1つ挟む
    async function loadTransactions() {
      await Promise.resolve();
      if (cancelled) return;

      if (!household) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select(SELECT_COLUMNS)
        .eq("household_id", household.id)
        .order("expense_date", { ascending: false });
      if (cancelled) return;
      if (error) console.error("[expenses] 一覧の取得に失敗しました", error);
      setTransactions((data ?? []).map(mapRow));
      setLoading(false);
    }
    loadTransactions();

    if (!household) return;

    // 家族・パートナー間でのリアルタイム反映
    const channel = supabase
      .channel(`expenses:${household.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `household_id=eq.${household.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ExpenseRow;
            setTransactions((prev) => (prev.some((e) => e.id === row.id) ? prev : [mapRow(row), ...prev]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ExpenseRow;
            setTransactions((prev) => prev.map((e) => (e.id === row.id ? mapRow(row) : e)));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setTransactions((prev) => prev.filter((e) => e.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, household]);

  const insertTransaction = useCallback(
    async (type: Expense["type"], input: NewExpenseInput) => {
      if (!household) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          household_id: household.id,
          created_by: userData.user.id,
          amount: input.amount,
          category_id: input.categoryId,
          expense_date: input.date,
          memo: input.memo,
          type,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error) {
        console.error(`[expenses] ${type === "income" ? "収入" : "支出"}の追加に失敗しました`, error);
        return;
      }
      if (data) {
        setTransactions((prev) => (prev.some((e) => e.id === data.id) ? prev : [mapRow(data), ...prev]));
      }
    },
    [supabase, household],
  );

  const addExpense = useCallback(
    (input: NewExpenseInput) => insertTransaction("expense", input),
    [insertTransaction],
  );

  const addIncome = useCallback(
    (input: NewExpenseInput) => insertTransaction("income", input),
    [insertTransaction],
  );

  const updateExpense = useCallback(
    async (id: string, input: NewExpenseInput) => {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          amount: input.amount,
          category_id: input.categoryId,
          expense_date: input.date,
          memo: input.memo,
        })
        .eq("id", id)
        .select(SELECT_COLUMNS)
        .single();

      if (error) {
        console.error("[expenses] 更新に失敗しました", error);
        return;
      }
      if (data) {
        setTransactions((prev) => prev.map((expense) => (expense.id === id ? mapRow(data) : expense)));
      }
    },
    [supabase],
  );

  const removeExpense = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) {
        console.error("[expenses] 削除に失敗しました", error);
        return;
      }
      setTransactions((prev) => prev.filter((expense) => expense.id !== id));
    },
    [supabase],
  );

  const expenses = useMemo(() => transactions.filter((t) => t.type === "expense"), [transactions]);
  const incomes = useMemo(() => transactions.filter((t) => t.type === "income"), [transactions]);

  const value = useMemo<ExpensesContextValue>(
    () => ({ expenses, incomes, transactions, loading, addExpense, addIncome, updateExpense, removeExpense }),
    [expenses, incomes, transactions, loading, addExpense, addIncome, updateExpense, removeExpense],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpensesProvider");
  return ctx;
}
