import { COMPLIANCE_FOOTER } from "@/lib/compliance";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl px-4 pb-12">
      <div className="rounded-3xl border border-sand bg-white px-6 py-6">
        <p className="font-serif text-xl">You keep every dollar.</p>
        <p className="mt-3 text-sm leading-6 text-forest/70">{COMPLIANCE_FOOTER}</p>
      </div>
    </footer>
  );
}
