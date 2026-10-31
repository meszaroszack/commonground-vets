import "server-only";
import { lookupCriteria } from "@/lib/ai/cfr-criteria";
import { extractMetrics } from "@/lib/ai/extract";
import {
  DEMO_LUMBAR_ID,
  DEMO_MIGRAINE_ID,
  DEMO_PTSD_ID,
  DEMO_USER_ID,
  DEMO_WITNESS_TOKEN,
  emptyMetrics,
  type ClaimCondition,
  type CommunityProvider,
  type EvidenceDocument,
  type Profile,
  type WitnessRequest,
} from "./types";

export type SimulatedIntake = {
  guid: string;
  createdAt: number;
};

type Store = {
  profiles: Profile[];
  conditions: ClaimCondition[];
  witnesses: WitnessRequest[];
  evidence: EvidenceDocument[];
  providers: CommunityProvider[];
  files: Map<string, Uint8Array>;
  intakes: Map<string, SimulatedIntake>;
};

function seed(): Store {
  const filed = new Date();
  filed.setUTCDate(filed.getUTCDate() - 90);
  const expires = new Date(filed);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const now = new Date().toISOString();
  const lumbarText =
    "My lower back started hurting during a field exercise years ago and it never really settled. Most weeks I have pain at least four days. On a bad flare I cannot unload the dishwasher or sit through a meeting, and it can take two days before I can walk the dog again. Bending to tie my shoes is the thing I avoid.";
  const lumbar = lookupCriteria({ diagnosticCode: "5237" });

  const profile: Profile = {
    id: DEMO_USER_ID,
    fullName: "Jordan Hale",
    email: "jordan.hale@example.com",
    vaFileNumber: null,
    currentRating: 40,
    currentMonthlyComp: "795.84",
    itfFiledDate: filed.toISOString(),
    itfExpirationDate: expires.toISOString(),
    createdAt: now,
  };

  const conditions: ClaimCondition[] = [
    {
      id: DEMO_LUMBAR_ID,
      userId: DEMO_USER_ID,
      name: "Lumbar spine strain",
      diagnosticCode: "5237",
      claimType: "increase",
      currentRating: 10,
      targetRating: 40,
      conversationHistory: [
        {
          role: "assistant",
          content: "I'm here when you want to talk about your back. What does a hard day actually look like?",
          timestamp: now,
        },
        { role: "user", content: lumbarText, timestamp: now },
      ],
      extractedMetrics: extractMetrics(lumbarText, lumbar),
      draftPersonalStatement: "",
      cpExamCheatSheet: "",
      status: "drafting",
    },
    {
      id: DEMO_MIGRAINE_ID,
      userId: DEMO_USER_ID,
      name: "Migraines",
      diagnosticCode: "8100",
      claimType: "new",
      currentRating: 0,
      targetRating: 30,
      conversationHistory: [],
      extractedMetrics: emptyMetrics(),
      draftPersonalStatement: "",
      cpExamCheatSheet: "",
      status: "drafting",
    },
    {
      id: DEMO_PTSD_ID,
      userId: DEMO_USER_ID,
      name: "PTSD",
      diagnosticCode: "9411",
      claimType: "increase",
      currentRating: 30,
      targetRating: 50,
      conversationHistory: [],
      extractedMetrics: emptyMetrics(),
      draftPersonalStatement: "",
      cpExamCheatSheet: "",
      status: "drafting",
    },
  ];

  const witnesses: WitnessRequest[] = [
    {
      id: "00000000-0000-4000-8000-000000000201",
      conditionId: DEMO_MIGRAINE_ID,
      userId: DEMO_USER_ID,
      token: DEMO_WITNESS_TOKEN,
      witnessName: "Paige",
      witnessEmail: "",
      witnessPhone: "",
      relationship: "spouse_partner",
      rawTranscript: "",
      polishedStatement: "",
      signatureDataUrl: "",
      signedPdfStoragePath: "",
      status: "pending",
      completedAt: null,
    },
  ];

  return {
    profiles: [profile],
    conditions,
    witnesses,
    evidence: [],
    providers: [],
    files: new Map(),
    intakes: new Map(),
  };
}

function state(): Store {
  const globalStore = globalThis as typeof globalThis & { __commonGround?: Store };
  if (!globalStore.__commonGround) globalStore.__commonGround = seed();
  return globalStore.__commonGround;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export const memory = {
  getProfile(id: string) {
    const row = state().profiles.find((profile) => profile.id === id);
    return row ? clone(row) : null;
  },
  upsertProfile(profile: Profile) {
    const rows = state().profiles;
    const index = rows.findIndex((row) => row.id === profile.id);
    if (index >= 0) rows[index] = clone(profile);
    else rows.push(clone(profile));
    return clone(profile);
  },
  listConditions(userId: string) {
    return state()
      .conditions.filter((row) => row.userId === userId)
      .map(clone);
  },
  getCondition(userId: string, id: string) {
    const row = state().conditions.find((item) => item.id === id && item.userId === userId);
    return row ? clone(row) : null;
  },
  insertCondition(condition: ClaimCondition) {
    state().conditions.push(clone(condition));
    return clone(condition);
  },
  updateCondition(userId: string, id: string, patch: Partial<ClaimCondition>) {
    const row = state().conditions.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, patch, { id, userId });
    return clone(row);
  },
  listWitnesses(userId: string, conditionId: string) {
    return state()
      .witnesses.filter((row) => row.userId === userId && row.conditionId === conditionId)
      .map(clone);
  },
  insertWitness(witness: WitnessRequest) {
    state().witnesses.push(clone(witness));
    return clone(witness);
  },
  getWitnessByToken(token: string) {
    const witness = state().witnesses.find((row) => row.token === token);
    if (!witness) return null;
    const condition = state().conditions.find((row) => row.id === witness.conditionId);
    const profile = state().profiles.find((row) => row.id === witness.userId);
    if (!condition || !profile) return null;
    return { witness: clone(witness), condition: clone(condition), profile: clone(profile) };
  },
  updateWitness(token: string, patch: Partial<WitnessRequest>) {
    const row = state().witnesses.find((item) => item.token === token);
    if (!row) return null;
    Object.assign(row, patch, { token: row.token, id: row.id });
    return clone(row);
  },
  listEvidence(userId: string) {
    return state()
      .evidence.filter((row) => row.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  },
  insertEvidence(document: EvidenceDocument) {
    state().evidence.push(clone(document));
    return clone(document);
  },
  getEvidence(userId: string, id: string) {
    const row = state().evidence.find((item) => item.id === id && item.userId === userId);
    return row ? clone(row) : null;
  },
  updateEvidence(userId: string, id: string, patch: Partial<EvidenceDocument>) {
    const row = state().evidence.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, patch, { id, userId });
    return clone(row);
  },
  updateEvidenceByGuid(guid: string, status: string) {
    state()
      .evidence.filter((item) => item.vaLighthouseUploadUuid === guid)
      .forEach((item) => {
        item.vaLighthouseStatus = status;
      });
  },
  listProviders() {
    return state().providers.map(clone);
  },
  upsertProvider(provider: CommunityProvider) {
    const rows = state().providers;
    const index = rows.findIndex((row) => row.npiNumber === provider.npiNumber);
    if (index >= 0) rows[index] = clone(provider);
    else rows.push(clone(provider));
    return clone(provider);
  },
  saveFile(path: string, bytes: Uint8Array) {
    state().files.set(path, bytes);
  },
  readFile(path: string) {
    return state().files.get(path) ?? null;
  },
  saveIntake(intake: SimulatedIntake) {
    state().intakes.set(intake.guid, intake);
  },
  readIntake(guid: string) {
    return state().intakes.get(guid) ?? null;
  },
};
