import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * RLS を迂回する service role クライアント。Stripe Webhook のように
 * 「ログインユーザーがいない文脈で households.plan を更新する」場合にのみ使う。
 *
 * service role キーは絶対にクライアントへ渡さないこと（Route Handler 内でのみ使用）。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercel/.env.local に設定してください。",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
