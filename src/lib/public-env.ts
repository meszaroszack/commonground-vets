function looksPlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("your-project") ||
    lowered.includes("your-anon") ||
    lowered.includes("your-publishable") ||
    lowered.includes("your-service-role") ||
    lowered.includes("your-open-weights") ||
    lowered.includes("your-va-lighthouse") ||
    lowered.includes("password@db.your-project")
  );
}

/** Local preview only. A public Railway deploy must not share one in-memory veteran. */
export function isSharedDemo(): boolean {
  if (isSupabaseConfigured()) return false;
  if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID) return false;
  return true;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url.startsWith("https://") || key.length < 20) return false;
  if (looksPlaceholder(url) || looksPlaceholder(key)) return false;
  return true;
}

export function publicSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
