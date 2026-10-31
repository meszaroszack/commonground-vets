import { COMPLIANCE_BANNER } from "@/lib/compliance";
import { isSharedDemo, isSupabaseConfigured } from "@/lib/public-env";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <section className="mx-auto max-w-xl py-12">
      <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">Sign in</p>
      <h1 className="mt-2 font-serif text-5xl">Your records stay yours.</h1>
      <p className="mt-4 text-sm leading-6 text-forest/75">{COMPLIANCE_BANNER}</p>
      <div className="mt-8 rounded-3xl border border-sand bg-white p-6">
        <LoginForm configured={configured} preview={isSharedDemo()} />
      </div>
    </section>
  );
}
