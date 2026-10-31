import "server-only";
import OpenAI from "openai";
import { llmTarget } from "@/lib/env";

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(body.slice(start, end + 1));
}

function client(): { openai: OpenAI; model: string } | null {
  const target = llmTarget();
  if (!target) return null;
  return {
    openai: new OpenAI({ apiKey: target.apiKey, baseURL: target.baseURL, timeout: 25_000, maxRetries: 0 }),
    model: target.model,
  };
}

export async function completeText(system: string, user: string): Promise<string | null> {
  const ready = client();
  if (!ready) return null;
  try {
    const response = await ready.openai.chat.completions.create({
      model: ready.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("open-weights chat failed", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export async function completeJson(system: string, user: string): Promise<unknown | null> {
  const text = await completeText(`${system}\nRespond with one JSON object and no other text.`, user);
  if (!text) return null;
  try {
    return parseJsonObject(text);
  } catch (error) {
    console.error("open-weights json parse failed", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export async function transcribeAudio(bytes: Uint8Array, filename: string, mime: string): Promise<string | null> {
  const target = llmTarget();
  if (!target) return null;
  try {
    const openai = new OpenAI({ apiKey: target.apiKey, baseURL: target.baseURL, timeout: 40_000, maxRetries: 0 });
    const file = new File([Buffer.from(bytes)], filename, { type: mime || "audio/webm" });
    const result = await openai.audio.transcriptions.create({
      file,
      model: target.sttModel,
    });
    return result.text?.trim() || null;
  } catch (error) {
    console.error("open-weights transcription failed", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export function llmMode(): "open-weights" | "local" {
  return llmTarget() ? "open-weights" : "local";
}
