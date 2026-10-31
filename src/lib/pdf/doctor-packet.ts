import "server-only";
import type { ExtractedMetrics } from "@/db/types";
import type { CfrCondition } from "@/lib/ai/cfr-criteria";
import { Paper } from "./layout";

export type DoctorPacketInput = {
  veteranName: string;
  conditionName: string;
  diagnosticCode: string;
  claimType: string;
  metrics: ExtractedMetrics;
  statementExcerpt: string;
  criterion: CfrCondition;
};

function line(label: string, value: string): string {
  return `${label}: ${value.trim() || "Not yet described by the patient."}`;
}

export async function buildDoctorPacket(input: DoctorPacketInput): Promise<Uint8Array> {
  const paper = await Paper.create(`Clinician briefing - ${input.conditionName}`);
  paper.heading("Dear colleague");
  paper.paragraph(`Patient: ${input.veteranName}`);
  paper.paragraph(
    `The patient asked Common Ground, a free self-service organizer, to prepare this briefing for a visit about ${input.conditionName} (diagnostic code ${input.diagnosticCode}, described by the patient as a ${input.claimType} claim). You are not being retained by Common Ground. There is no fee agreement, and nothing in this packet asks you to reach a particular conclusion.`,
  );
  paper.paragraph(
    "A VA Disability Benefits Questionnaire (DBQ) is a clinical form VA publishes for functional findings: measurements, frequency, and limits on work and daily activity. Completing one is ordinary clinical documentation. It is not an agreement to testify, to represent the patient, or to participate in an appeal. You may complete the public DBQ, write a treatment note in your own format, or decline.",
  );
  paper.paragraph(
    "Official public DBQ forms: https://www.benefits.va.gov/compensation/dbq_publicdbqs.asp",
  );
  paper.paragraph(
    "Please rely on your examination and the records you trust. The next page is only what the patient has said in their own words. Where a line says it was not described, they did not say it.",
  );

  paper.breakPage();
  paper.heading("What the patient has described");
  paper.paragraph(line("Onset", input.metrics.onset));
  paper.paragraph(line("Frequency", input.metrics.frequency));
  paper.paragraph(line("Severity on a hard day", input.metrics.severity));
  paper.paragraph(line("Flare-ups or recovery", input.metrics.flareUps));
  paper.paragraph(line("Functional impact", input.metrics.functionalImpact));
  paper.paragraph(line("Movement limits", input.metrics.romLimitations));
  paper.label("Excerpt from the patient's draft, unedited");
  paper.paragraph(input.statementExcerpt.trim() || "The patient has not saved a statement excerpt yet.");

  paper.breakPage();
  paper.heading("Rating-schedule topics for this condition");
  paper.paragraph(input.criterion.citation);
  paper.paragraph(input.criterion.summary);
  if (input.criterion.ratings.length === 0) {
    paper.paragraph("No local percentage formula is stored for this code. Use the current eCFR entry.");
  } else {
    for (const level of input.criterion.ratings) {
      paper.paragraph(`${level.percent}% — ${level.criteria}`);
    }
  }
  paper.label("Measurements and findings the schedule actually uses");
  for (const item of input.criterion.examMeasurements) {
    paper.paragraph(`- ${item}`);
  }
  for (const note of input.criterion.notes) {
    paper.paragraph(note);
  }
  paper.paragraph(
    "This checklist is educational. It is not a request to record a finding the exam does not support.",
  );
  return paper.finish();
}
