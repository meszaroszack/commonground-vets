import { listConditions, listEvidence } from "@/db/repository";
import { requireProfile } from "@/lib/auth";
import { PacketDesk } from "@/components/packet-desk";

export const dynamic = "force-dynamic";

export default async function PacketPage() {
  const { actor } = await requireProfile();
  const [documents, conditions] = await Promise.all([listEvidence(actor.id), listConditions(actor.id)]);
  return (
    <div className="space-y-6 py-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">Packet</p>
        <h1 className="mt-2 font-serif text-5xl">Your vault, your upload.</h1>
      </div>
      <PacketDesk
        documents={documents}
        conditions={conditions.map((condition) => ({ id: condition.id, name: condition.name }))}
      />
    </div>
  );
}
