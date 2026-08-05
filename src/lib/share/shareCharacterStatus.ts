"use client";

export type ShareResult = "shared" | "cancelled" | "copied" | "manual";

interface ShareParams {
  title: string;
  text: string;
  url: string;
  imageBlob?: Blob | null;
}

/**
 * Web Share API (画像添付を試みる) → クリップボードコピー → 手動コピー、の順にフォールバックする。
 * iOS Safari は Web Share API Level 2 (files) に対応しているため、通常は画像付きで共有できる。
 */
export async function shareCharacterStatus({ title, text, url, imageBlob }: ShareParams): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      if (imageBlob && navigator.canShare) {
        const file = new File([imageBlob], "petite-budget.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text, url, files: [file] });
          return "shared";
        }
      }
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // 共有シートで失敗した場合はクリップボードコピーにフォールバックする
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return "copied";
    } catch {
      // フォールスルーして手動コピー案内を出す
    }
  }

  return "manual";
}
