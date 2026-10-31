import { NextResponse } from "next/server";
import { z } from "zod";
import { getWitnessBundle, updateWitness } from "@/db/repository";
import { introducesNewNumbers, stitchWitnessStatement } from "@/lib/ai/guard";
import { completeJson } from "@/lib/ai/open-llm";
import { witnessSystem } from "@/lib/ai/prompts";
import { saveEvidenceFile } from "@/lib/evidence";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { errorMessage } from "@/lib/http";
import { buildForm2110210 } from "@/lib/pdf/form-21-10210";
import { decodePngDataUrl } from "@/lib/pdf/layout";
import { firstName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("synthesize"),
    transcript: z.string().trim().min(1).max(20_000),
  }),
  z.object({
    action: z.literal("sign"),
    transcript: z.string().trim().min(1).max(20_000),
    polishedStatement: z.string().trim().min(1).max(20_000),
    witnessName: z.string().trim().min(1).max(120),
    witnessEmail: z.string().trim().email().max(160),
    witnessPhone: z.string().trim().min(7).max(40),
    signatureDataUrl: z.string().max(1_800_000),
  }),
]);

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const bundle = await getWitnessBundle(token);
  if (!bundle) return NextResponse.json({ error: "This link is not active." }, { status: 404 });
  return NextResponse.json({
    veteranFirstName: firstName(bundle.profile.fullName),
    conditionName: bundle.condition.name,
    relationship: bundle.witness.relationship,
    witnessName: bundle.witness.witnessName,
    status: bundle.witness.status,
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const bundle = await getWitnessBundle(token);
    if (!bundle) return NextResponse.json({ error: "This link is not active." }, { status: 404 });
    if (bundle.witness.status === "completed") {
      return NextResponse.json({ error: "This statement is already signed." }, { status: 409 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the statement, contact info, and signature." }, { status: 400 });

    const relationshipLabel = RELATIONSHIP_LABELS[bundle.witness.relationship];
    if (parsed.data.action === "synthesize") {
      const fallback = stitchWitnessStatement({
        witnessName: bundle.witness.witnessName || "The witness",
        veteranName: bundle.profile.fullName,
        relationshipLabel,
        condition: bundle.condition.name,
        transcript: parsed.data.transcript,
      });
      const model = await completeJson(witnessSystem(bundle.condition.name), parsed.data.transcript);
      const candidate = z.object({ statement: z.string().min(1).max(20_000) }).safeParse(model);
      const polished =
        candidate.success && !introducesNewNumbers(parsed.data.transcript, candidate.data.statement)
          ? candidate.data.statement.trim()
          : fallback;
      await updateWitness(token, { rawTranscript: parsed.data.transcript, polishedStatement: polished });
      return NextResponse.json({ polishedStatement: polished, llm: candidate.success ? "open-weights" : "local" });
    }

    if (introducesNewNumbers(parsed.data.transcript, parsed.data.polishedStatement)) {
      return NextResponse.json(
        { error: "The statement contains numbers that were not in the original account. Edit it back to what was actually said." },
        { status: 400 },
      );
    }
    const signature = decodePngDataUrl(parsed.data.signatureDataUrl);
    if (!signature) return NextResponse.json({ error: "Sign in the box before sending." }, { status: 400 });
    const signedAt = new Date().toISOString();
    const pdf = await buildForm2110210({
      role: "witness",
      veteranName: bundle.profile.fullName,
      vaFileNumber: bundle.profile.vaFileNumber,
      conditionName: bundle.condition.name,
      statement: parsed.data.polishedStatement,
      witnessName: parsed.data.witnessName,
      relationshipLabel,
      witnessEmail: parsed.data.witnessEmail,
      witnessPhone: parsed.data.witnessPhone,
      signaturePng: signature,
      signedAtIso: signedAt,
    });
    const evidence = await saveEvidenceFile({
      userId: bundle.profile.id,
      conditionId: bundle.condition.id,
      title: `Witness statement — ${parsed.data.witnessName}`,
      docType: "witness_21_10210",
      bytes: pdf,
      contentType: "application/pdf",
    });
    await updateWitness(token, {
      witnessName: parsed.data.witnessName,
      witnessEmail: parsed.data.witnessEmail,
      witnessPhone: parsed.data.witnessPhone,
      rawTranscript: parsed.data.transcript,
      polishedStatement: parsed.data.polishedStatement,
      signatureDataUrl: parsed.data.signatureDataUrl,
      signedPdfStoragePath: evidence.storagePath,
      status: "completed",
      completedAt: signedAt,
    });
    return NextResponse.json({ ok: true, evidenceId: evidence.id });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
