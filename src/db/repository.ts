import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { memory } from "./memory";
import { claimConditions, communityProviders, evidenceDocuments, profiles, witnessRequests } from "./schema";
import type {
  ClaimCondition,
  ClaimType,
  CommunityProvider,
  ConditionStatus,
  ConversationTurn,
  DocType,
  EvidenceDocument,
  ExtractedMetrics,
  Profile,
  Relationship,
  WitnessRequest,
  WitnessStatus,
} from "./types";
import { emptyMetrics } from "./types";

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function asMetrics(value: ExtractedMetrics | null | undefined): ExtractedMetrics {
  return { ...emptyMetrics(), ...(value ?? {}) };
}

function mapProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    vaFileNumber: row.vaFileNumber,
    currentRating: row.currentRating,
    currentMonthlyComp: row.currentMonthlyComp,
    itfFiledDate: iso(row.itfFiledDate),
    itfExpirationDate: iso(row.itfExpirationDate),
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapCondition(row: typeof claimConditions.$inferSelect): ClaimCondition {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    diagnosticCode: row.diagnosticCode,
    claimType: row.claimType as ClaimType,
    currentRating: row.currentRating,
    targetRating: row.targetRating,
    conversationHistory: (row.conversationHistory ?? []) as ConversationTurn[],
    extractedMetrics: asMetrics(row.extractedMetrics),
    draftPersonalStatement: row.draftPersonalStatement,
    cpExamCheatSheet: row.cpExamCheatSheet,
    status: row.status as ConditionStatus,
  };
}

function mapWitness(row: typeof witnessRequests.$inferSelect): WitnessRequest {
  return {
    id: row.id,
    conditionId: row.conditionId,
    userId: row.userId,
    token: row.token,
    witnessName: row.witnessName,
    witnessEmail: row.witnessEmail,
    witnessPhone: row.witnessPhone,
    relationship: row.relationship as Relationship,
    rawTranscript: row.rawTranscript,
    polishedStatement: row.polishedStatement,
    signatureDataUrl: row.signatureDataUrl,
    signedPdfStoragePath: row.signedPdfStoragePath,
    status: row.status as WitnessStatus,
    completedAt: iso(row.completedAt),
  };
}

function mapEvidence(row: typeof evidenceDocuments.$inferSelect): EvidenceDocument {
  return {
    id: row.id,
    userId: row.userId,
    conditionId: row.conditionId,
    title: row.title,
    docType: row.docType as DocType,
    storagePath: row.storagePath,
    sha256Hash: row.sha256Hash,
    vaLighthouseUploadUuid: row.vaLighthouseUploadUuid,
    vaLighthouseStatus: row.vaLighthouseStatus,
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapProvider(row: typeof communityProviders.$inferSelect): CommunityProvider {
  return {
    id: row.id,
    npiNumber: row.npiNumber,
    providerName: row.providerName,
    specialty: row.specialty,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    acceptsDbq: row.acceptsDbq,
    writesNexusLetters: row.writesNexusLetters,
    telehealthAvailable: row.telehealthAvailable,
    avgCostEstimate: row.avgCostEstimate,
    communityUpvotes: row.communityUpvotes,
    veteranNotes: row.veteranNotes,
  };
}

export async function getProfile(id: string): Promise<Profile | null> {
  const db = getDb();
  if (!db) return memory.getProfile(id);
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function upsertProfile(profile: Profile): Promise<Profile> {
  const db = getDb();
  if (!db) return memory.upsertProfile(profile);
  const values = {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    vaFileNumber: profile.vaFileNumber,
    currentRating: profile.currentRating,
    currentMonthlyComp: profile.currentMonthlyComp,
    itfFiledDate: profile.itfFiledDate ? new Date(profile.itfFiledDate) : null,
    itfExpirationDate: profile.itfExpirationDate ? new Date(profile.itfExpirationDate) : null,
    createdAt: new Date(profile.createdAt),
  };
  const rows = await db
    .insert(profiles)
    .values(values)
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        fullName: values.fullName,
        email: values.email,
        vaFileNumber: values.vaFileNumber,
        currentRating: values.currentRating,
        currentMonthlyComp: values.currentMonthlyComp,
        itfFiledDate: values.itfFiledDate,
        itfExpirationDate: values.itfExpirationDate,
      },
    })
    .returning();
  return mapProfile(rows[0]);
}

export async function listConditions(userId: string): Promise<ClaimCondition[]> {
  const db = getDb();
  if (!db) return memory.listConditions(userId);
  const rows = await db.select().from(claimConditions).where(eq(claimConditions.userId, userId));
  return rows.map(mapCondition);
}

export async function getConditionForUser(userId: string, id: string): Promise<ClaimCondition | null> {
  const db = getDb();
  if (!db) return memory.getCondition(userId, id);
  const rows = await db.select().from(claimConditions).where(eq(claimConditions.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return mapCondition(row);
}

export async function insertCondition(condition: ClaimCondition): Promise<ClaimCondition> {
  const db = getDb();
  if (!db) return memory.insertCondition(condition);
  const rows = await db
    .insert(claimConditions)
    .values({
      id: condition.id,
      userId: condition.userId,
      name: condition.name,
      diagnosticCode: condition.diagnosticCode,
      claimType: condition.claimType,
      currentRating: condition.currentRating,
      targetRating: condition.targetRating,
      conversationHistory: condition.conversationHistory,
      extractedMetrics: condition.extractedMetrics,
      draftPersonalStatement: condition.draftPersonalStatement,
      cpExamCheatSheet: condition.cpExamCheatSheet,
      status: condition.status,
    })
    .returning();
  return mapCondition(rows[0]);
}

export async function updateCondition(
  userId: string,
  id: string,
  patch: Partial<ClaimCondition>,
): Promise<ClaimCondition | null> {
  const existing = await getConditionForUser(userId, id);
  if (!existing) return null;
  const next = { ...existing, ...patch, id, userId };
  const db = getDb();
  if (!db) return memory.updateCondition(userId, id, next);
  const rows = await db
    .update(claimConditions)
    .set({
      name: next.name,
      diagnosticCode: next.diagnosticCode,
      claimType: next.claimType,
      currentRating: next.currentRating,
      targetRating: next.targetRating,
      conversationHistory: next.conversationHistory,
      extractedMetrics: next.extractedMetrics,
      draftPersonalStatement: next.draftPersonalStatement,
      cpExamCheatSheet: next.cpExamCheatSheet,
      status: next.status,
    })
    .where(eq(claimConditions.id, id))
    .returning();
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return mapCondition(row);
}

export async function listWitnesses(userId: string, conditionId: string): Promise<WitnessRequest[]> {
  const db = getDb();
  if (!db) return memory.listWitnesses(userId, conditionId);
  const rows = await db.select().from(witnessRequests).where(eq(witnessRequests.conditionId, conditionId));
  return rows.filter((row) => row.userId === userId).map(mapWitness);
}

export async function insertWitness(witness: WitnessRequest): Promise<WitnessRequest> {
  const db = getDb();
  if (!db) return memory.insertWitness(witness);
  const rows = await db
    .insert(witnessRequests)
    .values({
      id: witness.id,
      conditionId: witness.conditionId,
      userId: witness.userId,
      token: witness.token,
      witnessName: witness.witnessName,
      witnessEmail: witness.witnessEmail,
      witnessPhone: witness.witnessPhone,
      relationship: witness.relationship,
      rawTranscript: witness.rawTranscript,
      polishedStatement: witness.polishedStatement,
      signatureDataUrl: witness.signatureDataUrl,
      signedPdfStoragePath: witness.signedPdfStoragePath,
      status: witness.status,
    })
    .returning();
  return mapWitness(rows[0]);
}

export async function getWitnessBundle(token: string) {
  const db = getDb();
  if (!db) return memory.getWitnessByToken(token);
  const rows = await db.select().from(witnessRequests).where(eq(witnessRequests.token, token)).limit(1);
  const witness = rows[0];
  if (!witness) return null;
  const conditionRows = await db.select().from(claimConditions).where(eq(claimConditions.id, witness.conditionId)).limit(1);
  const profileRows = await db.select().from(profiles).where(eq(profiles.id, witness.userId)).limit(1);
  if (!conditionRows[0] || !profileRows[0]) return null;
  return {
    witness: mapWitness(witness),
    condition: mapCondition(conditionRows[0]),
    profile: mapProfile(profileRows[0]),
  };
}

export async function updateWitness(token: string, patch: Partial<WitnessRequest>): Promise<WitnessRequest | null> {
  const bundle = await getWitnessBundle(token);
  if (!bundle) return null;
  const next = { ...bundle.witness, ...patch };
  const db = getDb();
  if (!db) return memory.updateWitness(token, next);
  const rows = await db
    .update(witnessRequests)
    .set({
      witnessName: next.witnessName,
      witnessEmail: next.witnessEmail,
      witnessPhone: next.witnessPhone,
      rawTranscript: next.rawTranscript,
      polishedStatement: next.polishedStatement,
      signatureDataUrl: next.signatureDataUrl,
      signedPdfStoragePath: next.signedPdfStoragePath,
      status: next.status,
      completedAt: next.completedAt ? new Date(next.completedAt) : null,
    })
    .where(eq(witnessRequests.token, token))
    .returning();
  return rows[0] ? mapWitness(rows[0]) : null;
}

export async function listEvidence(userId: string): Promise<EvidenceDocument[]> {
  const db = getDb();
  if (!db) return memory.listEvidence(userId);
  const rows = await db
    .select()
    .from(evidenceDocuments)
    .where(eq(evidenceDocuments.userId, userId))
    .orderBy(desc(evidenceDocuments.createdAt));
  return rows.map(mapEvidence);
}

export async function insertEvidence(document: EvidenceDocument): Promise<EvidenceDocument> {
  const db = getDb();
  if (!db) return memory.insertEvidence(document);
  const rows = await db
    .insert(evidenceDocuments)
    .values({
      id: document.id,
      userId: document.userId,
      conditionId: document.conditionId,
      title: document.title,
      docType: document.docType,
      storagePath: document.storagePath,
      sha256Hash: document.sha256Hash,
      vaLighthouseUploadUuid: document.vaLighthouseUploadUuid,
      vaLighthouseStatus: document.vaLighthouseStatus,
      createdAt: new Date(document.createdAt),
    })
    .returning();
  return mapEvidence(rows[0]);
}

export async function getEvidenceForUser(userId: string, id: string): Promise<EvidenceDocument | null> {
  const db = getDb();
  if (!db) return memory.getEvidence(userId, id);
  const rows = await db.select().from(evidenceDocuments).where(eq(evidenceDocuments.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return mapEvidence(row);
}

export async function updateEvidence(
  userId: string,
  id: string,
  patch: Partial<EvidenceDocument>,
): Promise<EvidenceDocument | null> {
  const existing = await getEvidenceForUser(userId, id);
  if (!existing) return null;
  const next = { ...existing, ...patch, id, userId };
  const db = getDb();
  if (!db) return memory.updateEvidence(userId, id, next);
  const rows = await db
    .update(evidenceDocuments)
    .set({
      vaLighthouseUploadUuid: next.vaLighthouseUploadUuid,
      vaLighthouseStatus: next.vaLighthouseStatus,
      title: next.title,
    })
    .where(eq(evidenceDocuments.id, id))
    .returning();
  return rows[0] && rows[0].userId === userId ? mapEvidence(rows[0]) : null;
}

export async function markEvidenceStatusByGuid(guid: string, status: string): Promise<void> {
  const db = getDb();
  if (!db) {
    memory.updateEvidenceByGuid(guid, status);
    return;
  }
  await db
    .update(evidenceDocuments)
    .set({ vaLighthouseStatus: status })
    .where(eq(evidenceDocuments.vaLighthouseUploadUuid, guid));
}

export async function listProviders(): Promise<CommunityProvider[]> {
  const db = getDb();
  if (!db) return memory.listProviders();
  const rows = await db.select().from(communityProviders);
  return rows.map(mapProvider);
}

export async function getProviderByNpi(npiNumber: string): Promise<CommunityProvider | null> {
  const all = await listProviders();
  return all.find((provider) => provider.npiNumber === npiNumber) ?? null;
}

export async function upsertProvider(provider: CommunityProvider): Promise<CommunityProvider> {
  const db = getDb();
  if (!db) return memory.upsertProvider(provider);
  const rows = await db
    .insert(communityProviders)
    .values(provider)
    .onConflictDoUpdate({
      target: communityProviders.npiNumber,
      set: {
        providerName: provider.providerName,
        specialty: provider.specialty,
        city: provider.city,
        state: provider.state,
        zip: provider.zip,
        phone: provider.phone,
        acceptsDbq: provider.acceptsDbq,
        writesNexusLetters: provider.writesNexusLetters,
        telehealthAvailable: provider.telehealthAvailable,
        avgCostEstimate: provider.avgCostEstimate,
        communityUpvotes: provider.communityUpvotes,
        veteranNotes: provider.veteranNotes,
      },
    })
    .returning();
  return mapProvider(rows[0]);
}

export function saveLocalFile(path: string, bytes: Uint8Array) {
  memory.saveFile(path, bytes);
}

export function readLocalFile(path: string): Uint8Array | null {
  return memory.readFile(path);
}

export function saveSimulatedIntake(guid: string) {
  memory.saveIntake({ guid, createdAt: Date.now() });
}

export function readSimulatedIntake(guid: string) {
  return memory.readIntake(guid);
}
