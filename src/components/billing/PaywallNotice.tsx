"use client";

interface PaywallNoticeProps {
  message: string;
}

/**
 * プレミアム機能の案内。実際の決済処理は未実装のため、ボタンは「準備中」を示すのみ。
 */
export function PaywallNotice({ message }: PaywallNoticeProps) {
  return (
    <div className="rounded-xl bg-canvas p-3 text-center">
      <p className="text-xs text-ink-muted">✨ {message}</p>
      <button
        type="button"
        onClick={() => alert("アップグレード機能は準備中です。今後追加予定です。")}
        className="mt-2 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white"
      >
        プレミアムにアップグレード
      </button>
    </div>
  );
}
