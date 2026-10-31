"use client";

import { useState } from "react";
import type { DocType, EvidenceDocument } from "@/db/types";
import { formatDate } from "@/lib/format";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PacketDesk({
  documents,
  conditions,
}: {
  documents: EvidenceDocument[];
  conditions: Array<{ id: string; name: string }>;
}) {
  const [zipCode, setZipCode] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("private_medical_record");
  const [conditionId, setConditionId] = useState(conditions[0]?.id ?? "");

  async function submit() {
    setPending(true);
    setError("");
    const response = await fetch("/api/va/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zipCode }),
    });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "The upload did not start.");
      return;
    }
    setReceipt(JSON.stringify(payload, null, 2));
    if (payload.guid) {
      window.setTimeout(() => void poll(payload.guid as string), 3000);
    }
  }

  async function poll(guid: string) {
    const response = await fetch(`/api/va/intake?guid=${encodeURIComponent(guid)}`);
    const payload = await response.json();
    setReceipt(JSON.stringify(payload, null, 2));
  }

  async function upload(formData: FormData) {
    setError("");
    const response = await fetch("/api/packet/upload", { method: "POST", body: formData });
    if (response.ok) window.location.reload();
    else {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "The file was not saved.");
    }
  }

  return (
    <Tabs defaultValue="vault">
      <TabsList>
        <TabsTrigger value="vault">Evidence vault</TabsTrigger>
        <TabsTrigger value="submit">Submit</TabsTrigger>
        <TabsTrigger value="how">How filing works</TabsTrigger>
      </TabsList>
      <TabsContent value="vault" className="space-y-4">
        {documents.length === 0 ? <p className="text-sm text-forest/70">No files yet. A signed statement or clinician briefing will land here.</p> : null}
        {documents.map((document) => (
          <Card key={document.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <h2 className="font-serif text-2xl">{document.title}</h2>
                <p className="mt-1 text-sm text-forest/70">{DOC_TYPE_LABELS[document.docType]} · {formatDate(document.createdAt)}</p>
                <p className="font-mono text-[11px] text-forest/50">sha256 {document.sha256Hash}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{document.vaLighthouseStatus}</Badge>
                <Button asChild variant="outline" size="sm"><a href={`/api/evidence/${document.id}`}>Download</a></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader><CardTitle>Add a record you already have</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4" action={(formData) => void upload(formData)}>
              <Input name="title" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <select name="docType" className="h-11 rounded-2xl border border-sand px-3 text-sm" value={docType} onChange={(event) => setDocType(event.target.value as DocType)}>
                <option value="private_medical_record">Private medical record</option>
                <option value="dbq">DBQ</option>
                <option value="nexus_letter">Nexus letter</option>
              </select>
              <select name="conditionId" className="h-11 rounded-2xl border border-sand px-3 text-sm" value={conditionId} onChange={(event) => setConditionId(event.target.value)}>
                {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
              </select>
              <input name="file" type="file" required className="text-sm" />
              <Button type="submit">Save to vault</Button>
            </form>
          </CardContent>
        </Card>
        <Button asChild variant="sage"><a href="/api/packet/export">Download master claim ZIP</a></Button>
      </TabsContent>
      <TabsContent value="submit">
        <Card>
          <CardHeader><CardTitle>VA Lighthouse Benefits Intake</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-forest/75">
              Without an API key this stays a local simulation and nothing is sent to VA. A sandbox key sends the packet only to the sandbox. Production is refused unless you explicitly allow it.
            </p>
            <Input placeholder="Mailing ZIP" value={zipCode} onChange={(event) => setZipCode(event.target.value)} inputMode="numeric" />
            <Button type="button" onClick={() => void submit()} disabled={pending}>Submit packet</Button>
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            {receipt ? <pre className="overflow-auto rounded-2xl bg-alabaster p-3 text-xs leading-5">{receipt}</pre> : null}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="how">
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm leading-6 text-forest/75">
            <p>You can drag the ZIP onto VA.gov yourself. That path does not pass through Common Ground.</p>
            <p>Or you can use the Benefits Intake sandbox: we ask VA for an upload location, then send the PDFs with your name, file number, and ZIP. The SHA-256 of the primary PDF is stored on the evidence row.</p>
            <p>A GUID, a sandbox status, or the word “vbms” in a simulation is not a decision and not proof the real VA received a claim.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
