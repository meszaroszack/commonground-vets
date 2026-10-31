"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ configured, preview = false }: { configured: boolean; preview?: boolean }) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function magicLink() {
    setPending(true);
    setNote("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    setPending(false);
    setNote(error ? error.message : "Check your email for the sign-in link.");
  }

  async function oauth(provider: "google" | "github") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (!configured && preview) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-forest/75">
          Supabase is not configured, so this opens a local preview with a fictional veteran, Jordan Hale. Nothing is saved to a real account and nothing is sent to VA.
        </p>
        <Button asChild><Link href="/dashboard">Enter local preview</Link></Button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-forest/75">
          Sign-in is not connected on this public site yet. The rate calculator on the home page is live. Journaling stays off until accounts are on, so a real story cannot land in a shared preview.
        </p>
        <Button asChild><Link href="/">Back to the calculator</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button type="button" onClick={() => void magicLink()} disabled={pending || !email.includes("@")}>
        {pending ? "Sending…" : "Email me a magic link"}
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void oauth("google")}>Continue with Google</Button>
        <Button type="button" variant="outline" onClick={() => void oauth("github")}>Continue with GitHub</Button>
      </div>
      {note ? <p className="text-sm text-forest/70">{note}</p> : null}
    </div>
  );
}
