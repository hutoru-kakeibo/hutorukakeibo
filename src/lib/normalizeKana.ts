/** 全角カタカナをひらがなに変換する（ひらがな/カタカナを区別しない検索に使う） */
export function normalizeKana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}
