"use client";

import { useState } from "react";
import type { Relationship } from "@/db/types";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function WitnessShareModal({ conditionId, conditionName }: { conditionId: string; conditionName: string }) {
  const [open, setOpen] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("spouse_partner");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createLink() {
    setPending(true);
    setError("");
    const response = await fetch("/api/witness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionId, witnessName, relationship }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    setPending(false);
    if (!response.ok || !payload.url) {
      setError(payload.error || "The link could not be created.");
      return;
    }
    setUrl(payload.url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Invite a witness</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Invite a witness</DialogTitle>
        <DialogDescription>
          Send {conditionName} to someone who has seen your days. They will not need an account. The link is the password — send it only to them.
        </DialogDescription>
        <div className="mt-5 space-y-3">
          <Input placeholder="Their first name" value={witnessName} onChange={(event) => setWitnessName(event.target.value)} />
          <select
            className="h-11 w-full rounded-2xl border border-sand bg-white px-4 text-sm"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value as Relationship)}
          >
            {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {error ? <p className="text-sm text-terracotta">{error}</p> : null}
          {url ? (
            <div className="space-y-2">
              <Input readOnly value={url} />
              <Button type="button" variant="sage" onClick={() => void navigator.clipboard.writeText(url)}>Copy link</Button>
            </div>
          ) : (
            <Button type="button" onClick={() => void createLink()} disabled={pending || witnessName.trim().length === 0}>
              {pending ? "Creating…" : "Create link"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
