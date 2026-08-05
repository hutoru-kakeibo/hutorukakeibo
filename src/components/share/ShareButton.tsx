"use client";

import { useState } from "react";
import { FACE_BY_STAGE, type CharacterStatus } from "@/lib/character/logic";
import { encodeShareSnapshot } from "@/lib/share/encode";
import { renderShareImage } from "@/lib/share/renderShareImage";
import { shareCharacterStatus } from "@/lib/share/shareCharacterStatus";

interface ShareButtonProps {
  status: CharacterStatus;
  spent: number;
  budget: number;
  monthKey: string;
}

export function ShareButton({ status, spent, budget, monthKey }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleShare = async () => {
    setPending(true);
    setFeedback(null);
    try {
      const encoded = encodeShareSnapshot({ spent, budget, monthKey });
      const url = `${window.location.origin}/share/${encoded}`;
      const text = `PetiteBudget で今月は「${status.label}」でした。${status.message}`;

      let imageBlob: Blob | null = null;
      try {
        imageBlob = await renderShareImage({
          emoji: FACE_BY_STAGE[status.stage],
          stageLabel: status.label,
          message: status.message,
          spent,
          budget,
          accentColor: status.accentColor,
        });
      } catch {
        imageBlob = null;
      }

      const result = await shareCharacterStatus({ title: "PetiteBudget", text, url, imageBlob });
      if (result === "copied") setFeedback("リンクをコピーしました");
      else if (result === "manual") setFeedback(url);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={pending}
        className="w-full rounded-2xl border border-black/10 bg-surface py-3 text-center text-sm font-bold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        📤 シェアする
      </button>
      {feedback && <p className="break-all text-center text-xs text-ink-muted">{feedback}</p>}
    </div>
  );
}
