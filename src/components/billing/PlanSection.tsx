"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { PREMIUM_PRICE_LABEL, isPaymentIssueStatus } from "@/lib/billing/plan";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 設定タブに置く、現在のプラン表示とアップグレード／管理の導線 */
export function PlanSection() {
  const { user } = useAuth();
  const { activeHousehold } = useHousehold();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeHousehold) return null;

  const isPremium = activeHousehold.plan === "premium";
  const isOwner = Boolean(user && activeHousehold.ownerId === user.id);
  const renewalDate = formatDate(activeHousehold.currentPeriodEnd);
  const hasPaymentIssue = isPaymentIssueStatus(activeHousehold.subscriptionStatus);

  const openBillingUrl = async (endpoint: "checkout" | "portal") => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/billing/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: activeHousehold.id }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) {
        setError(payload.message ?? "ページを開けませんでした");
        return;
      }
      window.location.href = payload.url;
    } catch (cause) {
      console.error(`[billing] ${endpoint} の呼び出しに失敗しました`, cause);
      setError("ページを開けませんでした");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink-muted">プラン</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isPremium ? "bg-brand-100 text-brand-700" : "bg-canvas text-ink-muted"
          }`}
        >
          {isPremium ? "プレミアム" : "フリープラン"}
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        「{activeHousehold.name}」のプランです。プレミアムにすると、この家計簿を共有しているメンバー全員が独自カテゴリを使えます。
      </p>

      {hasPaymentIssue && (
        <p className="mt-2 text-xs text-status-over">
          お支払いに問題が発生しています。「プランを管理する」からお支払い方法をご確認ください。
        </p>
      )}

      {isPremium ? (
        <>
          {renewalDate && (
            <p className="mt-2 text-[11px] text-ink-muted">
              {activeHousehold.subscriptionStatus === "canceled" || activeHousehold.cancelAtPeriodEnd
                ? `${renewalDate} まで利用できます`
                : `次回のお支払い: ${renewalDate}`}
            </p>
          )}
          {isOwner ? (
            <button
              type="button"
              onClick={() => void openBillingUrl("portal")}
              disabled={pending}
              className="mt-4 w-full rounded-xl border border-black/10 py-2 text-sm font-medium text-ink-muted disabled:opacity-50"
            >
              {pending ? "開いています…" : "プランを管理する（解約・お支払い方法）"}
            </button>
          ) : (
            <p className="mt-3 text-[11px] text-ink-muted">
              プランの管理はこの家計簿のホストが行えます
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-[11px] text-ink-muted">{PREMIUM_PRICE_LABEL}</p>
          {isOwner ? (
            <button
              type="button"
              onClick={() => void openBillingUrl("checkout")}
              disabled={pending}
              className="mt-4 w-full rounded-xl bg-brand-500 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "決済ページを開いています…" : "プレミアムにアップグレード"}
            </button>
          ) : (
            <p className="mt-3 text-[11px] text-ink-muted">
              アップグレードはこの家計簿のホストが行えます
            </p>
          )}
        </>
      )}

      {error && <p className="mt-2 text-xs text-status-over">{error}</p>}
    </section>
  );
}
