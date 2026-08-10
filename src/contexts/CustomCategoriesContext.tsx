"use client";

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
import { DEFAULT_CUSTOM_CATEGORY_EMOJI } from "@/lib/expenses/customCategoryEmojis";
import type { TransactionType } from "@/lib/expenses/types";
import { useHousehold } from "./HouseholdContext";

export interface CustomCategory {
  id: string;
  label: string;
  emoji: string;
  type: TransactionType;
}

type CreateResult = { ok: true } | { ok: false; message: string };

interface CustomCategoriesContextValue {
  customExpenseCategories: CustomCategory[];
  customIncomeCategories: CustomCategory[];
  loading: boolean;
  addCustomCategory: (type: TransactionType, label: string, emoji: string) => Promise<CreateResult>;
  removeCustomCategory: (id: string) => Promise<void>;
}

const CustomCategoriesContext = createContext<CustomCategoriesContextValue | null>(null);

export function CustomCategoriesProvider({ children }: { children: ReactNode }) {
  const { activeHousehold } = useHousehold();
  const supabase = useMemo(() => createClient(), []);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 効果(useEffect)本体から同期的に setState してしまわないよう、必ずマイクロタスクを1つ挟む
    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!activeHousehold) {
        setCustomCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("custom_categories")
        .select("id, label, emoji, type")
        .eq("household_id", activeHousehold.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) console.error("[custom_categories] 一覧の取得に失敗しました", error);
      setCustomCategories(
        (data ?? []).map((row) => ({ ...row, type: row.type === "income" ? "income" : "expense" })),
      );
      setLoading(false);
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [supabase, activeHousehold]);

  const addCustomCategory = useCallback(
    async (type: TransactionType, label: string, emoji: string): Promise<CreateResult> => {
      if (!activeHousehold) return { ok: false, message: "家計簿が選択されていません" };
      const trimmed = label.trim();
      if (!trimmed) return { ok: false, message: "カテゴリ名を入力してください" };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { ok: false, message: "ログインしていません" };

      const { data, error } = await supabase
        .from("custom_categories")
        .insert({
          household_id: activeHousehold.id,
          label: trimmed,
          emoji: emoji || DEFAULT_CUSTOM_CATEGORY_EMOJI,
          type,
          created_by: userData.user.id,
        })
        .select("id, label, emoji, type")
        .single();

      if (error) {
        // premium プラン以外での作成は RLS で拒否される
        if (error.code === "42501") {
          return { ok: false, message: "この機能はプレミアムプラン限定です" };
        }
        console.error("[custom_categories] 作成に失敗しました", error);
        return { ok: false, message: "作成に失敗しました" };
      }
      if (data) {
        setCustomCategories((prev) => [
          ...prev,
          { ...data, type: data.type === "income" ? "income" : "expense" },
        ]);
      }
      return { ok: true };
    },
    [supabase, activeHousehold],
  );

  const removeCustomCategory = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("custom_categories").delete().eq("id", id);
      if (error) {
        console.error("[custom_categories] 削除に失敗しました", error);
        return;
      }
      setCustomCategories((prev) => prev.filter((category) => category.id !== id));
    },
    [supabase],
  );

  const customExpenseCategories = useMemo(
    () => customCategories.filter((category) => category.type === "expense"),
    [customCategories],
  );
  const customIncomeCategories = useMemo(
    () => customCategories.filter((category) => category.type === "income"),
    [customCategories],
  );

  const value = useMemo<CustomCategoriesContextValue>(
    () => ({
      customExpenseCategories,
      customIncomeCategories,
      loading,
      addCustomCategory,
      removeCustomCategory,
    }),
    [customExpenseCategories, customIncomeCategories, loading, addCustomCategory, removeCustomCategory],
  );

  return <CustomCategoriesContext.Provider value={value}>{children}</CustomCategoriesContext.Provider>;
}

export function useCustomCategories() {
  const ctx = useContext(CustomCategoriesContext);
  if (!ctx) throw new Error("useCustomCategories must be used within CustomCategoriesProvider");
  return ctx;
}
