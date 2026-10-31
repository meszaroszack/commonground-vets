import type { ClaimType, ConditionStatus, DocType, Relationship } from "@/db/types";

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  service_peer: "Served together",
  spouse_partner: "Spouse or partner",
  family: "Family",
  friend_coworker: "Friend or coworker",
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  increase: "Increase",
  new: "New",
  secondary: "Secondary",
};

export const STATUS_LABELS: Record<ConditionStatus, string> = {
  drafting: "Drafting",
  evidence_ready: "Evidence ready",
  submitted: "Submitted",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  personal_21_10210: "Personal statement (21-10210 prep)",
  witness_21_10210: "Witness statement (21-10210 prep)",
  dbq: "DBQ",
  nexus_letter: "Nexus letter",
  private_medical_record: "Private medical record",
  clinician_briefing: "Clinician briefing",
  exam_guide: "Exam-day grounding guide",
};
