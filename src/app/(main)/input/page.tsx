"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useExpenses } from "@/contexts/ExpensesContext";

function InputPageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { expenses } = useExpenses();
  const editingExpense = editId ? expenses.find((expense) => expense.id === editId) : undefined;

  return (
    <div className="px-6 pt-8">
      <h1 className="text-lg font-bold">{editingExpense ? "支出を編集する" : "支出を記録する"}</h1>
      <ExpenseForm expense={editingExpense} />
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
