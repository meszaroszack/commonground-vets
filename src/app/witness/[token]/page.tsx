import { getWitnessBundle } from "@/db/repository";
import { isDatabaseConfigured } from "@/lib/env";
import { isSharedDemo } from "@/lib/public-env";
import { firstName } from "@/lib/utils";
import { WitnessStudio } from "@/components/witness-studio";

export const dynamic = "force-dynamic";

export default async function WitnessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSharedDemo() && !isDatabaseConfigured()) {
    return (
      <section className="py-16">
        <h1 className="font-serif text-5xl">This link is not active.</h1>
        <p className="mt-3 text-sm text-forest/70">Ask the veteran for a new one. Links are not guessable on purpose.</p>
      </section>
    );
  }
  const bundle = await getWitnessBundle(token);
  if (!bundle) {
    return (
      <section className="py-16">
        <h1 className="font-serif text-5xl">This link is not active.</h1>
        <p className="mt-3 text-sm text-forest/70">Ask the veteran for a new one. Links are not guessable on purpose.</p>
      </section>
    );
  }
  if (bundle.witness.status === "completed") {
    return (
      <section className="py-16">
        <h1 className="font-serif text-5xl">Already signed.</h1>
        <p className="mt-3 text-sm text-forest/70">This statement is in {firstName(bundle.profile.fullName)}&apos;s vault.</p>
      </section>
    );
  }
  return (
    <div className="py-6">
      <WitnessStudio
        token={token}
        veteranFirstName={firstName(bundle.profile.fullName)}
        conditionName={bundle.condition.name}
        relationship={bundle.witness.relationship}
        witnessName={bundle.witness.witnessName}
      />
    </div>
  );
}
