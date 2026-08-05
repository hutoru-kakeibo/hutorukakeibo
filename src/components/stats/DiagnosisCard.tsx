import type { Diagnosis, DiagnosisRank } from "@/lib/character/diagnosis";

const RANK_COLOR: Record<DiagnosisRank, string> = {
  S: "#22a06b",
  A: "#4ade80",
  B: "#f59e0b",
  C: "#f97316",
  D: "#ef4444",
};

export function DiagnosisCard({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
          style={{ backgroundColor: RANK_COLOR[diagnosis.rank] }}
        >
          {diagnosis.rank}
        </span>
        <div>
          <p className="text-xs font-bold text-ink-muted">今月の家計簿診断</p>
          <p className="text-sm font-bold">{diagnosis.headline}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {diagnosis.insights.map((insight) => (
          <li key={insight} className="flex gap-1.5 text-xs text-ink-muted">
            <span aria-hidden>・</span>
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
