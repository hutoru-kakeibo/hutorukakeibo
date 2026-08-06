import type { AnyCategory, CategoryBudget, Expense } from "@/lib/expenses/types";
import { groupExpensesByCategory, sumExpensesForMonth } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";
import { computeCharacterStatus, type CharacterStage } from "./logic";

export type DiagnosisRank = "S" | "A" | "B" | "C" | "D";

export interface Diagnosis {
  rank: DiagnosisRank;
  headline: string;
  insights: string[];
}

const RANK_BY_STAGE: Record<CharacterStage, DiagnosisRank> = {
  slim: "S",
  fit: "A",
  chubby: "B",
  round: "C",
  overweight: "D",
};

const HEADLINE_BY_RANK: Record<DiagnosisRank, string> = {
  S: "理想的な家計管理ができています",
  A: "順調なペースで支出をコントロールできています",
  B: "予算内ですが、ペースには注意が必要です",
  C: "今月は予算オーバー気味です",
  D: "支出が大幅に予算を超えています",
};

// 上位カテゴリが全体の何%を占めたら「偏り」として注意喚起するかのしきい値
const DOMINANT_CATEGORY_THRESHOLD = 35;
// 経過日数に対する消化ペースがこの差を超えたら「ペースが早い」と警告する
const PACE_WARNING_MARGIN = 0.15;
// カテゴリ予算超過のインサイトは、超過額が大きい順に最大何件まで表示するか
const MAX_CATEGORY_BUDGET_INSIGHTS = 2;

export function diagnoseMonth(
  expenses: Expense[],
  monthlyBudget: number,
  monthKey: string,
  allCategories: AnyCategory[],
  categoryBudgets: CategoryBudget[] = [],
): Diagnosis {
  const spent = sumExpensesForMonth(expenses, monthKey);
  // キャラクターの状態判定（S〜Dランク）は、カテゴリ予算ではなく全体予算のみを参照する（仕様どおり）
  const status = computeCharacterStatus(spent, monthlyBudget);
  const rank = RANK_BY_STAGE[status.stage];
  const insights: string[] = [];

  const categories = groupExpensesByCategory(expenses, monthKey, allCategories);
  const topCategory = categories[0];
  if (topCategory && topCategory.percent >= DOMINANT_CATEGORY_THRESHOLD) {
    insights.push(
      `「${topCategory.label}」が支出全体の${topCategory.percent}%を占めています。使いすぎていないか振り返ってみましょう。`,
    );
  }

  if (categoryBudgets.length > 0) {
    const overBudgetCategories = categoryBudgets
      .map((budget) => {
        const categorySpent = categories.find((c) => c.categoryId === budget.categoryId)?.total ?? 0;
        return {
          label: allCategories.find((c) => c.id === budget.categoryId)?.label ?? "不明なカテゴリ",
          over: categorySpent - budget.monthlyBudget,
        };
      })
      .filter((entry) => entry.over > 0)
      .sort((a, b) => b.over - a.over)
      .slice(0, MAX_CATEGORY_BUDGET_INSIGHTS);

    for (const entry of overBudgetCategories) {
      insights.push(`「${entry.label}」はカテゴリ予算を${formatYen(entry.over)}超過しています。`);
    }
  }

  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  if (isCurrentMonth && monthlyBudget > 0) {
    const elapsedDays = today.getDate();
    const remainingDays = Math.max(1, daysInMonth - elapsedDays);
    const remainingBudget = monthlyBudget - spent;

    if (remainingBudget > 0) {
      const perDay = Math.floor(remainingBudget / remainingDays);
      insights.push(`残り${remainingDays}日、1日あたり${formatYen(perDay)}まで使えます。`);
    } else {
      insights.push(`すでに予算を${formatYen(Math.abs(remainingBudget))}超過しています。来月は使いすぎに注意しましょう。`);
    }

    const expectedPaceRatio = elapsedDays / daysInMonth;
    const actualPaceRatio = spent / monthlyBudget;
    if (actualPaceRatio > expectedPaceRatio + PACE_WARNING_MARGIN) {
      insights.push("最近のペースがやや早めです。今月はいつもよりゆっくりめに使ってみましょう。");
    }
  }

  if (insights.length === 0) {
    insights.push("引き続き、このペースをキープしましょう！");
  }

  return { rank, headline: HEADLINE_BY_RANK[rank], insights };
}
