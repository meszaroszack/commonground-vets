import { DEMO_WITNESS_TOKEN } from "@/db/types";
import { listConditions } from "@/db/repository";
import { requireProfile } from "@/lib/auth";
import { DashboardHome } from "@/components/dashboard-home";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { actor, profile } = await requireProfile();
  const conditions = await listConditions(actor.id);
  return (
    <DashboardHome
      profile={profile}
      conditions={conditions}
      demo={actor.demo}
      previewWitnessPath={actor.demo ? `/witness/${DEMO_WITNESS_TOKEN}` : null}
    />
  );
}
