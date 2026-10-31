import JSZip from "jszip";
import { NextResponse } from "next/server";
import { listEvidence } from "@/db/repository";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { getBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
}

export async function GET() {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const documents = await listEvidence(auth.actor.id);
    const zip = new JSZip();
    const lines = [
      "COMMON GROUND — MASTER CLAIM PACKET",
      "",
      "This folder is for you to upload yourself at VA.gov, or to send through VA Lighthouse from your own account.",
      "Common Ground does not charge a fee. You keep 100% of any compensation.",
      "A file in this folder is not a VA decision. Read every statement before you file it.",
      "",
      "Files:",
    ];
    for (const document of documents) {
      const bytes = await getBytes(document.storagePath);
      if (!bytes) {
        lines.push(`- MISSING ${document.title} (${document.id})`);
        continue;
      }
      const filename = `${safeName(document.title)}-${document.id.slice(0, 8)}.pdf`;
      zip.file(filename, bytes);
      lines.push(`- ${filename}`);
      lines.push(`  type: ${DOC_TYPE_LABELS[document.docType]}`);
      lines.push(`  sha256: ${document.sha256Hash}`);
      lines.push(`  lighthouse: ${document.vaLighthouseStatus}`);
    }
    if (documents.length === 0) {
      lines.push("- No documents yet. Create a personal statement or witness statement first.");
    }
    lines.push("", "Upload path if you are filing by hand: https://www.va.gov/disability/upload-supporting-evidence/");
    zip.file("MANIFEST_READ_ME.txt", lines.join("\n"));
    const archive = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(Buffer.from(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=\"common-ground-claim-packet.zip\"",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
