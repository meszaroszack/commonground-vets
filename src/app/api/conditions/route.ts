import { NextResponse } from "next/server";
import { z } from "zod";
import { insertCondition } from "@/db/repository";
import { emptyMetrics } from "@/db/types";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  diagnosticCode: z.string().trim().min(2).max(12),
  claimType: z.enum(["increase", "new", "secondary"]),
  currentRating: z.number().int().min(0).max(100),
  targetRating: z.number().int().min(0).max(100),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Name, diagnostic code, and claim type are required." }, { status: 400 });
    const condition = await insertCondition({
      id: newId(),
      userId: auth.actor.id,
      name: parsed.data.name,
      diagnosticCode: parsed.data.diagnosticCode.toUpperCase(),
      claimType: parsed.data.claimType,
      currentRating: parsed.data.currentRating,
      targetRating: parsed.data.targetRating,
      conversationHistory: [],
      extractedMetrics: emptyMetrics(),
      draftPersonalStatement: "",
      cpExamCheatSheet: "",
      status: "drafting",
    });
    return NextResponse.json({ condition });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
