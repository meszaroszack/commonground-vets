"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export function VoiceRecorder({ onTranscript, disabled }: Props) {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const [note, setNote] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<{ context: AudioContext; stream: MediaStream } | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.stream.getTracks().forEach((track) => track.stop());
      void audioRef.current?.context.close();
    };
  }, []);

  async function start() {
    setNote("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioRef.current = { context, stream };
    draw(analyser);
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      void transcribe(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setStatus("recording");
  }

  function draw(analyser: AnalyserNode) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const data = new Uint8Array(analyser.fftSize);
    const paint = () => {
      if (!recorderRef.current || recorderRef.current.state !== "recording") return;
      analyser.getByteTimeDomainData(data);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.strokeStyle = "#D96B43";
      context.lineWidth = 2;
      const step = canvas.width / data.length;
      data.forEach((value, index) => {
        const y = (value / 255) * canvas.height;
        if (index === 0) context.moveTo(0, y);
        else context.lineTo(index * step, y);
      });
      context.stroke();
      requestAnimationFrame(paint);
    };
    paint();
  }

  async function transcribe(blob: Blob) {
    setStatus("transcribing");
    audioRef.current?.stream.getTracks().forEach((track) => track.stop());
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const payload = (await response.json()) as { text?: string; useClientFallback?: boolean; detail?: string; error?: string };
      if (payload.text) {
        onTranscript(payload.text);
        setNote("Transcribed with the open-weights speech service.");
        return;
      }
      if (payload.useClientFallback) {
        const local = await transcribeInBrowser(blob);
        if (local) {
          onTranscript(local);
          setNote("Transcribed on this device with Whisper Tiny. It is a rough draft — read it before you keep it.");
          return;
        }
      }
      setNote(payload.detail || payload.error || "No transcript came back. You can type instead.");
    } catch {
      setNote("The recording could not be transcribed. You can type instead.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="h-16 w-full rounded-2xl border border-sand bg-white" aria-hidden />
      <div className="flex flex-wrap items-center gap-3">
        {status === "recording" ? (
          <Button type="button" variant="outline" onClick={() => recorderRef.current?.stop()} disabled={disabled}>
            <Square className="h-4 w-4" /> Stop and transcribe
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => void start().catch(() => setNote("Microphone permission is needed to record."))} disabled={disabled || status === "transcribing"}>
            <Mic className="h-4 w-4" /> {status === "transcribing" ? "Transcribing…" : "Record"}
          </Button>
        )}
        {note ? <p className="text-sm text-forest/70">{note}</p> : null}
      </div>
    </div>
  );
}

async function transcribeInBrowser(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const transformers = (await import("@huggingface/transformers")) as {
      pipeline: (task: string, model: string) => Promise<(audio: string) => Promise<{ text?: string } | Array<{ text?: string }>>>;
    };
    const transcriber = await transformers.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");
    const result = await transcriber(url);
    if (Array.isArray(result)) return result.map((item) => item.text ?? "").join(" ").trim();
    return result.text?.trim() ?? "";
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}
