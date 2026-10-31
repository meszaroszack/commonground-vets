import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/open-llm";
import { errorMessage } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15_000_000;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach an audio recording." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Recording must be under 15 MB." }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await transcribeAudio(bytes, file.name || "recording.webm", file.type || "audio/webm");
    if (!text) {
      return NextResponse.json({
        text: "",
        useClientFallback: true,
        detail: "The open-weights transcription service is not configured or did not respond. You can type instead, or try the on-device Whisper fallback.",
      });
    }
    return NextResponse.json({ text, useClientFallback: false });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error), useClientFallback: true }, { status: 500 });
  }
}
