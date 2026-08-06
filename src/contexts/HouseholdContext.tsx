"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_HOUSEHOLD_COLOR } from "@/lib/household/colors";
import { useAuth } from "./AuthContext";

export interface HouseholdMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type HouseholdPlan = "free" | "premium";

export interface Household {
  id: string;
  name: string;
  color: string;
  monthlyBudget: number;
  inviteCode: string;
  ownerId: string;
  plan: HouseholdPlan;
  members: HouseholdMember[];
  categoryOrder: string[];
}

type ActionResult = { ok: true } | { ok: false; message: string };

interface HouseholdContextValue {
  households: Household[];
  activeHousehold: Household | null;
  loading: boolean;
  switchHousehold: (id: string) => Promise<void>;
  createHousehold: (name: string, color: string) => Promise<ActionResult>;
  renameHousehold: (id: string, name: string) => Promise<void>;
  setHouseholdColor: (id: string, color: string) => Promise<void>;
  setMonthlyBudget: (value: number) => Promise<void>;
  setCategoryOrder: (order: string[]) => Promise<void>;
  joinByInviteCode: (code: string) => Promise<ActionResult>;
  removeMember: (householdId: string, userId: string) => Promise<ActionResult>;
  leaveHousehold: (householdId: string) => Promise<ActionResult>;
  deleteHousehold: (householdId: string) => Promise<ActionResult>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

interface FetchResult {
  households: Household[];
  activeHouseholdId: string | null;
}

/**
 * 純粋なデータ取得のみを行うヘルパー（setState を含まない）。
 * useEffect からもユーザー操作ハンドラからも同じロジックを再利用するために分離している。
 */
async function fetchMyHouseholds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FetchResult> {
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("active_household_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[household] profile の取得に失敗しました", profileError);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId);

  if (membershipsError) {
    console.error("[household] 所属 household の取得に失敗しました", membershipsError);
    return { households: [], activeHouseholdId: null };
  }

  const householdIds = [...new Set((memberships ?? []).map((row) => row.household_id))];
  if (householdIds.length === 0) {
    return { households: [], activeHouseholdId: null };
  }

  const { data: householdRows, error: householdsError } = await supabase
    .from("households")
    .select("id, name, color, monthly_budget, invite_code, owner_id, plan, category_order")
    .in("id", householdIds);

  if (householdsError) {
    console.error("[household] households の取得に失敗しました", householdsError);
    return { households: [], activeHouseholdId: null };
  }

  const { data: allMemberRows, error: allMemberRowsError } = await supabase
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds);

  if (allMemberRowsError) {
    console.error("[household] メンバー一覧の取得に失敗しました", allMemberRowsError);
  }

  const memberUserIds = [...new Set((allMemberRows ?? []).map((row) => row.user_id))];
  const { data: profileRows, error: profileRowsError } = memberUserIds.length
    ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", memberUserIds)
    : { data: [], error: null };

  if (profileRowsError) {
    console.error("[household] プロフィール一覧の取得に失敗しました", profileRowsError);
  }

  const profileById = new Map((profileRows ?? []).map((row) => [row.id, row]));

  const households: Household[] = (householdRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    monthlyBudget: row.monthly_budget,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    plan: row.plan === "premium" ? "premium" : "free",
    categoryOrder: Array.isArray(row.category_order) ? row.category_order : [],
    members: (allMemberRows ?? [])
      .filter((member) => member.household_id === row.id)
      .map((member) => {
        const profile = profileById.get(member.user_id);
        return {
          userId: member.user_id,
          displayName: profile?.display_name ?? "メンバー",
          avatarUrl: profile?.avatar_url ?? null,
        };
      }),
  }));

  return { households, activeHouseholdId: profileRow?.active_household_id ?? null };
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setActiveHouseholdId(null);
      return;
    }
    const result = await fetchMyHouseholds(supabase, user.id);
    setHouseholds(result.households);
    setActiveHouseholdId(result.activeHouseholdId);
  }, [supabase, user]);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    // 効果(useEffect)本体から同期的に setState してしまわないよう、必ずマイクロタスクを1つ挟む
    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!user) {
        setHouseholds([]);
        setActiveHouseholdId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await fetchMyHouseholds(supabase, user.id);
      if (cancelled) return;
      setHouseholds(result.households);
      setActiveHouseholdId(result.activeHouseholdId);
      setLoading(false);
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [status, user, supabase]);

  const activeHousehold = useMemo(() => {
    if (households.length === 0) return null;
    return households.find((h) => h.id === activeHouseholdId) ?? households[0];
  }, [households, activeHouseholdId]);

  const switchHousehold = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("set_active_household", { target_household_id: id });
      if (error) {
        console.error("[household] 切り替えに失敗しました", error);
        return;
      }
      setActiveHouseholdId(id);
    },
    [supabase],
  );

  const createHousehold = useCallback(
    async (name: string, color: string): Promise<ActionResult> => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, message: "名前を入力してください" };

      const { data: newId, error } = await supabase.rpc("create_household", {
        household_name: trimmed,
        household_color: color || DEFAULT_HOUSEHOLD_COLOR,
      });
      if (error || !newId) {
        console.error("[household] 作成に失敗しました", error);
        return { ok: false, message: "作成に失敗しました" };
      }

      await reload();
      return { ok: true };
    },
    [supabase, reload],
  );

  const renameHousehold = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const { error } = await supabase.from("households").update({ name: trimmed }).eq("id", id);
      if (error) {
        console.error("[household] 名称変更に失敗しました", error);
        return;
      }
      setHouseholds((prev) => prev.map((h) => (h.id === id ? { ...h, name: trimmed } : h)));
    },
    [supabase],
  );

  const setHouseholdColor = useCallback(
    async (id: string, color: string) => {
      const { error } = await supabase.from("households").update({ color }).eq("id", id);
      if (error) {
        console.error("[household] 色変更に失敗しました", error);
        return;
      }
      setHouseholds((prev) => prev.map((h) => (h.id === id ? { ...h, color } : h)));
    },
    [supabase],
  );

  const setMonthlyBudget = useCallback(
    async (value: number) => {
      if (!activeHousehold) return;
      const { error } = await supabase
        .from("households")
        .update({ monthly_budget: value })
        .eq("id", activeHousehold.id);
      if (error) {
        console.error("[household] 予算更新に失敗しました", error);
        return;
      }
      setHouseholds((prev) =>
        prev.map((h) => (h.id === activeHousehold.id ? { ...h, monthlyBudget: value } : h)),
      );
    },
    [supabase, activeHousehold],
  );

  const setCategoryOrder = useCallback(
    async (order: string[]) => {
      if (!activeHousehold) return;
      const { error } = await supabase
        .from("households")
        .update({ category_order: order })
        .eq("id", activeHousehold.id);
      if (error) {
        console.error("[household] カテゴリ順の更新に失敗しました", error);
        return;
      }
      setHouseholds((prev) =>
        prev.map((h) => (h.id === activeHousehold.id ? { ...h, categoryOrder: order } : h)),
      );
    },
    [supabase, activeHousehold],
  );

  const joinByInviteCode = useCallback(
    async (code: string): Promise<ActionResult> => {
      const { error } = await supabase.rpc("join_household_by_invite_code", { code });
      if (error) {
        return { ok: false, message: "招待コードが正しくないか、参加できませんでした" };
      }
      await reload();
      return { ok: true };
    },
    [supabase, reload],
  );

  const removeMember = useCallback(
    async (householdId: string, userId: string): Promise<ActionResult> => {
      const { error } = await supabase.rpc("remove_household_member", {
        target_household_id: householdId,
        target_user_id: userId,
      });
      if (error) {
        console.error("[household] メンバー削除に失敗しました", error);
        return { ok: false, message: "削除に失敗しました" };
      }
      await reload();
      return { ok: true };
    },
    [supabase, reload],
  );

  const leaveHousehold = useCallback(
    async (householdId: string): Promise<ActionResult> => {
      const { error } = await supabase.rpc("leave_household", { target_household_id: householdId });
      if (error) {
        return { ok: false, message: "ホストは家計簿から退出できません" };
      }
      await reload();
      return { ok: true };
    },
    [supabase, reload],
  );

  const deleteHousehold = useCallback(
    async (householdId: string): Promise<ActionResult> => {
      const { error } = await supabase.rpc("delete_household", { target_household_id: householdId });
      if (error) {
        const message =
          error.message?.includes("cannot_delete_last_household")
            ? "最後の家計簿は削除できません"
            : "削除に失敗しました（ホストのみ削除できます）";
        return { ok: false, message };
      }
      await reload();
      return { ok: true };
    },
    [supabase, reload],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      households,
      activeHousehold,
      loading,
      switchHousehold,
      createHousehold,
      renameHousehold,
      setHouseholdColor,
      setMonthlyBudget,
      setCategoryOrder,
      joinByInviteCode,
      removeMember,
      leaveHousehold,
      deleteHousehold,
    }),
    [
      households,
      activeHousehold,
      loading,
      switchHousehold,
      createHousehold,
      renameHousehold,
      setHouseholdColor,
      setMonthlyBudget,
      setCategoryOrder,
      joinByInviteCode,
      removeMember,
      leaveHousehold,
      deleteHousehold,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}
