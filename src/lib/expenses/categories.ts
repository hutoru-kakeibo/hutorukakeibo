export interface ExpenseCategory {
  id: string;
  label: string;
  emoji: string;
}

export const EXPENSE_CATEGORIES = [
  { id: "food", label: "食費", emoji: "🍙" },
  { id: "daily", label: "日用品", emoji: "🧴" },
  { id: "transport", label: "交通費", emoji: "🚃" },
  { id: "entertainment", label: "娯楽", emoji: "🎮" },
  { id: "shopping", label: "買い物", emoji: "🛍️" },
  { id: "other", label: "その他", emoji: "📦" },
] as const satisfies readonly ExpenseCategory[];

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export const CATEGORY_BY_ID: Record<ExpenseCategoryId, ExpenseCategory> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.id, category]),
) as Record<ExpenseCategoryId, ExpenseCategory>;
