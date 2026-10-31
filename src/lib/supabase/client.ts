import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicSupabaseKey } from "@/lib/public-env";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicSupabaseKey();
  if (!isSupabaseConfigured() || !url || !key) {
    throw new Error("Supabase is not configured.");
  }
  return createBrowserClient(url, key);
}
