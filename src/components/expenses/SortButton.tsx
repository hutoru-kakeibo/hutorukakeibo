export type SortDirection = "asc" | "desc";

export function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "bg-brand-500 text-white" : "bg-surface text-ink-muted shadow-sm"
      }`}
    >
      {label}
      {active && <span aria-hidden>{direction === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}
