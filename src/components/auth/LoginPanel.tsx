"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { computeCharacterStatus } from "@/lib/character/logic";

const NEUTRAL_STATUS = computeCharacterStatus(0, 1);

export function LoginPanel() {
  const { status, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth_failed";

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <CharacterAvatar status={NEUTRAL_STATUS} />

      <div>
        <h1 className="text-xl font-bold">太る家計簿</h1>
        <p className="mt-2 text-sm text-ink-muted">
          キャラクターと一緒に、楽しく家計簿を続けよう
        </p>
      </div>

      {authFailed && (
        <p className="w-full rounded-xl bg-red-50 px-4 py-2 text-center text-xs text-status-over">
          ログインに失敗しました。もう一度お試しください。
        </p>
      )}

      <button
        type="button"
        onClick={() => void loginWithGoogle()}
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-surface py-3 text-sm font-bold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        <span aria-hidden>🔐</span>
        Google でログイン
      </button>
    </div>
  );
}
