import "server-only";
import { insertEvidence } from "@/db/repository";
import type { DocType, EvidenceDocument } from "@/db/types";
import { newId, sha256Hex } from "@/lib/ids";
import { putBytes } from "@/lib/storage";

export async function saveEvidenceFile(input: {
  userId: string;
  conditionId: string;
  title: string;
  docType: DocType;
  bytes: Uint8Array;
  contentType: string;
}): Promise<EvidenceDocument> {
  const id = newId();
  const storagePath = `${input.userId}/${id}`;
  await putBytes(storagePath, input.bytes, input.contentType);
  return insertEvidence({
    id,
    userId: input.userId,
    conditionId: input.conditionId,
    title: input.title,
    docType: input.docType,
    storagePath,
    sha256Hash: sha256Hex(input.bytes),
    vaLighthouseUploadUuid: null,
    vaLighthouseStatus: "local",
    createdAt: new Date().toISOString(),
  });
}
