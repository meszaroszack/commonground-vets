import { listConditions } from "@/db/repository";
import { requireProfile } from "@/lib/auth";
import { ProviderFinder } from "@/components/provider-finder";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const { actor } = await requireProfile();
  const conditions = await listConditions(actor.id);
  return (
    <div className="space-y-6 py-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">Clinicians</p>
        <h1 className="mt-2 font-serif text-5xl">Your doctor, not a referral list we sell.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-forest/70">
          Search the public CMS NPI registry. Community notes appear only on NPIs someone signed in to tag. A briefing packet explains the DBQ and prints only the symptoms you already described.
        </p>
      </div>
      <ProviderFinder conditions={conditions.map((condition) => ({ id: condition.id, name: condition.name }))} />
    </div>
  );
}
