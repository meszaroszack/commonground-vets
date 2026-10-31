import "server-only";
import { isSupabaseConfigured } from "./public-env";

function looksPlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("your-project") ||
    lowered.includes("your-anon") ||
    lowered.includes("your-publishable") ||
    lowered.includes("your-service-role") ||
    lowered.includes("your-open-weights") ||
    lowered.includes("your-va-lighthouse") ||
    lowered.includes("password@db.your-project")
  );
}

export { isSupabaseConfigured };

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgres")) return false;
  if (looksPlaceholder(url)) return false;
  return true;
}

export function isStorageConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!isSupabaseConfigured() || key.length < 20) return false;
  if (looksPlaceholder(key)) return false;
  return true;
}

export type LlmTarget = {
  baseURL: string;
  apiKey: string;
  model: string;
  sttModel: string;
};

export function llmTarget(): LlmTarget | null {
  const baseURL = process.env.OPEN_LLM_BASE_URL?.trim() ?? "";
  const apiKey = process.env.OPEN_LLM_API_KEY?.trim() ?? "";
  if (!baseURL && !apiKey) return null;
  if (apiKey && looksPlaceholder(apiKey)) return null;
  if (baseURL && looksPlaceholder(baseURL)) return null;
  return {
    baseURL: baseURL || "http://localhost:11434/v1",
    apiKey: apiKey || "ollama",
    model: process.env.OPEN_LLM_MODEL?.trim() || "llama-3.3-70b-versatile",
    sttModel: process.env.OPEN_STT_MODEL?.trim() || "whisper-large-v3-turbo",
  };
}

export type LighthouseMode = "simulation" | "sandbox" | "production";

export function lighthouseMode(): LighthouseMode {
  const key = process.env.VA_LIGHTHOUSE_API_KEY?.trim() ?? "";
  if (!key || looksPlaceholder(key)) return "simulation";
  const base = (process.env.VA_LIGHTHOUSE_BASE_URL ?? "https://sandbox-api.va.gov").toLowerCase();
  if (base.includes("sandbox")) return "sandbox";
  return "production";
}

export function lighthouseBaseUrl(): string {
  return (process.env.VA_LIGHTHOUSE_BASE_URL ?? "https://sandbox-api.va.gov").replace(/\/$/, "");
}

export function productionSubmitAllowed(): boolean {
  return process.env.VA_LIGHTHOUSE_ALLOW_PRODUCTION === "true";
}
