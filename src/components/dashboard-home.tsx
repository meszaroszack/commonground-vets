"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClaimCondition, ClaimType, Profile } from "@/db/types";
import { calculateCombinedRating, monthlyCompensation } from "@/lib/ai/cfr-criteria";
import { daysUntil, formatDate, formatUsd } from "@/lib/format";
import { CLAIM_TYPE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { WitnessShareModal } from "@/components/witness-share-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  profile: Profile;
  conditions: ClaimCondition[];
  demo: boolean;
  previewWitnessPath: string | null;
};

export function DashboardHome({ profile, conditions, demo, previewWitnessPath }: Props) {
  const [name, setName] = useState(profile.fullName);
  const [fileNumber, setFileNumber] = useState(profile.vaFileNumber ?? "");
  const [rating, setRating] = useState(profile.currentRating);
  const [spouse, setSpouse] = useState(false);
  const [message, setMessage] = useState("");
  const [claims, setClaims] = useState("");
  const [conditionForm, setConditionForm] = useState({
    name: "",
    diagnosticCode: "",
    claimType: "new" as ClaimType,
    currentRating: 0,
    targetRating: 10,
  });
  const targets = conditions.map((condition) => condition.targetRating);
  const combined = useMemo(() => calculateCombinedRating(targets), [targets]);
  const currentPay = monthlyCompensation(rating, { spouse }) ?? Number(profile.currentMonthlyComp);
  const illustrated = monthlyCompensation(combined.rounded, { spouse });
  const days = daysUntil(profile.itfExpirationDate);

  async function saveProfile() {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name, vaFileNumber: fileNumber || null, currentRating: rating }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(payload.error || "Profile saved. The monthly amount uses the 2026 veteran-alone table unless you toggle a spouse below.");
  }

  async function claimsAction(action: "status" | "sandbox-intent" | "record-intent", itfFiledDate?: string) {
    const response = await fetch("/api/va/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, itfFiledDate }),
    });
    const payload = await response.json();
    setClaims(JSON.stringify(payload, null, 2));
    if (response.ok && action !== "status") window.location.reload();
  }

  async function addCondition() {
    const response = await fetch("/api/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conditionForm),
    });
    if (response.ok) window.location.reload();
    else {
      const payload = (await response.json()) as { error?: string };
      setMessage(payload.error || "The condition was not added.");
    }
  }

  return (
    <div className="space-y-6 py-6">
      {demo ? (
        <div className="rounded-3xl border border-sand bg-[#f6f1e8] p-5 text-sm leading-6">
          Local preview. Jordan Hale is fictional. Connect Supabase to use your own account.
          {previewWitnessPath ? (
            <>
              {" "}A sample witness link is open at <Link className="underline" href={previewWitnessPath}>{previewWitnessPath}</Link>.
            </>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">Command center</p>
        <h1 className="mt-2 font-serif text-5xl">Hello, {profile.fullName.split(" ")[0]}.</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Intent to file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6">
            <p>Filed {formatDate(profile.itfFiledDate)}. Expires {formatDate(profile.itfExpirationDate)}.</p>
            <p className={days != null && days < 30 ? "text-terracotta" : "text-sage"}>
              {days == null ? "No date recorded yet." : `${days} days remaining on the date you recorded.`}
            </p>
            <p className="text-forest/70">An Intent to File can protect an effective date for up to a year. Recording it here does not file it. File the real one on VA.gov.</p>
            <Input type="date" id="itf-date" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => {
                const value = (document.getElementById("itf-date") as HTMLInputElement | null)?.value;
                if (!value) return;
                void claimsAction("record-intent", new Date(`${value}T00:00:00.000Z`).toISOString());
              }}>Record a date I already filed</Button>
              <Button type="button" variant="outline" onClick={() => void claimsAction("status")}>Check Lighthouse status</Button>
              <Button type="button" variant="ghost" onClick={() => void claimsAction("sandbox-intent")}>Sandbox intent only</Button>
            </div>
            {claims ? <pre className="overflow-auto rounded-2xl bg-alabaster p-3 text-xs leading-5">{claims}</pre> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What the public table says</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Your stored combined rating is {rating}%, about {formatUsd(currentPay)} a month before dependents other than an optional spouse.</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={spouse} onChange={(event) => setSpouse(event.target.checked)} />
              Estimate with a spouse
            </label>
            <p>If the target ratings below combined under VA math, the illustration is {combined.rounded}%{illustrated != null ? ` · ${formatUsd(illustrated)} / month` : ""}. You would keep 100% of any increase VA actually grants.</p>
            <ul className="space-y-1 text-xs leading-5 text-forest/60">
              {combined.steps.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your record</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Full name" />
          <Input value={fileNumber} onChange={(event) => setFileNumber(event.target.value)} placeholder="VA file number or sandbox id" aria-label="VA file number" />
          <select className="h-11 rounded-2xl border border-sand px-3 text-sm" value={rating} onChange={(event) => setRating(Number(event.target.value))} aria-label="Current combined rating">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <Button type="button" onClick={() => void saveProfile()}>Save</Button>
          {message ? <p className="md:col-span-4 text-sm text-forest/70">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {conditions.map((condition) => (
          <Card key={condition.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{condition.diagnosticCode}</Badge>
                  <Badge>{CLAIM_TYPE_LABELS[condition.claimType]}</Badge>
                  <Badge>{STATUS_LABELS[condition.status]}</Badge>
                </div>
                <h2 className="mt-3 font-serif text-3xl">{condition.name}</h2>
                <p className="mt-1 text-sm text-forest/70">
                  Current individual {condition.currentRating}% · target illustration {condition.targetRating}% · journal coverage {condition.extractedMetrics.readinessScore}%
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link href={`/dashboard/storyteller/${condition.id}`}>Open journal</Link></Button>
                <WitnessShareModal conditionId={condition.id} conditionName={condition.name} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a condition</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Name" value={conditionForm.name} onChange={(event) => setConditionForm({ ...conditionForm, name: event.target.value })} />
          <Input placeholder="Code, e.g. 8100" value={conditionForm.diagnosticCode} onChange={(event) => setConditionForm({ ...conditionForm, diagnosticCode: event.target.value })} />
          <select className="h-11 rounded-2xl border border-sand px-3 text-sm" value={conditionForm.claimType} onChange={(event) => setConditionForm({ ...conditionForm, claimType: event.target.value as ClaimType })}>
            <option value="new">New</option>
            <option value="increase">Increase</option>
            <option value="secondary">Secondary</option>
          </select>
          <Input type="number" min={0} max={100} step={10} value={conditionForm.targetRating} onChange={(event) => setConditionForm({ ...conditionForm, targetRating: Number(event.target.value) })} aria-label="Target rating illustration" />
          <Button type="button" onClick={() => void addCondition()}>Add</Button>
        </CardContent>
      </Card>
    </div>
  );
}
