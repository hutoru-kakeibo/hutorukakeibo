"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { PREMIUM_PRICE_LABEL } from "@/lib/billing/plan";

interface PaywallNoticeProps {
  message: string;
}

/**
 * プレミアム機能の案内と Stripe Checkout への導線。
 * 課金単位は家計簿(household)で、購入できるのはホストのみ。
 */
export function PaywallNotice({ message }: PaywallNoticeProps) {
  const { user } = useAuth();
  const { activeHousehold } = useHousehold();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = Boolean(activeHousehold && user && activeHousehold.ownerId === user.id);

  const handleUpgrade = async () => {
    if (!activeHousehold) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: activeHousehold.id }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) {
        setError(payload.message ?? "決済ページを開けませんでした");
        return;
      }
      window.location.href = payload.url;
    } catch (cause) {
      console.error("[billing] Checkout の開始に失敗しました", cause);
      setError("決済ページを開けませんでした");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-xl bg-canvas p-3 text-center">
      <p className="text-xs text-ink-muted">✨ {message}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{PREMIUM_PRICE_LABEL}</p>
      {isOwner ? (
        <button
          type="button"
          onClick={() => void handleUpgrade()}
          disabled={pending}
          className="mt-2 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {pending ? "決済ページを開いています…" : "プレミアムにアップグレード"}
        </button>
      ) : (
        <p className="mt-2 text-[11px] text-ink-muted">
          アップグレードはこの家計簿のホストが行えます
        </p>
      )}
      {error && <p className="mt-2 text-[11px] text-status-over">{error}</p>}
    </div>
  );
}
