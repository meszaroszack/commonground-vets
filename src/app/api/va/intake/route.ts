import { NextResponse } from "next/server";
import { z } from "zod";
import { listEvidence, markEvidenceStatusByGuid, updateEvidence } from "@/db/repository";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { getBytes } from "@/lib/storage";
import { splitName } from "@/lib/utils";
import { pollIntake, submitIntake } from "@/lib/va-lighthouse/intake-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/),
  evidenceIds: z.array(z.string().uuid()).max(20).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const guid = new URL(request.url).searchParams.get("guid") ?? "";
    if (!guid || guid.length > 80) return NextResponse.json({ error: "Missing upload id." }, { status: 400 });
    const receipt = await pollIntake(guid);
    await markEvidenceStatusByGuid(guid, receipt.status);
    return NextResponse.json(receipt);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "A 5-digit ZIP code is required before upload." }, { status: 400 });
    if (!auth.profile.vaFileNumber?.trim()) {
      return NextResponse.json({ error: "Add the VA file number or sandbox veteran id on your command center first." }, { status: 400 });
    }
    const all = await listEvidence(auth.actor.id);
    const chosen = parsed.data.evidenceIds?.length
      ? all.filter((document) => parsed.data.evidenceIds?.includes(document.id))
      : all;
    const files: Array<{ id: string; filename: string; bytes: Uint8Array }> = [];
    for (const document of chosen) {
      const bytes = await getBytes(document.storagePath);
      if (!bytes) continue;
      files.push({ id: document.id, filename: `${document.docType}.pdf`, bytes });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "There is no saved PDF in the vault yet." }, { status: 400 });
    }
    const primary = files.find((file) => file.filename.startsWith("personal_")) ?? files[0];
    const names = splitName(auth.profile.fullName);
    const receipt = await submitIntake({
      veteranFirstName: names.first,
      veteranLastName: names.last,
      fileNumber: auth.profile.vaFileNumber.trim(),
      zipCode: parsed.data.zipCode,
      primary: { filename: primary.filename, bytes: primary.bytes },
      attachments: files.filter((file) => file.id !== primary.id).map((file) => ({ filename: file.filename, bytes: file.bytes })),
    });
    for (const file of files) {
      await updateEvidence(auth.actor.id, file.id, {
        vaLighthouseUploadUuid: receipt.guid,
        vaLighthouseStatus: receipt.status,
      });
    }
    return NextResponse.json(receipt);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}
