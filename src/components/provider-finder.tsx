"use client";

import { useState } from "react";
import type { CommunityProvider } from "@/db/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Hit = {
  npiNumber: string;
  providerName: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  community: CommunityProvider | null;
};

export function ProviderFinder({ conditions }: { conditions: Array<{ id: string; name: string }> }) {
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [specialty, setSpecialty] = useState("Family Medicine");
  const [conditionId, setConditionId] = useState(conditions[0]?.id ?? "");
  const [results, setResults] = useState<Hit[]>([]);
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [notes, setNotes] = useState("");
  const [acceptsDbq, setAcceptsDbq] = useState(true);
  const [writesNexusLetters, setWritesNexusLetters] = useState(false);
  const [telehealthAvailable, setTelehealthAvailable] = useState(false);

  async function search() {
    setPending(true);
    setDetail("");
    const params = new URLSearchParams({ zip, state, specialty });
    const response = await fetch(`/api/providers/search?${params.toString()}`);
    const payload = (await response.json()) as { results?: Hit[]; detail?: string; error?: string };
    setPending(false);
    setResults(payload.results ?? []);
    setDetail(payload.error || payload.detail || "");
  }

  async function saveNote() {
    if (!selected) return;
    setPending(true);
    const response = await fetch("/api/providers/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npiNumber: selected.npiNumber,
        providerName: selected.providerName,
        specialty: selected.specialty,
        city: selected.city,
        state: selected.state,
        zip: selected.zip,
        phone: selected.phone,
        acceptsDbq,
        writesNexusLetters,
        telehealthAvailable,
        veteranNotes: notes,
      }),
    });
    setPending(false);
    if (response.ok) {
      setSelected(null);
      await search();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find a licensed clinician</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="ZIP code" value={zip} onChange={(event) => setZip(event.target.value)} inputMode="numeric" />
          <Input placeholder="State" value={state} onChange={(event) => setState(event.target.value)} maxLength={2} />
          <Input placeholder="Specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} />
          <Button type="button" onClick={() => void search()} disabled={pending}>Search NPI registry</Button>
          {detail ? <p className="md:col-span-4 text-sm leading-6 text-forest/70">{detail}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm" htmlFor="briefing-condition">Briefing packet for</label>
        <select id="briefing-condition" className="h-11 rounded-2xl border border-sand bg-white px-4 text-sm" value={conditionId} onChange={(event) => setConditionId(event.target.value)}>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>{condition.name}</option>
          ))}
        </select>
        <Button type="button" variant="outline" disabled={!conditionId} onClick={() => { window.location.href = `/api/providers/briefing?conditionId=${conditionId}`; }}>
          Generate doctor briefing packet
        </Button>
      </div>

      <div className="grid gap-4">
        {results.map((hit) => (
          <Card key={hit.npiNumber}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl">{hit.providerName}</h3>
                  <p className="text-sm text-forest/70">{hit.specialty}</p>
                  <p className="mt-1 text-sm">{[hit.address, hit.city, hit.state, hit.zip].filter(Boolean).join(", ")}</p>
                  <p className="font-mono text-xs text-forest/60">NPI {hit.npiNumber}{hit.phone ? ` · ${hit.phone}` : ""}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => { setSelected(hit); setNotes(hit.community?.veteranNotes ?? ""); }}>
                  Mark provider as veteran-friendly
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hit.community?.acceptsDbq ? <Badge>DBQ friendly</Badge> : null}
                {hit.community?.telehealthAvailable ? <Badge>Telehealth</Badge> : null}
                {hit.community?.writesNexusLetters ? <Badge>Nexus experienced</Badge> : null}
                {hit.community ? <Badge>{hit.community.communityUpvotes} community notes</Badge> : null}
              </div>
              {hit.community?.veteranNotes ? <p className="text-sm leading-6 text-forest/75">{hit.community.veteranNotes}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogTitle>Community note</DialogTitle>
          <DialogDescription>
            This note sits on top of the public NPI record for {selected?.providerName}. It is not an endorsement by Common Ground, and it does not mean they have agreed to complete a form.
          </DialogDescription>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex gap-2"><input type="checkbox" checked={acceptsDbq} onChange={(event) => setAcceptsDbq(event.target.checked)} /> DBQ friendly</label>
            <label className="flex gap-2"><input type="checkbox" checked={writesNexusLetters} onChange={(event) => setWritesNexusLetters(event.target.checked)} /> Has written nexus letters</label>
            <label className="flex gap-2"><input type="checkbox" checked={telehealthAvailable} onChange={(event) => setTelehealthAvailable(event.target.checked)} /> Telehealth</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you actually experience? Keep it factual." />
            <Button type="button" onClick={() => void saveNote()} disabled={pending}>Save note and upvote</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
