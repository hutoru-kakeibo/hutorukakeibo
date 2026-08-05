import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import { computeCharacterStatus } from "@/lib/character/logic";
import { formatYen } from "@/lib/format";
import { decodeShareSnapshot } from "@/lib/share/encode";

export default async function SharePage({ params }: { params: Promise<{ data: string }> }) {
  const { data } = await params;
  const snapshot = decodeShareSnapshot(data);
  if (!snapshot) notFound();

  const status = computeCharacterStatus(snapshot.spent, snapshot.budget);
  const [year, month] = snapshot.monthKey.split("-");

  return (
    <main className="app-shell items-center justify-center px-safe px-6 text-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <p className="text-xs text-ink-muted">
          {year}年{Number(month)}月の記録
        </p>

        <CharacterAvatar status={status} />

        <div>
          <p className="text-lg font-bold" style={{ color: status.accentColor }}>
            {status.label}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{status.message}</p>
        </div>

        <div className="w-full rounded-2xl bg-surface p-5 shadow-sm">
          <p className="text-2xl font-bold">{formatYen(snapshot.spent)}</p>
          <p className="text-xs text-ink-muted">予算 {formatYen(snapshot.budget)}</p>
        </div>

        <Link href="/" className="text-sm font-bold text-brand-600 underline">
          太る家計簿を見てみる
        </Link>

        <p className="text-[11px] text-ink-muted">
          ※ これは共有時点のスナップショットです。リアルタイムには更新されません
        </p>
      </div>
    </main>
  );
}
