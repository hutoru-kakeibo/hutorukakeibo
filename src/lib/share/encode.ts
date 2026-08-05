export interface ShareSnapshot {
  spent: number;
  budget: number;
  monthKey: string;
}

/**
 * 支出額・予算・対象月だけを URL に埋め込み、表示側で computeCharacterStatus を
 * 再計算する。キャラクター状態を二重管理しないための設計。
 */
export function encodeShareSnapshot(snapshot: ShareSnapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShareSnapshot(encoded: string): ShareSnapshot | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "spent" in parsed &&
      "budget" in parsed &&
      "monthKey" in parsed &&
      typeof (parsed as ShareSnapshot).spent === "number" &&
      typeof (parsed as ShareSnapshot).budget === "number" &&
      typeof (parsed as ShareSnapshot).monthKey === "string"
    ) {
      return parsed as ShareSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}
