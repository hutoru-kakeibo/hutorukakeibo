// categoryId は固定カテゴリの文字列 ID、またはカスタムカテゴリ（custom_categories.id）の
// UUID のどちらも入りうるため string で扱う。表示名・絵文字の解決は useAllCategories を使う。
export type TransactionType = "expense" | "income";

// このテーブル/型は支出（expense）と収入（income）の両方を表す。
// categoryId は type ごとに別の名前空間（支出カテゴリ / 収入カテゴリ）を使う。
export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  memo: string;
  createdAt: string; // ISO 8601
  createdBy: string; // 記録したユーザーのID
  type: TransactionType;
}

export type NewExpenseInput = Omit<Expense, "id" | "createdAt" | "createdBy" | "type">;

export interface AnyCategory {
  id: string;
  label: string;
  emoji: string;
  isCustom: boolean;
}

// households.monthly_budget（全体予算）とは別に、カテゴリごとに設定できる任意の予算
export interface CategoryBudget {
  categoryId: string;
  monthlyBudget: number;
}
