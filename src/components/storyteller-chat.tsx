"use client";

import { useMemo, useRef, useState } from "react";
import type { ConversationTurn, ExtractedMetrics } from "@/db/types";
import { HONESTY_RULE } from "@/lib/compliance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas, type SignatureHandle } from "@/components/signature-canvas";
import { VoiceRecorder } from "@/components/voice-recorder";

type CriterionView = {
  citation: string;
  summary: string;
  ratings: Array<{ percent: number; criteria: string }>;
  examMeasurements: string[];
  bodySystem: string;
};

type Props = {
  conditionId: string;
  name: string;
  diagnosticCode: string;
  initialHistory: ConversationTurn[];
  initialMetrics: ExtractedMetrics;
  initialDraft: string;
  criterion: CriterionView;
};

export function StorytellerChat({ conditionId, name, diagnosticCode, initialHistory, initialMetrics, initialDraft, criterion }: Props) {
  const [history, setHistory] = useState<ConversationTurn[]>(initialHistory);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState("");
  const [guide, setGuide] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [downloadPath, setDownloadPath] = useState("");
  const signatureRef = useRef<SignatureHandle>(null);
  const greeting = useMemo(
    () => `I'm here to help you put ${name} into your own words. There is no form voice required. What does a hard day actually look like?`,
    [name],
  );

  async function send(text: string) {
    const content = text.trim();
    if (!content) return;
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/storyteller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "interview", conditionId, message: content }),
    });
    const payload = (await response.json()) as { reply?: string; extractedMetrics?: ExtractedMetrics; error?: string };
    setPending(false);
    if (!response.ok || !payload.reply || !payload.extractedMetrics) {
      setError(payload.error || "The journal could not save that turn.");
      return;
    }
    const now = new Date().toISOString();
    setHistory((current) => [
      ...current,
      { role: "user", content, timestamp: now },
      { role: "assistant", content: payload.reply as string, timestamp: now },
    ]);
    setMetrics(payload.extractedMetrics);
  }

  async function synthesize(withSignature: boolean) {
    setPending(true);
    setError("");
    const signatureDataUrl = withSignature ? signatureRef.current?.toDataUrl() : undefined;
    if (withSignature && !signatureDataUrl) {
      setPending(false);
      setError("Sign in the box before saving the statement to your vault.");
      return;
    }
    const response = await fetch("/api/storyteller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "synthesize", conditionId, draft: draft || undefined, signatureDataUrl }),
    });
    const payload = (await response.json()) as { draftStatement?: string; downloadPath?: string; error?: string };
    setPending(false);
    if (!response.ok || !payload.draftStatement) {
      setError(payload.error || "The statement could not be prepared.");
      return;
    }
    setDraft(payload.draftStatement);
    if (payload.downloadPath) setDownloadPath(payload.downloadPath);
  }

  async function examGuide() {
    setPending(true);
    setError("");
    const response = await fetch("/api/storyteller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "exam_guide", conditionId, format: "pdf" }),
    });
    const payload = (await response.json()) as { examGuide?: string; downloadPath?: string; error?: string };
    setPending(false);
    if (!response.ok || !payload.examGuide) {
      setError(payload.error || "The exam guide could not be prepared.");
      return;
    }
    setGuide(payload.examGuide);
    if (payload.downloadPath) setDownloadPath(payload.downloadPath);
  }

  const shown = history.length > 0 ? history : [{ role: "assistant" as const, content: greeting, timestamp: "" }];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">38 CFR · {diagnosticCode}</p>
          <CardTitle>{name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-forest/75">{criterion.summary}</p>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Topics covered in your own words</span>
              <span className="font-mono">{metrics.readinessScore}%</span>
            </div>
            <Progress value={metrics.readinessScore} />
            <p className="mt-2 text-xs leading-5 text-forest/60">
              This meter only rises when your account covers topics the schedule asks about. It is not a predicted rating.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            {criterion.ratings.slice(0, 6).map((level) => (
              <p key={`${level.percent}-${level.criteria.slice(0, 24)}`}>
                <Badge>{level.percent}%</Badge> <span className="text-forest/75">{level.criteria}</span>
              </p>
            ))}
          </div>
          <p className="text-xs leading-5 text-forest/50">{criterion.citation}</p>
          {criterion.bodySystem === "mental-health" ? (
            <p className="rounded-2xl bg-sand/60 p-3 text-sm leading-6">
              If you are in crisis or thinking about hurting yourself, call or text 988, then press 1. This journal is not a crisis service.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
              {shown.map((turn, index) => (
                <div key={`${turn.timestamp}-${index}`} className={turn.role === "user" ? "ml-8 rounded-2xl bg-[#f8efe8] px-4 py-3 text-sm leading-6" : "mr-8 rounded-2xl border border-sand bg-white px-4 py-3 text-sm leading-6"}>
                  {turn.content}
                </div>
              ))}
            </div>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Talk the way you would to a friend." />
            <VoiceRecorder onTranscript={(text) => setMessage((current) => (current ? `${current} ${text}` : text))} disabled={pending} />
            <Button type="button" onClick={() => void send(message)} disabled={pending || message.trim().length === 0}>
              {pending ? "Saving…" : "Send"}
            </Button>
            <p className="text-xs leading-5 text-forest/60">{HONESTY_RULE}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Synthesize a draft, then edit every word so it stays yours." />
            <SignatureCanvas ref={signatureRef} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void synthesize(false)} disabled={pending}>Synthesize personal statement</Button>
              <Button type="button" onClick={() => void synthesize(true)} disabled={pending}>Sign and save to vault</Button>
              <Button type="button" variant="sage" onClick={() => void examGuide()} disabled={pending}>Generate exam-day grounding guide</Button>
            </div>
            {guide ? <pre className="whitespace-pre-wrap rounded-2xl bg-alabaster p-4 text-sm leading-6">{guide}</pre> : null}
            {downloadPath ? <a className="text-sm text-terracotta underline" href={downloadPath}>Download the latest PDF</a> : null}
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
