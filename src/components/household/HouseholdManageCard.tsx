"use client";

import { useState } from "react";
import { useHousehold, type Household } from "@/contexts/HouseholdContext";
import { HOUSEHOLD_COLORS } from "@/lib/household/colors";

interface HouseholdManageCardProps {
  household: Household;
  isActive: boolean;
  currentUserId: string;
}

export function HouseholdManageCard({ household, isActive, currentUserId }: HouseholdManageCardProps) {
  const { switchHousehold, renameHousehold, setHouseholdColor, removeMember, leaveHousehold } = useHousehold();
  const [expanded, setExpanded] = useState(isActive);
  const [nameDraft, setNameDraft] = useState(household.name);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const isHost = household.ownerId === currentUserId;

  const handleNameBlur = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== household.name) void renameHousehold(household.id, trimmed);
    else setNameDraft(household.name);
  };

  const handleCopyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopyFeedback("コピーしました");
    } catch {
      setCopyFeedback(household.inviteCode);
    }
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleRemoveMember = async (userId: string) => {
    setMemberError(null);
    const result = await removeMember(household.id, userId);
    if (!result.ok) setMemberError(result.message);
  };

  const handleLeave = async () => {
    const result = await leaveHousehold(household.id);
    if (!result.ok) setMemberError(result.message);
    setConfirmingLeave(false);
  };

  return (
    <div className="rounded-2xl bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left"
      >
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: household.color }}
        />
        <span className="flex-1 truncate text-sm font-bold">{household.name}</span>
        {isActive && <span className="text-[11px] font-bold text-brand-600">表示中</span>}
        {isHost && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            ホスト
          </span>
        )}
        <span aria-hidden className="text-ink-muted">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-black/5 px-5 pb-5 pt-4">
          {!isActive && (
            <button
              type="button"
              onClick={() => void switchHousehold(household.id)}
              className="w-full rounded-xl bg-brand-500 py-2 text-xs font-bold text-white"
            >
              この家計簿を表示する
            </button>
          )}

          {isHost && (
            <div>
              <label className="text-[11px] text-ink-muted" htmlFor={`name-${household.id}`}>
                名前
              </label>
              <input
                id={`name-${household.id}`}
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={handleNameBlur}
                className="mt-1 w-full rounded-xl bg-canvas px-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {isHost && (
            <div>
              <p className="text-[11px] text-ink-muted">色</p>
              <div className="mt-1 flex gap-1.5">
                {HOUSEHOLD_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    onClick={() => void setHouseholdColor(household.id, option.value)}
                    className="size-7 shrink-0 rounded-full"
                    style={{
                      backgroundColor: option.value,
                      outline: household.color === option.value ? "2px solid #1f2937" : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] text-ink-muted">招待コード</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-canvas px-3 py-2 text-center text-sm font-bold tracking-widest">
                {household.inviteCode}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyInviteCode()}
                className="rounded-xl border border-black/10 px-3 py-2 text-xs font-medium text-ink-muted"
              >
                コピー
              </button>
            </div>
            {copyFeedback && <p className="mt-1 text-center text-xs text-ink-muted">{copyFeedback}</p>}
          </div>

          <div>
            <p className="text-[11px] text-ink-muted">メンバー（{household.members.length}人）</p>
            <ul className="mt-1 space-y-1">
              {household.members.map((member) => (
                <li key={member.userId} className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">
                    👤 {member.displayName}
                    {member.userId === household.ownerId && " （ホスト）"}
                  </span>
                  {isHost && member.userId !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member.userId)}
                      className="text-status-over"
                    >
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {memberError && <p className="mt-1 text-xs text-status-over">{memberError}</p>}
          </div>

          {!isHost && (
            <div>
              {confirmingLeave ? (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs text-ink-muted">本当に退出しますか？</p>
                  <button
                    type="button"
                    onClick={() => void handleLeave()}
                    className="rounded-xl bg-status-over px-3 py-1.5 text-xs font-bold text-white"
                  >
                    退出する
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingLeave(false)}
                    className="rounded-xl border border-black/10 px-3 py-1.5 text-xs text-ink-muted"
                  >
                    やめる
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingLeave(true)}
                  className="w-full rounded-xl border border-black/10 py-2 text-xs font-medium text-ink-muted"
                >
                  この家計簿から退出する
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
