import "server-only";
import { redirect } from "next/navigation";
import { getProfile, upsertProfile } from "@/db/repository";
import { DEMO_USER_ID, type Profile } from "@/db/types";
import { isSharedDemo, isSupabaseConfigured } from "@/lib/public-env";
import { createClient } from "@/lib/supabase/server";

export type Actor = {
  id: string;
  email: string;
  demo: boolean;
};

export async function getActor(): Promise<Actor | null> {
  if (isSharedDemo()) {
    return { id: DEMO_USER_ID, email: "jordan.hale@example.com", demo: true };
  }
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || !subject) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  return { id: subject, email, demo: false };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/auth/login");
  return actor;
}

export async function requireProfile(): Promise<{ actor: Actor; profile: Profile }> {
  const actor = await requireActor();
  const existing = await getProfile(actor.id);
  if (existing) return { actor, profile: existing };
  const profile = await upsertProfile({
    id: actor.id,
    fullName: actor.demo ? "Jordan Hale" : actor.email.split("@")[0] || "Veteran",
    email: actor.email,
    vaFileNumber: null,
    currentRating: 0,
    currentMonthlyComp: "0.00",
    itfFiledDate: null,
    itfExpirationDate: null,
    createdAt: new Date().toISOString(),
  });
  return { actor, profile };
}
