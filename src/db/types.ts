export type ClaimType = "increase" | "new" | "secondary";
export type ConditionStatus = "drafting" | "evidence_ready" | "submitted";
export type Relationship =
  | "service_peer"
  | "spouse_partner"
  | "family"
  | "friend_coworker";
export type WitnessStatus = "pending" | "completed";
export type DocType =
  | "personal_21_10210"
  | "witness_21_10210"
  | "dbq"
  | "nexus_letter"
  | "private_medical_record"
  | "clinician_briefing"
  | "exam_guide";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ExtractedMetrics = {
  onset: string;
  frequency: string;
  severity: string;
  functionalImpact: string;
  flareUps: string;
  romLimitations: string;
  readinessScore: number;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  vaFileNumber: string | null;
  currentRating: number;
  currentMonthlyComp: string;
  itfFiledDate: string | null;
  itfExpirationDate: string | null;
  createdAt: string;
};

export type ClaimCondition = {
  id: string;
  userId: string;
  name: string;
  diagnosticCode: string;
  claimType: ClaimType;
  currentRating: number;
  targetRating: number;
  conversationHistory: ConversationTurn[];
  extractedMetrics: ExtractedMetrics;
  draftPersonalStatement: string;
  cpExamCheatSheet: string;
  status: ConditionStatus;
};

export type WitnessRequest = {
  id: string;
  conditionId: string;
  userId: string;
  token: string;
  witnessName: string;
  witnessEmail: string;
  witnessPhone: string;
  relationship: Relationship;
  rawTranscript: string;
  polishedStatement: string;
  signatureDataUrl: string;
  signedPdfStoragePath: string;
  status: WitnessStatus;
  completedAt: string | null;
};

export type EvidenceDocument = {
  id: string;
  userId: string;
  conditionId: string;
  title: string;
  docType: DocType;
  storagePath: string;
  sha256Hash: string;
  vaLighthouseUploadUuid: string | null;
  vaLighthouseStatus: string;
  createdAt: string;
};

export type CommunityProvider = {
  id: string;
  npiNumber: string;
  providerName: string;
  specialty: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  acceptsDbq: boolean;
  writesNexusLetters: boolean;
  telehealthAvailable: boolean;
  avgCostEstimate: number | null;
  communityUpvotes: number;
  veteranNotes: string;
};

export function emptyMetrics(): ExtractedMetrics {
  return {
    onset: "",
    frequency: "",
    severity: "",
    functionalImpact: "",
    flareUps: "",
    romLimitations: "",
    readinessScore: 0,
  };
}

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_LUMBAR_ID = "00000000-0000-4000-8000-000000000101";
export const DEMO_MIGRAINE_ID = "00000000-0000-4000-8000-000000000102";
export const DEMO_PTSD_ID = "00000000-0000-4000-8000-000000000103";
export const DEMO_WITNESS_TOKEN = "demo-preview-witness-token-paige";
