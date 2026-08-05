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

interface ExpensesContextValue {
  expenses: Expense[];
  loading: boolean;
  addExpense: (input: NewExpenseInput) => Promise<void>;
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
  };
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { activeHousehold: household } = useHousehold();
  const supabase = useMemo(() => createClient(), []);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 効果(useEffect)本体から同期的に setState してしまわないよう、必ずマイクロタスクを1つ挟む
    async function loadExpenses() {
      await Promise.resolve();
      if (cancelled) return;

      if (!household) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("id, household_id, created_by, category_id, amount, expense_date, memo, created_at")
        .eq("household_id", household.id)
        .order("expense_date", { ascending: false });
      if (cancelled) return;
      if (error) console.error("[expenses] 一覧の取得に失敗しました", error);
      setExpenses((data ?? []).map(mapRow));
      setLoading(false);
    }
    loadExpenses();

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
            setExpenses((prev) => (prev.some((e) => e.id === row.id) ? prev : [mapRow(row), ...prev]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ExpenseRow;
            setExpenses((prev) => prev.map((e) => (e.id === row.id ? mapRow(row) : e)));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setExpenses((prev) => prev.filter((e) => e.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, household]);

  const addExpense = useCallback(
    async (input: NewExpenseInput) => {
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
        })
        .select("id, household_id, created_by, category_id, amount, expense_date, memo, created_at")
        .single();

      if (error) {
        console.error("[expenses] 追加に失敗しました", error);
        return;
      }
      if (data) {
        setExpenses((prev) => (prev.some((e) => e.id === data.id) ? prev : [mapRow(data), ...prev]));
      }
    },
    [supabase, household],
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
        .select("id, household_id, created_by, category_id, amount, expense_date, memo, created_at")
        .single();

      if (error) {
        console.error("[expenses] 更新に失敗しました", error);
        return;
      }
      if (data) {
        setExpenses((prev) => prev.map((expense) => (expense.id === id ? mapRow(data) : expense)));
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
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    },
    [supabase],
  );

  const value = useMemo<ExpensesContextValue>(
    () => ({ expenses, loading, addExpense, updateExpense, removeExpense }),
    [expenses, loading, addExpense, updateExpense, removeExpense],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpensesProvider");
  return ctx;
}
