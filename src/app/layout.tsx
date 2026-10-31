import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ComplianceBanner } from "@/components/compliance-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Common Ground",
  description: "A free self-service space for veterans to organize records, journal what is true, invite witnesses, and file directly with VA.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${mono.variable} font-sans antialiased`}>
        <ComplianceBanner />
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
