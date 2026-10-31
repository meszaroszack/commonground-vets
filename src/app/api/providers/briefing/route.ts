import { NextResponse } from "next/server";
import { getConditionForUser } from "@/db/repository";
import { lookupCriteria } from "@/lib/ai/cfr-criteria";
import { userTranscript } from "@/lib/ai/guard";
import { saveEvidenceFile } from "@/lib/evidence";
import { errorMessage, requireApiProfile } from "@/lib/http";
import { buildDoctorPacket } from "@/lib/pdf/doctor-packet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const conditionId = new URL(request.url).searchParams.get("conditionId") ?? "";
    const condition = await getConditionForUser(auth.actor.id, conditionId);
    if (!condition) return NextResponse.json({ error: "Choose one of your conditions first." }, { status: 404 });
    const criterion = lookupCriteria(condition);
    const excerpt = condition.draftPersonalStatement.trim() || userTranscript(condition.conversationHistory).slice(0, 2500);
    const pdf = await buildDoctorPacket({
      veteranName: auth.profile.fullName,
      conditionName: condition.name,
      diagnosticCode: condition.diagnosticCode,
      claimType: condition.claimType,
      metrics: condition.extractedMetrics,
      statementExcerpt: excerpt,
      criterion,
    });
    const evidence = await saveEvidenceFile({
      userId: auth.actor.id,
      conditionId: condition.id,
      title: `Clinician briefing — ${condition.name}`,
      docType: "clinician_briefing",
      bytes: pdf,
      contentType: "application/pdf",
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="clinician-briefing-${condition.diagnosticCode}.pdf"`,
        "X-Evidence-Id": evidence.id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
