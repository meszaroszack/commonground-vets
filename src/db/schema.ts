import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ConversationTurn, ExtractedMetrics } from "./types";

/**
 * profiles.id is the Supabase auth.users id.
 * The foreign key lives in src/db/rls.sql so this schema can also run on
 * plain Postgres during local preview, where the auth schema does not exist.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  vaFileNumber: text("va_file_number"),
  currentRating: integer("current_rating").notNull().default(40),
  currentMonthlyComp: numeric("current_monthly_comp", { precision: 10, scale: 2 })
    .notNull()
    .default("795.84"),
  itfFiledDate: timestamp("itf_filed_date", { withTimezone: true }),
  itfExpirationDate: timestamp("itf_expiration_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const claimConditions = pgTable(
  "claim_conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    diagnosticCode: text("diagnostic_code").notNull(),
    claimType: text("claim_type").notNull(),
    currentRating: integer("current_rating").notNull().default(0),
    targetRating: integer("target_rating").notNull().default(0),
    conversationHistory: jsonb("conversation_history")
      .$type<ConversationTurn[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    extractedMetrics: jsonb("extracted_metrics")
      .$type<ExtractedMetrics>()
      .notNull()
      .default(sql`'{"onset":"","frequency":"","severity":"","functionalImpact":"","flareUps":"","romLimitations":"","readinessScore":0}'::jsonb`),
    draftPersonalStatement: text("draft_personal_statement").notNull().default(""),
    cpExamCheatSheet: text("cp_exam_cheat_sheet").notNull().default(""),
    status: text("status").notNull().default("drafting"),
  },
  (table) => [index("claim_conditions_user_id_idx").on(table.userId)],
);

export const witnessRequests = pgTable(
  "witness_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conditionId: uuid("condition_id")
      .notNull()
      .references(() => claimConditions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    witnessName: text("witness_name").notNull().default(""),
    witnessEmail: text("witness_email").notNull().default(""),
    witnessPhone: text("witness_phone").notNull().default(""),
    relationship: text("relationship").notNull(),
    rawTranscript: text("raw_transcript").notNull().default(""),
    polishedStatement: text("polished_statement").notNull().default(""),
    signatureDataUrl: text("signature_data_url").notNull().default(""),
    signedPdfStoragePath: text("signed_pdf_storage_path").notNull().default(""),
    status: text("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("witness_requests_token_idx").on(table.token),
    index("witness_requests_condition_idx").on(table.conditionId),
  ],
);

export const evidenceDocuments = pgTable(
  "evidence_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conditionId: uuid("condition_id")
      .notNull()
      .references(() => claimConditions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    docType: text("doc_type").notNull(),
    storagePath: text("storage_path").notNull(),
    sha256Hash: text("sha256_hash").notNull(),
    vaLighthouseUploadUuid: text("va_lighthouse_upload_uuid"),
    vaLighthouseStatus: text("va_lighthouse_status").notNull().default("local"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("evidence_documents_user_id_idx").on(table.userId)],
);

export const communityProviders = pgTable(
  "community_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    npiNumber: text("npi_number").notNull().unique(),
    providerName: text("provider_name").notNull(),
    specialty: text("specialty").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zip: text("zip").notNull().default(""),
    phone: text("phone").notNull().default(""),
    acceptsDbq: boolean("accepts_dbq").notNull().default(true),
    writesNexusLetters: boolean("writes_nexus_letters").notNull().default(false),
    telehealthAvailable: boolean("telehealth_available").notNull().default(false),
    avgCostEstimate: integer("avg_cost_estimate"),
    communityUpvotes: integer("community_upvotes").notNull().default(1),
    veteranNotes: text("veteran_notes").notNull().default(""),
  },
  (table) => [index("community_providers_zip_idx").on(table.zip)],
);
