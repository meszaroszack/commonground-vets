import { NextResponse } from "next/server";
import { getConditionForUser } from "@/db/repository";
import type { DocType } from "@/db/types";
import { saveEvidenceFile } from "@/lib/evidence";
import { errorMessage, requireApiProfile } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Record<string, DocType> = {
  dbq: "dbq",
  nexus_letter: "nexus_letter",
  private_medical_record: "private_medical_record",
};

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const docType = ALLOWED[String(form.get("docType") ?? "")];
    const conditionId = String(form.get("conditionId") ?? "");
    if (!(file instanceof File) || !docType || !title || title.length > 140) {
      return NextResponse.json({ error: "Add a title, a document type, and a file." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > 15_000_000) {
      return NextResponse.json({ error: "Files need to be under 15 MB." }, { status: 400 });
    }
    const condition = await getConditionForUser(auth.actor.id, conditionId);
    if (!condition) return NextResponse.json({ error: "Choose a condition on your account." }, { status: 404 });
    const evidence = await saveEvidenceFile({
      userId: auth.actor.id,
      conditionId: condition.id,
      title,
      docType,
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ evidence });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
