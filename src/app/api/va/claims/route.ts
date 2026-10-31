import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertProfile } from "@/db/repository";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { createIntentToFile, listClaims } from "@/lib/va-lighthouse/claims-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["status", "record-intent", "sandbox-intent"]),
  itfFiledDate: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Unknown claims action." }, { status: 400 });
    const veteranId = auth.profile.vaFileNumber?.trim();

    if (parsed.data.action === "record-intent") {
      if (!parsed.data.itfFiledDate) {
        return NextResponse.json({ error: "Choose the date you already filed the Intent to File." }, { status: 400 });
      }
      const filed = new Date(parsed.data.itfFiledDate);
      const expiration = new Date(filed);
      expiration.setUTCFullYear(expiration.getUTCFullYear() + 1);
      const profile = await upsertProfile({
        ...auth.profile,
        itfFiledDate: filed.toISOString(),
        itfExpirationDate: expiration.toISOString(),
      });
      return NextResponse.json({
        profile,
        detail: "Recorded locally. This does not file anything with VA.",
      });
    }

    if (!veteranId) {
      return NextResponse.json({ error: "Add a VA file number or sandbox veteran id first." }, { status: 400 });
    }

    if (parsed.data.action === "sandbox-intent") {
      const created = await createIntentToFile(veteranId);
      const profile = await upsertProfile({
        ...auth.profile,
        itfFiledDate: created.filedDate,
        itfExpirationDate: created.expirationDate,
      });
      return NextResponse.json({ ...created, profile });
    }

    const snapshot = await listClaims(veteranId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}
