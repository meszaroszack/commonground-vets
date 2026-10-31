import "server-only";
import { lighthouseBaseUrl, lighthouseMode, productionSubmitAllowed, type LighthouseMode } from "@/lib/env";

export type ClaimSummary = {
  id: string;
  status: string;
  phase: string;
};

export type ClaimsSnapshot = {
  mode: LighthouseMode;
  claims: ClaimSummary[];
  intentToFile: { status: string; expirationDate: string | null } | null;
  detail: string;
};

export async function listClaims(veteranId: string): Promise<ClaimsSnapshot> {
  const mode = lighthouseMode();
  if (mode === "simulation") {
    return {
      mode,
      claims: [],
      intentToFile: null,
      detail:
        "No VA Lighthouse key is configured, so no claim status was requested. Record an Intent to File date you already filed on VA.gov, or add a sandbox key to read sandbox data.",
    };
  }

  const base = lighthouseBaseUrl();
  const headers = { apikey: process.env.VA_LIGHTHOUSE_API_KEY as string, Accept: "application/json" };
  const claimsResponse = await fetch(
    `${base}/services/claims/v2/veterans/${encodeURIComponent(veteranId)}/claims`,
    { headers },
  );
  const claimsText = await claimsResponse.text();
  if (!claimsResponse.ok) {
    throw new Error(`VA claims status failed (${claimsResponse.status}). ${claimsText.slice(0, 280)}`);
  }
  const claimsJson = claimsText ? (JSON.parse(claimsText) as ClaimsResponse) : {};
  const claims = (claimsJson.data ?? []).map((item) => ({
    id: item.id ?? "unknown",
    status: item.attributes?.status ?? "unknown",
    phase: item.attributes?.phase ?? item.attributes?.claimPhaseDates?.phaseChangeDate ?? "",
  }));

  let intentToFile: ClaimsSnapshot["intentToFile"] = null;
  const itfResponse = await fetch(
    `${base}/services/claims/v1/veterans/${encodeURIComponent(veteranId)}/intent-to-file/compensation`,
    { headers },
  );
  if (itfResponse.ok) {
    const itfJson = (await itfResponse.json()) as ItfResponse;
    const attributes = itfJson.data?.attributes;
    intentToFile = {
      status: attributes?.status ?? "on file",
      expirationDate: attributes?.expirationDate ?? null,
    };
  }

  return {
    mode,
    claims,
    intentToFile,
    detail: "Reported by VA Lighthouse. Confirm anything that changes your plans on VA.gov.",
  };
}

export async function createIntentToFile(veteranId: string): Promise<{
  mode: LighthouseMode;
  filedDate: string;
  expirationDate: string;
  detail: string;
}> {
  const filed = new Date();
  const expiration = new Date(filed);
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 1);
  const mode = lighthouseMode();
  if (mode === "simulation") {
    return {
      mode,
      filedDate: filed.toISOString(),
      expirationDate: expiration.toISOString(),
      detail:
        "Saved a local Intent to File countdown only. Nothing was filed with VA. File the real Intent to File yourself on VA.gov if you want the effective date.",
    };
  }
  if (mode === "production" && !productionSubmitAllowed()) {
    throw new Error("Refusing to file a production Intent to File without VA_LIGHTHOUSE_ALLOW_PRODUCTION=true.");
  }

  const response = await fetch(
    `${lighthouseBaseUrl()}/services/claims/v1/veterans/${encodeURIComponent(veteranId)}/intent-to-file`,
    {
      method: "POST",
      headers: {
        apikey: process.env.VA_LIGHTHOUSE_API_KEY as string,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { type: "intent_to_file", attributes: { type: "compensation" } },
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`VA Intent to File failed (${response.status}). ${text.slice(0, 280)}`);
  }
  const json = text ? (JSON.parse(text) as ItfResponse) : {};
  return {
    mode,
    filedDate: json.data?.attributes?.creationDate ?? filed.toISOString(),
    expirationDate: json.data?.attributes?.expirationDate ?? expiration.toISOString(),
    detail:
      mode === "sandbox"
        ? "Sandbox Intent to File request completed. This does not protect a real effective date."
        : "Intent to File request was sent to the VA base URL you configured. Confirm it on VA.gov.",
  };
}

type ClaimsResponse = {
  data?: Array<{
    id?: string;
    attributes?: { status?: string; phase?: string; claimPhaseDates?: { phaseChangeDate?: string } };
  }>;
};

type ItfResponse = {
  data?: { attributes?: { status?: string; expirationDate?: string; creationDate?: string } };
};
