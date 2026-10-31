import Link from "next/link";
import { BookOpen, FileArchive, HeartHandshake, Stethoscope } from "lucide-react";
import { ValueCalculator } from "@/components/value-calculator";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: BookOpen,
    title: "Tell it in your own words",
    copy: "A calm journal asks about the parts of life a rating schedule actually measures, without handing you a script.",
  },
  {
    icon: HeartHandshake,
    title: "Invite someone who was there",
    copy: "A spouse, friend, or person you served with can answer three prompts and sign. No account.",
  },
  {
    icon: Stethoscope,
    title: "Walk into the appointment prepared",
    copy: "Search the public NPI registry and hand your own clinician a briefing built only from what you said.",
  },
  {
    icon: FileArchive,
    title: "File it yourself",
    copy: "Download one ZIP, or send the packet to the VA Lighthouse sandbox from your account. You keep 100%.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      <section className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-terracotta">Mutual aid, not a claim mill</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">
            A quieter place to organize your claim.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-forest/75">
            Journal what is true. Invite the people who see your days. Find your own clinician. File directly with VA. Keep every dollar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/dashboard">Open the command center</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/auth/login">Sign in with a magic link</Link></Button>
          </div>
        </div>
        <div className="rounded-3xl border border-sand bg-white p-6">
          <p className="font-serif text-2xl">What this is</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-forest/75">
            <li>A document organizer, a journal, a witness link, and a public clinician directory.</li>
            <li>Not an accredited representative, not a medical exam, and not VA.</li>
            <li>Under 38 U.S.C. § 5904, you retain the compensation. We never take a percentage of back pay.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <article key={step.title} className="rounded-3xl border border-sand bg-white p-6">
            <step.icon className="h-5 w-5 text-terracotta" />
            <h2 className="mt-4 font-serif text-2xl">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-forest/70">{step.copy}</p>
          </article>
        ))}
      </section>

      <ValueCalculator />
    </div>
  );
}
