import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isStorageConfigured } from "@/lib/env";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isStorageConfigured() || !url || !key) {
    throw new Error("Supabase storage is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
