import type { Expense } from "./types";

/** カテゴリ一覧として最低限必要な形（支出カテゴリ・収入カテゴリの両方を受け付ける） */
interface CategoryLike {
  id: string;
  label: string;
  emoji: string;
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function sumExpensesForMonth(expenses: Expense[], monthKey: string): number {
  return expenses
    .filter((expense) => expense.date.startsWith(monthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export interface CategoryTotal {
  categoryId: string;
  label: string;
  emoji: string;
  total: number;
  percent: number;
}

/** 支出が無いカテゴリは含まない、カテゴリ別の支出合計マップ（当月分） */
export function sumExpensesByCategoryId(expenses: Expense[], monthKey: string): Map<string, number> {
  const totalsByCategory = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.date.startsWith(monthKey)) continue;
    totalsByCategory.set(expense.categoryId, (totalsByCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }
  return totalsByCategory;
}

/**
 * 支出額の多い順。0円のカテゴリは円グラフ/凡例に出す意味がないため除外する。
 * categories には固定カテゴリ＋カスタムカテゴリを合わせたものを渡す（useAllCategories 参照）。
 * 削除済みカテゴリの支出は「不明なカテゴリ」として集計対象に残す。
 */
export function groupExpensesByCategory(
  expenses: Expense[],
  monthKey: string,
  categories: readonly CategoryLike[],
): CategoryTotal[] {
  const totalsByCategory = sumExpensesByCategoryId(expenses, monthKey);
  const total = [...totalsByCategory.values()].reduce((sum, value) => sum + value, 0);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return [...totalsByCategory.entries()]
    .map(([categoryId, categoryTotal]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        label: category?.label ?? "不明なカテゴリ",
        emoji: category?.emoji ?? "❓",
        total: categoryTotal,
        percent: total > 0 ? Math.round((categoryTotal / total) * 100) : 0,
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
}

export interface DailyTotal {
  day: number;
  total: number;
}

/** 支出が無い日も 0円として含めた、月初から月末までの日別配列を返す */
export function groupExpensesByDay(expenses: Expense[], monthKey: string): DailyTotal[] {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const totalsByDay = new Array<number>(daysInMonth + 1).fill(0);
  for (const expense of expenses) {
    if (!expense.date.startsWith(monthKey)) continue;
    const day = Number(expense.date.slice(8, 10));
    if (day >= 1 && day <= daysInMonth) totalsByDay[day] += expense.amount;
  }

  return Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    total: totalsByDay[index + 1],
  }));
}
