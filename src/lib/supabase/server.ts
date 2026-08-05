import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Server Component / Route Handler / Server Action から使う Supabase クライアント。
 * Server Component からは Cookie を書き換えられないため、setAll は握りつぶす
 * （セッション更新は middleware 側で行う）。
 */
export async function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component からの呼び出し。middleware がセッションを更新するため無視してよい。
        }
      },
    },
  });
}
