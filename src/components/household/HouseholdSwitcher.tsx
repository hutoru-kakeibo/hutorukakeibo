"use client";

import { useState } from "react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { DEFAULT_HOUSEHOLD_COLOR, HOUSEHOLD_COLORS } from "@/lib/household/colors";

export function HouseholdSwitcher() {
  const { households, activeHousehold, switchHousehold, createHousehold } = useHousehold();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_HOUSEHOLD_COLOR);
  const [error, setError] = useState<string | null>(null);

  if (!activeHousehold) return null;

  const handleSwitch = (id: string) => {
    if (id !== activeHousehold.id) void switchHousehold(id);
    setOpen(false);
  };

  const handleCreate = async () => {
    setError(null);
    const result = await createHousehold(newName, newColor);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNewName("");
    setNewColor(DEFAULT_HOUSEHOLD_COLOR);
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-xs font-bold shadow-sm"
      >
        <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: activeHousehold.color }} />
        {activeHousehold.name}
        <span aria-hidden className="text-ink-muted">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-2xl bg-surface p-3 text-left shadow-lg">
          <ul className="space-y-1">
            {households.map((household) => (
              <li key={household.id}>
                <button
                  type="button"
                  onClick={() => handleSwitch(household.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    household.id === activeHousehold.id ? "bg-brand-50 font-bold" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: household.color }}
                  />
                  <span className="flex-1 truncate">{household.name}</span>
                  {household.members.length > 1 && (
                    <span className="text-[11px] text-ink-muted">{household.members.length}人</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-black/5 pt-2">
            {creating ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="例）友達と旅行費用"
                  className="w-full rounded-xl bg-canvas px-3 py-2 text-sm outline-none"
                />
                <div className="flex gap-1.5">
                  {HOUSEHOLD_COLORS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={option.label}
                      onClick={() => setNewColor(option.value)}
                      className="size-7 shrink-0 rounded-full"
                      style={{
                        backgroundColor: option.value,
                        outline: newColor === option.value ? "2px solid #1f2937" : "none",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-status-over">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    className="flex-1 rounded-xl bg-brand-500 py-2 text-xs font-bold text-white"
                  >
                    作成する
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs text-ink-muted"
                  >
                    やめる
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-brand-600"
              >
                + 新しい家計簿を作る
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
