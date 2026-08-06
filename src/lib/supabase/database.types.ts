// supabase/schema.sql と対応する手書きの型定義。
// Supabase CLI (`supabase gen types typescript`) が使えるようになったら自動生成に置き換えてよい。
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          active_household_id: string | null;
          created_at: string;
        };
        Insert: { id: string; display_name: string; avatar_url?: string | null };
        Update: { display_name?: string; avatar_url?: string | null; active_household_id?: string | null };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          color: string;
          monthly_budget: number;
          invite_code: string;
          owner_id: string;
          plan: string;
          category_order: string[];
          created_at: string;
        };
        Insert: {
          name: string;
          color?: string;
          monthly_budget?: number;
          invite_code: string;
          owner_id: string;
          plan?: string;
          category_order?: string[];
        };
        Update: {
          name?: string;
          color?: string;
          monthly_budget?: number;
          plan?: string;
          category_order?: string[];
        };
        Relationships: [];
      };
      household_members: {
        Row: { household_id: string; user_id: string; joined_at: string };
        Insert: { household_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          household_id: string;
          created_by: string;
          amount: number;
          category_id: string;
          expense_date: string;
          memo: string;
          created_at: string;
        };
        Insert: {
          household_id: string;
          created_by: string;
          amount: number;
          category_id: string;
          expense_date: string;
          memo?: string;
        };
        Update: {
          amount?: number;
          category_id?: string;
          expense_date?: string;
          memo?: string;
        };
        Relationships: [];
      };
      custom_categories: {
        Row: {
          id: string;
          household_id: string;
          label: string;
          emoji: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          household_id: string;
          label: string;
          emoji?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      category_budgets: {
        Row: {
          id: string;
          household_id: string;
          category_id: string;
          monthly_budget: number;
          created_at: string;
        };
        Insert: {
          household_id: string;
          category_id: string;
          monthly_budget: number;
        };
        Update: { monthly_budget?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_household_by_invite_code: {
        Args: { code: string };
        Returns: string;
      };
      create_household: {
        Args: { household_name: string; household_color?: string };
        Returns: string;
      };
      set_active_household: {
        Args: { target_household_id: string };
        Returns: undefined;
      };
      remove_household_member: {
        Args: { target_household_id: string; target_user_id: string };
        Returns: undefined;
      };
      leave_household: {
        Args: { target_household_id: string };
        Returns: undefined;
      };
      delete_household: {
        Args: { target_household_id: string };
        Returns: undefined;
      };
    };
  };
}
