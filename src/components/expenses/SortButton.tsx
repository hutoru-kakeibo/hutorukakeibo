export type SortDirection = "asc" | "desc";

export function SortButton({
  label,
  active,
  direction,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  /** 指定すると active 時の背景色をこの色にする（未指定なら既定のブランドカラー） */
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active && color ? { backgroundColor: color } : undefined}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? (color ? "text-white" : "bg-brand-500 text-white") : "bg-surface text-ink-muted shadow-sm"
      }`}
    >
      {label}
      {active && <span aria-hidden>{direction === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}
