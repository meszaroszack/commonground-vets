"use client";

import { useRef, useState } from "react";
import type { Relationship } from "@/db/types";
import { HONESTY_RULE } from "@/lib/compliance";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas, type SignatureHandle } from "@/components/signature-canvas";
import { VoiceRecorder } from "@/components/voice-recorder";

type Props = {
  token: string;
  veteranFirstName: string;
  conditionName: string;
  relationship: Relationship;
  witnessName: string;
};

export function WitnessStudio(props: Props) {
  const [notes, setNotes] = useState("");
  const [statement, setStatement] = useState("");
  const [name, setName] = useState(props.witnessName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const signatureRef = useRef<SignatureHandle>(null);
  const prompts = [
    `How do you know ${props.veteranFirstName}, and how often do you see or talk to them?`,
    `What changes, symptoms, or struggles have you personally noticed with their ${props.conditionName}?`,
    "Can you share one specific example or day where you saw how this affected their work, family life, or mood?",
  ];

  async function synthesize() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/witness/${props.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "synthesize", transcript: notes }),
    });
    const payload = (await response.json()) as { polishedStatement?: string; error?: string };
    setPending(false);
    if (!response.ok || !payload.polishedStatement) {
      setError(payload.error || "The draft could not be prepared.");
      return;
    }
    setStatement(payload.polishedStatement);
  }

  async function sign() {
    const signatureDataUrl = signatureRef.current?.toDataUrl();
    if (!signatureDataUrl) {
      setError("Sign in the box before sending.");
      return;
    }
    setPending(true);
    setError("");
    const response = await fetch(`/api/witness/${props.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sign",
        transcript: notes,
        polishedStatement: statement,
        witnessName: name,
        witnessEmail: email,
        witnessPhone: phone,
        signatureDataUrl,
      }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    setPending(false);
    if (!response.ok || !payload.ok) {
      setError(payload.error || "The statement was not saved.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sent to {props.veteranFirstName}&apos;s vault</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-forest/75">
            Thank you. {props.veteranFirstName} can download the signed preparation copy and decide whether to file it. You do not need an account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">{RELATIONSHIP_LABELS[props.relationship]}</p>
          <CardTitle>You&apos;re helping {props.veteranFirstName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-forest/75">
            You&apos;re helping {props.veteranFirstName} document how {props.conditionName} affects their daily life. You don&apos;t need to write a formal essay — just tap the microphone and answer 3 quick prompts in your own words.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
            {prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ol>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Speak or type what you have personally seen." />
          <VoiceRecorder onTranscript={(text) => setNotes((current) => (current ? `${current}\n${text}` : text))} disabled={pending} />
          <Button type="button" onClick={() => void synthesize()} disabled={pending || notes.trim().length === 0}>Prepare the statement</Button>
          <p className="text-xs leading-5 text-forest/60">{HONESTY_RULE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review every word</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="The draft appears here. Change anything that is not what you meant." />
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <SignatureCanvas ref={signatureRef} />
          <Button type="button" onClick={() => void sign()} disabled={pending || statement.trim().length === 0}>
            Sign & send to {props.veteranFirstName}&apos;s vault
          </Button>
          {error ? <p className="text-sm text-terracotta">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
