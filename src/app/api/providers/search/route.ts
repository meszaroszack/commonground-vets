import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderByNpi, listProviders, upsertProvider } from "@/db/repository";
import { newId } from "@/lib/ids";
import { errorMessage, requireApiProfile } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NpiResult = {
  number?: string | number;
  enumeration_type?: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    credential?: string;
    organization_name?: string;
  };
  addresses?: Array<{
    address_purpose?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    telephone_number?: string;
  }>;
  taxonomies?: Array<{ desc?: string; primary?: boolean }>;
};

const tagSchema = z.object({
  npiNumber: z.string().regex(/^\d{10}$/),
  providerName: z.string().trim().min(1).max(160),
  specialty: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(2).optional().default(""),
  zip: z.string().trim().max(10).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  acceptsDbq: z.boolean().optional().default(true),
  writesNexusLetters: z.boolean().optional().default(false),
  telehealthAvailable: z.boolean().optional().default(false),
  avgCostEstimate: z.number().int().min(0).max(20000).nullable().optional(),
  veteranNotes: z.string().trim().max(1000).optional().default(""),
});

export async function GET(request: Request) {
  const auth = await requireApiProfile();
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const zip = url.searchParams.get("zip") ?? "";
  const state = (url.searchParams.get("state") ?? "").toUpperCase();
  const specialty = (url.searchParams.get("specialty") ?? "").trim();
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 });
  if (state && !/^[A-Z]{2}$/.test(state)) return NextResponse.json({ error: "Use a two-letter state." }, { status: 400 });
  if (specialty.length > 80) return NextResponse.json({ error: "Specialty is too long." }, { status: 400 });

  const endpoint = new URL("https://npiregistry.cms.hhs.gov/api/");
  endpoint.searchParams.set("version", "2.1");
  endpoint.searchParams.set("postal_code", zip);
  endpoint.searchParams.set("limit", "25");
  if (state) endpoint.searchParams.set("state", state);
  if (specialty) endpoint.searchParams.set("taxonomy_description", specialty);

  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
    const payload = (await response.json()) as { results?: NpiResult[]; Errors?: unknown };
    if (!response.ok || payload.Errors) {
      return NextResponse.json({
        results: [],
        npiAvailable: false,
        detail: "The public NPI registry did not return results. Nothing was invented in its place.",
      });
    }
    const community = await listProviders();
    const byNpi = new Map(community.map((provider) => [provider.npiNumber, provider]));
    const results = (payload.results ?? []).map((raw) => {
      const basic = raw.basic ?? {};
      const location = raw.addresses?.find((address) => address.address_purpose === "LOCATION") ?? raw.addresses?.[0];
      const taxonomy = raw.taxonomies?.find((item) => item.primary) ?? raw.taxonomies?.[0];
      const npiNumber = String(raw.number ?? "");
      const name =
        basic.organization_name ||
        [basic.first_name, basic.last_name, basic.credential].filter(Boolean).join(" ") ||
        "Unnamed NPI record";
      return {
        npiNumber,
        providerName: name,
        specialty: taxonomy?.desc ?? "",
        address: location?.address_1 ?? "",
        city: location?.city ?? "",
        state: location?.state ?? "",
        zip: (location?.postal_code ?? "").slice(0, 5),
        phone: location?.telephone_number ?? "",
        enumerationType: raw.enumeration_type ?? "",
        community: byNpi.get(npiNumber) ?? null,
      };
    });
    results.sort((a, b) => (b.community?.communityUpvotes ?? 0) - (a.community?.communityUpvotes ?? 0));
    return NextResponse.json({
      results,
      npiAvailable: true,
      detail: "Live results from the CMS NPI Registry, with community notes overlaid only when the NPI matches.",
    });
  } catch (error) {
    return NextResponse.json({
      results: [],
      npiAvailable: false,
      detail: errorMessage(error),
    });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiProfile();
    if (auth.error) return auth.error;
    const parsed = tagSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "That provider note is missing a 10-digit NPI." }, { status: 400 });
    const existing = await getProviderByNpi(parsed.data.npiNumber);
    const saved = await upsertProvider({
      id: existing?.id ?? newId(),
      npiNumber: parsed.data.npiNumber,
      providerName: parsed.data.providerName,
      specialty: parsed.data.specialty,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      zip: parsed.data.zip,
      phone: parsed.data.phone,
      acceptsDbq: parsed.data.acceptsDbq,
      writesNexusLetters: parsed.data.writesNexusLetters,
      telehealthAvailable: parsed.data.telehealthAvailable,
      avgCostEstimate: parsed.data.avgCostEstimate ?? null,
      communityUpvotes: (existing?.communityUpvotes ?? 0) + 1,
      veteranNotes: parsed.data.veteranNotes || existing?.veteranNotes || "",
    });
    return NextResponse.json({ provider: saved });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
