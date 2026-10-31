import { notFound } from "next/navigation";
import { getConditionForUser } from "@/db/repository";
import { requireProfile } from "@/lib/auth";
import { lookupCriteria } from "@/lib/ai/cfr-criteria";
import { StorytellerChat } from "@/components/storyteller-chat";

export const dynamic = "force-dynamic";

export default async function StorytellerPage({ params }: { params: Promise<{ conditionId: string }> }) {
  const { conditionId } = await params;
  const { actor } = await requireProfile();
  const condition = await getConditionForUser(actor.id, conditionId);
  if (!condition) notFound();
  const criterion = lookupCriteria(condition);
  return (
    <div className="py-6">
      <StorytellerChat
        conditionId={condition.id}
        name={condition.name}
        diagnosticCode={condition.diagnosticCode}
        initialHistory={condition.conversationHistory}
        initialMetrics={condition.extractedMetrics}
        initialDraft={condition.draftPersonalStatement}
        criterion={{
          citation: criterion.citation,
          summary: criterion.summary,
          ratings: criterion.ratings,
          examMeasurements: criterion.examMeasurements,
          bodySystem: criterion.bodySystem,
        }}
      />
    </div>
  );
}
