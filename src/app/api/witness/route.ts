import { NextResponse } from "next/server";
import { z } from "zod";
import { getConditionForUser, insertWitness } from "@/db/repository";
import { newId, newToken } from "@/lib/ids";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { appUrl } from "@/lib/public-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conditionId: z.string().uuid(),
  witnessName: z.string().trim().min(1).max(80),
  relationship: z.enum(["service_peer", "spouse_partner", "family", "friend_coworker"]),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Add a first name and how you know each other." }, { status: 400 });
    const condition = await getConditionForUser(auth.actor.id, parsed.data.conditionId);
    if (!condition) return NextResponse.json({ error: "That condition is not on your account." }, { status: 404 });
    const token = newToken();
    await insertWitness({
      id: newId(),
      conditionId: condition.id,
      userId: auth.actor.id,
      token,
      witnessName: parsed.data.witnessName,
      witnessEmail: "",
      witnessPhone: "",
      relationship: parsed.data.relationship,
      rawTranscript: "",
      polishedStatement: "",
      signatureDataUrl: "",
      signedPdfStoragePath: "",
      status: "pending",
      completedAt: null,
    });
    const url = `${appUrl()}/witness/${token}`;
    return NextResponse.json({ token, url });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
