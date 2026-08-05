export interface HouseholdColorOption {
  value: string;
  label: string;
}

export const HOUSEHOLD_COLORS: HouseholdColorOption[] = [
  { value: "#22a06b", label: "グリーン" },
  { value: "#0ea5e9", label: "ブルー" },
  { value: "#f59e0b", label: "オレンジ" },
  { value: "#ec4899", label: "ピンク" },
  { value: "#8b5cf6", label: "パープル" },
  { value: "#ef4444", label: "レッド" },
];

export const DEFAULT_HOUSEHOLD_COLOR = HOUSEHOLD_COLORS[0].value;
