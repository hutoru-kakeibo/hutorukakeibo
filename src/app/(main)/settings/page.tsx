"use client";

import { useState } from "react";
import { CategoryBudgetsSection } from "@/components/expenses/CategoryBudgetsSection";
import { CategoryManageSection } from "@/components/expenses/CategoryManageSection";
import { HouseholdManageCard } from "@/components/household/HouseholdManageCard";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { formatYen } from "@/lib/format";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { households, activeHousehold, loading, setMonthlyBudget, joinByInviteCode } = useHousehold();
  const [budgetDraft, setBudgetDraft] = useState(String(activeHousehold?.monthlyBudget ?? 0));
  const [joinCode, setJoinCode] = useState("");
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);

  const handleSaveBudget = () => {
    const value = Number(budgetDraft);
    if (Number.isFinite(value) && value >= 0) void setMonthlyBudget(Math.round(value));
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const result = await joinByInviteCode(joinCode.trim());
    setJoinFeedback(result.ok ? "参加しました！" : result.message);
    if (result.ok) setJoinCode("");
  };

  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-4">
      <h1 className="text-lg font-bold">設定</h1>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <p className="text-xs font-bold text-ink-muted">アカウント</p>
        <p className="mt-2 text-sm font-medium">
          {user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "ユーザー"}
        </p>
        <p className="text-xs text-ink-muted">{user?.email}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 w-full rounded-xl border border-black/10 py-2 text-sm font-medium text-ink-muted"
        >
          ログアウト
        </button>
      </section>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <label htmlFor="monthlyBudget" className="text-xs font-bold text-ink-muted">
          表示中の家計簿の予算
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ink-muted">¥</span>
          <input
            id="monthlyBudget"
            inputMode="numeric"
            pattern="[0-9]*"
            value={budgetDraft}
            onChange={(event) => setBudgetDraft(event.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-canvas px-3 py-2 text-lg font-bold outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          現在の設定: {formatYen(activeHousehold?.monthlyBudget ?? 0)}
        </p>
        <button
          type="button"
          onClick={handleSaveBudget}
          className="mt-4 w-full rounded-xl bg-brand-500 py-2 text-sm font-bold text-white"
        >
          保存する
        </button>
      </section>

      <CategoryBudgetsSection />

      <CategoryManageSection />

      <section>
        <p className="mb-2 px-1 text-xs font-bold text-ink-muted">家計簿の管理</p>
        {loading ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : (
          <div className="space-y-2">
            {households.map((household) => (
              <HouseholdManageCard
                key={household.id}
                household={household}
                isActive={household.id === activeHousehold?.id}
                currentUserId={user?.id ?? ""}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <label htmlFor="joinCode" className="text-xs font-bold text-ink-muted">
          招待コードで参加する
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="joinCode"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="例）a1b2c3d4"
            className="flex-1 rounded-xl bg-canvas px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void handleJoin()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white"
          >
            参加
          </button>
        </div>
        {joinFeedback && <p className="mt-1 text-xs text-ink-muted">{joinFeedback}</p>}
        <p className="mt-2 text-[11px] text-ink-muted">
          ※ 参加すると新しい家計簿として追加され、ホーム画面で切り替えて使えます
        </p>
      </section>
    </div>
  );
}
