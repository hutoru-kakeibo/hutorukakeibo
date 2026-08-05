"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** 未ログイン時は /login へリダイレクトする認証ゲート（モック認証） */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-safe">
        <p className="text-sm text-ink-muted">読み込み中…</p>
      </div>
    );
  }

  return <>{children}</>;
}
