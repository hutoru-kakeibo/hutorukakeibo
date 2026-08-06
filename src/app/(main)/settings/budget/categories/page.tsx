"use client";

import Link from "next/link";
import { CategoryBudgetsSection } from "@/components/expenses/CategoryBudgetsSection";

export default function CategoryBudgetsPage() {
  return (
    <div className="flex flex-col gap-4 px-6 pt-8 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/settings/budget" aria-label="予算管理に戻る" className="text-lg text-ink-muted">
          ←
        </Link>
        <h1 className="text-lg font-bold">カテゴリ別の予算</h1>
      </div>

      <CategoryBudgetsSection />
    </div>
  );
}
