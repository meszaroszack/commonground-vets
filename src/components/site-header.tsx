"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Command center" },
  { href: "/dashboard/providers", label: "Clinicians" },
  { href: "/dashboard/packet", label: "Packet" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
      <Link href="/" className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-forest/50">Veteran mutual aid</span>
        <span className="block font-serif text-3xl leading-none">Common Ground</span>
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn("rounded-full px-3 py-2", pathname === link.href ? "bg-forest text-alabaster" : "hover:bg-sand")}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/auth/login" className="rounded-full border border-sand px-3 py-2">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
