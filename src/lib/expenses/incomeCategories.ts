export interface IncomeCategory {
  id: string;
  label: string;
  emoji: string;
}

export const INCOME_CATEGORIES = [
  { id: "salary", label: "給与", emoji: "💰" },
  { id: "bonus", label: "ボーナス", emoji: "🎁" },
  { id: "allowance", label: "お小遣い", emoji: "👛" },
  { id: "side_job", label: "副業", emoji: "💻" },
  { id: "other_income", label: "その他", emoji: "💴" },
] as const satisfies readonly IncomeCategory[];

export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]["id"];

const INCOME_CATEGORY_BY_ID: Record<IncomeCategoryId, IncomeCategory> = Object.fromEntries(
  INCOME_CATEGORIES.map((category) => [category.id, category]),
) as Record<IncomeCategoryId, IncomeCategory>;

const UNKNOWN_INCOME_CATEGORY: IncomeCategory = { id: "", label: "不明なカテゴリ", emoji: "❓" };

export function resolveIncomeCategory(categoryId: string): IncomeCategory {
  return INCOME_CATEGORY_BY_ID[categoryId as IncomeCategoryId] ?? { ...UNKNOWN_INCOME_CATEGORY, id: categoryId };
}
