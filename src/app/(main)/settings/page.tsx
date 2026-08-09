"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryManageSection } from "@/components/expenses/CategoryManageSection";
import { HouseholdManageCard } from "@/components/household/HouseholdManageCard";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { DEFAULT_HOUSEHOLD_COLOR } from "@/lib/household/colors";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { households, activeHousehold, loading, joinByInviteCode, updateMyDisplayName } = useHousehold();
  const householdColor = activeHousehold?.color ?? DEFAULT_HOUSEHOLD_COLOR;
  const [joinCode, setJoinCode] = useState("");
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);

  const myDisplayName =
    activeHousehold?.members.find((member) => member.userId === user?.id)?.displayName ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    "ユーザー";
  const [nameDraft, setNameDraft] = useState<string | undefined>(undefined);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const displayNameValue = nameDraft ?? myDisplayName;

  const handleSaveDisplayName = async () => {
    const result = await updateMyDisplayName(displayNameValue);
    setNameFeedback(result.ok ? "更新しました" : result.message);
    if (result.ok) setNameDraft(undefined);
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
        <label htmlFor="displayName" className="text-xs font-bold text-ink-muted">
          表示名
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="displayName"
            value={displayNameValue}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder="表示名"
            className="w-full rounded-xl bg-canvas px-3 py-2 text-sm font-medium outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSaveDisplayName()}
            style={{ backgroundColor: householdColor }}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white"
          >
            保存
          </button>
        </div>
        {nameFeedback && <p className="mt-1 text-xs text-ink-muted">{nameFeedback}</p>}
        <p className="mt-2 text-xs text-ink-muted">{user?.email}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 w-full rounded-xl border border-black/10 py-2 text-sm font-medium text-ink-muted"
        >
          ログアウト
        </button>
      </section>

      <Link
        href="/settings/budget"
        className="flex items-center justify-between rounded-2xl bg-surface p-5 shadow-sm active:bg-canvas"
      >
        <p className="text-sm font-bold">予算管理</p>
        <span aria-hidden className="text-ink-muted">
          ›
        </span>
      </Link>

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
            style={{ backgroundColor: householdColor }}
            className="rounded-xl px-4 py-2 text-xs font-bold text-white"
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
