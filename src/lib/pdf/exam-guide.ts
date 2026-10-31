import "server-only";
import type { ExtractedMetrics } from "@/db/types";
import type { CfrCondition } from "@/lib/ai/cfr-criteria";
import { missingTopics } from "@/lib/ai/extract";
import { Paper } from "./layout";

export async function buildExamGuidePdf(input: {
  veteranName: string;
  conditionName: string;
  metrics: ExtractedMetrics;
  criterion: CfrCondition;
  narrative: string;
}): Promise<Uint8Array> {
  const paper = await Paper.create(`Exam-day grounding guide - ${input.conditionName}`);
  paper.heading("Exam-day grounding guide");
  paper.paragraph(`${input.veteranName} · ${input.conditionName}`);
  paper.paragraph(
    "This page is a reminder of what you already said. Describe a typical hard day honestly. Do not minimize it, and do not add anything that is not true. You are not being scored by this sheet.",
  );
  paper.label("Hard-day facts already in your words");
  const facts = [
    input.metrics.onset,
    input.metrics.frequency,
    input.metrics.severity,
    input.metrics.flareUps,
    input.metrics.functionalImpact,
    input.metrics.romLimitations,
  ].filter((line) => line.trim().length >= 8);
  paper.paragraph(facts.length ? facts.map((line) => `- ${line}`).join("\n") : "You have not described a hard day yet.");
  paper.label("Still undescribed");
  const missing = missingTopics(input.metrics, input.criterion);
  paper.paragraph(missing.length ? missing.map((topic) => `- ${topic}`).join("\n") : "The basic topics are present. You can still add one specific day.");
  paper.label("What the exam is built to measure");
  paper.paragraph(input.criterion.examMeasurements.map((item) => `- ${item}`).join("\n"));
  if (input.narrative.trim()) {
    paper.label("Note to self");
    paper.paragraph(input.narrative.trim().slice(0, 1200));
  }
  if (input.criterion.bodySystem === "mental-health") {
    paper.paragraph("If you are in crisis, call or text 988, then press 1. This page is not a crisis service.");
  }
  return paper.finish();
}
