import { NextResponse } from "next/server";
import { z } from "zod";
import { getConditionForUser, updateCondition } from "@/db/repository";
import { lookupCriteria } from "@/lib/ai/cfr-criteria";
import { mergeMetrics, missingTopics, nextLocalQuestion } from "@/lib/ai/extract";
import { introducesNewNumbers, stitchPersonalStatement, userTranscript } from "@/lib/ai/guard";
import { completeJson, llmMode } from "@/lib/ai/open-llm";
import { examGuideSystem, interviewerSystem, statementSystem } from "@/lib/ai/prompts";
import { buildExamGuidePdf } from "@/lib/pdf/exam-guide";
import { buildForm2110210 } from "@/lib/pdf/form-21-10210";
import { decodePngDataUrl } from "@/lib/pdf/layout";
import { saveEvidenceFile } from "@/lib/evidence";
import { errorMessage, requireApiProfile } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("interview"),
    conditionId: z.string().uuid(),
    message: z.string().trim().min(1).max(8000),
  }),
  z.object({
    mode: z.literal("synthesize"),
    conditionId: z.string().uuid(),
    draft: z.string().max(20_000).optional(),
    signatureDataUrl: z.string().max(1_800_000).optional(),
  }),
  z.object({
    mode: z.literal("exam_guide"),
    conditionId: z.string().uuid(),
    format: z.enum(["json", "pdf"]).optional(),
  }),
]);

function safeReply(reply: string | undefined, fallback: string): string {
  if (!reply || reply.length > 2000) return fallback;
  if (/\b(pretend|exaggerate|memorize this|target rating|say that you)\b/i.test(reply)) return fallback;
  return reply.trim();
}

async function draftStatement(name: string, conditionName: string, source: string, criterion: ReturnType<typeof lookupCriteria>) {
  const fallback = stitchPersonalStatement(name, conditionName, source.split(/\n+/));
  const parsed = await completeJson(statementSystem(criterion), source);
  const candidate = z.object({ statement: z.string().min(1).max(20_000) }).safeParse(parsed);
  if (!candidate.success) return { text: fallback, llm: "local" as const };
  if (introducesNewNumbers(source, candidate.data.statement)) return { text: fallback, llm: "local" as const };
  return { text: candidate.data.statement.trim(), llm: "open-weights" as const };
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the journal request and try again." }, { status: 400 });
    }
    const condition = await getConditionForUser(auth.actor.id, parsed.data.conditionId);
    if (!condition) return NextResponse.json({ error: "That condition is not on your account." }, { status: 404 });
    const criterion = lookupCriteria(condition);

    if (parsed.data.mode === "interview") {
      const history = [
        ...condition.conversationHistory,
        { role: "user" as const, content: parsed.data.message, timestamp: new Date().toISOString() },
      ];
      const source = userTranscript(history);
      const metrics = mergeMetrics(condition.extractedMetrics, source, criterion);
      const missing = missingTopics(metrics, criterion);
      const fallback = nextLocalQuestion(metrics, criterion);
      const model = await completeJson(interviewerSystem(criterion, missing), source || parsed.data.message);
      const reply = safeReply(z.object({ reply: z.string() }).safeParse(model).data?.reply, fallback);
      history.push({ role: "assistant", content: reply, timestamp: new Date().toISOString() });
      const saved = await updateCondition(auth.actor.id, condition.id, {
        conversationHistory: history,
        extractedMetrics: metrics,
      });
      return NextResponse.json({
        reply,
        extractedMetrics: saved?.extractedMetrics ?? metrics,
        llm: model ? llmMode() : "local",
      });
    }

    const source = userTranscript(condition.conversationHistory);
    if (parsed.data.mode === "synthesize") {
      const provided = parsed.data.draft?.trim();
      const drafted = provided
        ? { text: provided, llm: "local" as const }
        : await draftStatement(auth.profile.fullName, condition.name, source, criterion);
      if (!drafted.text.trim()) {
        return NextResponse.json({ error: "Tell a little of the story before synthesizing a statement." }, { status: 400 });
      }
      if (!parsed.data.signatureDataUrl) {
        await updateCondition(auth.actor.id, condition.id, { draftPersonalStatement: drafted.text });
        return NextResponse.json({ draftStatement: drafted.text, llm: drafted.llm });
      }
      const signature = decodePngDataUrl(parsed.data.signatureDataUrl);
      if (!signature) return NextResponse.json({ error: "The signature needs to be a PNG from the pad." }, { status: 400 });
      const signedAtIso = new Date().toISOString();
      const pdf = await buildForm2110210({
        role: "veteran",
        veteranName: auth.profile.fullName,
        vaFileNumber: auth.profile.vaFileNumber,
        conditionName: condition.name,
        statement: drafted.text,
        signaturePng: signature,
        signedAtIso,
      });
      const evidence = await saveEvidenceFile({
        userId: auth.actor.id,
        conditionId: condition.id,
        title: `Personal statement — ${condition.name}`,
        docType: "personal_21_10210",
        bytes: pdf,
        contentType: "application/pdf",
      });
      await updateCondition(auth.actor.id, condition.id, {
        draftPersonalStatement: drafted.text,
        status: condition.status === "submitted" ? "submitted" : "evidence_ready",
      });
      return NextResponse.json({
        draftStatement: drafted.text,
        evidenceId: evidence.id,
        downloadPath: `/api/evidence/${evidence.id}`,
        sha256: evidence.sha256Hash,
        llm: drafted.llm,
      });
    }

    const localGuide = [
      "Describe a typical hard day in the words you already used. Do not minimize it, and do not invent anything.",
      "",
      "Already described:",
      ...[condition.extractedMetrics.onset, condition.extractedMetrics.frequency, condition.extractedMetrics.severity, condition.extractedMetrics.flareUps, condition.extractedMetrics.functionalImpact, condition.extractedMetrics.romLimitations]
        .filter((line) => line.trim().length >= 8)
        .map((line) => `- ${line}`),
      "",
      "Not described yet:",
      ...(missingTopics(condition.extractedMetrics, criterion).length
        ? missingTopics(condition.extractedMetrics, criterion).map((topic) => `- ${topic}`)
        : ["- none"]),
      "",
      "The exam is built to measure:",
      ...criterion.examMeasurements.map((item) => `- ${item}`),
    ].join("\n");
    const model = await completeJson(examGuideSystem(criterion), `${source}\n\nLocal guide:\n${localGuide}`);
    const candidate = z.object({ guide: z.string().min(1).max(8000) }).safeParse(model);
    const guide =
      candidate.success && !introducesNewNumbers(`${source}\n${localGuide}`, candidate.data.guide)
        ? candidate.data.guide.trim()
        : localGuide;
    await updateCondition(auth.actor.id, condition.id, { cpExamCheatSheet: guide });
    if (parsed.data.format === "pdf") {
      const pdf = await buildExamGuidePdf({
        veteranName: auth.profile.fullName,
        conditionName: condition.name,
        metrics: condition.extractedMetrics,
        criterion,
        narrative: guide,
      });
      const evidence = await saveEvidenceFile({
        userId: auth.actor.id,
        conditionId: condition.id,
        title: `Exam-day guide — ${condition.name}`,
        docType: "exam_guide",
        bytes: pdf,
        contentType: "application/pdf",
      });
      return NextResponse.json({ examGuide: guide, evidenceId: evidence.id, downloadPath: `/api/evidence/${evidence.id}` });
    }
    return NextResponse.json({ examGuide: guide, llm: candidate.success ? "open-weights" : "local" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
