import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertProfile } from "@/db/repository";
import { monthlyCompensation } from "@/lib/ai/cfr-criteria";
import { errorMessage, requireApiProfile } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  vaFileNumber: z.string().trim().max(32).nullable(),
  currentRating: z.number().int().min(0).max(100),
});

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check your name, file number, and rating." }, { status: 400 });
    if (parsed.data.currentRating % 10 !== 0) {
      return NextResponse.json({ error: "Combined ratings are stored in 10% steps." }, { status: 400 });
    }
    const monthly = monthlyCompensation(parsed.data.currentRating);
    const profile = await upsertProfile({
      ...auth.profile,
      fullName: parsed.data.fullName,
      vaFileNumber: parsed.data.vaFileNumber || null,
      currentRating: parsed.data.currentRating,
      currentMonthlyComp: monthly == null ? auth.profile.currentMonthlyComp : monthly.toFixed(2),
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
