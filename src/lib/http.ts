import "server-only";
import { NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/db/repository";
import type { Profile } from "@/db/types";
import { getActor, type Actor } from "@/lib/auth";

export async function requireApiProfile(): Promise<
  { actor: Actor; profile: Profile; error?: undefined } | { error: NextResponse; actor?: undefined; profile?: undefined }
> {
  const actor = await getActor();
  if (!actor) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong on our side.";
}
