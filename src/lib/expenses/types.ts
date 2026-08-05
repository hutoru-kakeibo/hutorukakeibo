// categoryId は固定カテゴリの文字列 ID、またはカスタムカテゴリ（custom_categories.id）の
// UUID のどちらも入りうるため string で扱う。表示名・絵文字の解決は useAllCategories を使う。
export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  memo: string;
  createdAt: string; // ISO 8601
}

export type NewExpenseInput = Omit<Expense, "id" | "createdAt">;

export interface AnyCategory {
  id: string;
  label: string;
  emoji: string;
  isCustom: boolean;
}
