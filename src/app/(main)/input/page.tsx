"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useExpenses } from "@/contexts/ExpensesContext";

function InputPageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { transactions } = useExpenses();
  const editingTransaction = editId ? transactions.find((transaction) => transaction.id === editId) : undefined;

  const title = editingTransaction
    ? editingTransaction.type === "income"
      ? "収入を編集する"
      : "支出を編集する"
    : "支出・収入を記録する";

  return (
    <div className="px-6 pt-8">
      <h1 className="text-lg font-bold">{title}</h1>
      <ExpenseForm expense={editingTransaction} />
    </div>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={null}>
      <InputPageContent />
    </Suspense>
  );
}
