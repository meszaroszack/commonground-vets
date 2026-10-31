import type { ExtractedMetrics } from "@/db/types";
import { emptyMetrics } from "@/db/types";
import { applicableMetricKeys, type CfrCondition } from "./cfr-criteria";

const PATTERNS: Record<Exclude<keyof ExtractedMetrics, "readinessScore">, RegExp> = {
  onset: /\b(started|since|years ago|during|after|in 20\d{2}|deployment|field exercise|service)\b/i,
  frequency: /\b(daily|weekly|every|most weeks|times a|days? a week|\d+\s+days|a month|each month|constant)\b/i,
  severity: /\b(\d+\s*\/\s*10|severe|moderate|mild|prostrating|cannot|can't|could not|worst)\b/i,
  functionalImpact: /\b(work|job|meeting|dishwasher|lift|walk|sleep|family|drive|cook|stairs|dog|chores|schedule)\b/i,
  flareUps: /\b(flare|bad day|two days|episode|attack|recover|lie down|lasts)\b/i,
  romLimitations: /\b(bend|bending|degrees|range of motion|tie my shoes|twist|flex|stand|squat|kneel)\b/i,
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function firstMatch(text: string, pattern: RegExp): string {
  return sentences(text).find((sentence) => pattern.test(sentence)) ?? "";
}

export function scoreMetrics(metrics: ExtractedMetrics, criterion: CfrCondition): number {
  const keys = applicableMetricKeys(criterion);
  if (keys.length === 0) return 0;
  const filled = keys.filter((key) => metrics[key].trim().length >= 8).length;
  return Math.round((filled / keys.length) * 100);
}

export function extractMetrics(transcript: string, criterion: CfrCondition): ExtractedMetrics {
  const metrics = emptyMetrics();
  (Object.keys(PATTERNS) as Array<keyof typeof PATTERNS>).forEach((key) => {
    metrics[key] = firstMatch(transcript, PATTERNS[key]);
  });
  metrics.readinessScore = scoreMetrics(metrics, criterion);
  return metrics;
}

export function mergeMetrics(
  previous: ExtractedMetrics,
  transcript: string,
  criterion: CfrCondition,
): ExtractedMetrics {
  const incoming = extractMetrics(transcript, criterion);
  const next: ExtractedMetrics = { ...previous, readinessScore: 0 };
  (Object.keys(PATTERNS) as Array<keyof typeof PATTERNS>).forEach((key) => {
    if (incoming[key].length >= 8) next[key] = incoming[key];
  });
  next.readinessScore = scoreMetrics(next, criterion);
  return next;
}

export function missingTopics(metrics: ExtractedMetrics, criterion: CfrCondition): string[] {
  const labels: Record<keyof typeof PATTERNS, string> = {
    onset: "when it started",
    frequency: "how often it happens",
    severity: "how severe a hard day is",
    functionalImpact: "what it stops you from doing",
    flareUps: "flares, attacks, or recovery time",
    romLimitations: "movement limits such as bending, standing, or walking",
  };
  return applicableMetricKeys(criterion)
    .filter((key) => metrics[key].trim().length < 8)
    .map((key) => labels[key]);
}

export function nextLocalQuestion(metrics: ExtractedMetrics, criterion: CfrCondition): string {
  const missing = missingTopics(metrics, criterion);
  if (missing.length === 0) {
    return "Is there one specific day you want on the record — what you had planned, what stopped, and how long it took to come back from it?";
  }
  const index = applicableMetricKeys(criterion).findIndex((key) => metrics[key].trim().length < 8);
  return criterion.interviewPrompts[index] ?? criterion.interviewPrompts[0] ?? `Can you say more about ${missing[0]}?`;
}
