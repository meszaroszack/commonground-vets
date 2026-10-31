import { NextResponse } from "next/server";
import { getEvidenceForUser } from "@/db/repository";
import { requireApiProfile } from "@/lib/http";
import { getBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProfile();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const document = await getEvidenceForUser(auth.actor.id, id);
  if (!document) return NextResponse.json({ error: "That file is not in your vault." }, { status: 404 });
  const bytes = await getBytes(document.storagePath);
  if (!bytes) return NextResponse.json({ error: "The file bytes are not available in this session." }, { status: 404 });
  const pdf = document.storagePath.endsWith(".pdf") || document.docType !== "private_medical_record";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": pdf ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.id}.pdf"`,
    },
  });
}
