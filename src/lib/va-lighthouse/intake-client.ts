import "server-only";
import { randomUUID } from "crypto";
import { readSimulatedIntake, saveSimulatedIntake } from "@/db/repository";
import { lighthouseBaseUrl, lighthouseMode, productionSubmitAllowed, type LighthouseMode } from "@/lib/env";
import { sha256Hex } from "@/lib/ids";

export type IntakeFile = { filename: string; bytes: Uint8Array };

export type IntakeRequest = {
  veteranFirstName: string;
  veteranLastName: string;
  fileNumber: string;
  zipCode: string;
  primary: IntakeFile;
  attachments: IntakeFile[];
};

export type IntakeReceipt = {
  guid: string;
  status: string;
  mode: LighthouseMode;
  detail: string;
  sha256: string;
};

export function simulatedStatus(createdAt: number, now = Date.now()): string {
  const seconds = (now - createdAt) / 1000;
  if (seconds < 2) return "pending";
  if (seconds < 5) return "uploaded";
  if (seconds < 10) return "received";
  if (seconds < 20) return "processing";
  if (seconds < 30) return "success";
  return "vbms";
}

function assertSubmitAllowed() {
  const mode = lighthouseMode();
  if (mode === "production" && !productionSubmitAllowed()) {
    throw new Error(
      "Refusing to send documents to production VA. Point VA_LIGHTHOUSE_BASE_URL at the sandbox, or set VA_LIGHTHOUSE_ALLOW_PRODUCTION=true only for a real submission you intend.",
    );
  }
}

export async function submitIntake(input: IntakeRequest): Promise<IntakeReceipt> {
  const sha256 = sha256Hex(input.primary.bytes);
  const mode = lighthouseMode();
  if (mode === "simulation") {
    const guid = `sim_${randomUUID()}`;
    saveSimulatedIntake(guid);
    return {
      guid,
      status: "pending",
      mode,
      sha256,
      detail: "No VA Lighthouse key is configured. This receipt is local only. Nothing was sent to VA.",
    };
  }

  assertSubmitAllowed();
  const base = lighthouseBaseUrl();
  const apiKey = process.env.VA_LIGHTHOUSE_API_KEY as string;
  const opened = await fetch(`${base}/services/vba_documents/v1/uploads`, {
    method: "POST",
    headers: { apikey: apiKey, Accept: "application/json" },
  });
  const openedText = await opened.text();
  if (!opened.ok) {
    throw new Error(`VA intake did not open an upload (${opened.status}). ${openedText.slice(0, 280)}`);
  }
  const openedJson = openedText ? (JSON.parse(openedText) as IntakeOpenResponse) : {};
  const guid = openedJson.data?.id || openedJson.data?.attributes?.guid || "";
  const location =
    openedJson.data?.attributes?.location ||
    opened.headers.get("location") ||
    (guid ? `${base}/services/vba_documents/v1/uploads/${guid}` : "");
  if (!guid || !location) {
    throw new Error("VA intake did not return an upload location.");
  }

  const metadata = {
    veteranFirstName: input.veteranFirstName,
    veteranLastName: input.veteranLastName,
    fileNumber: input.fileNumber,
    zipCode: input.zipCode,
    source: "CommonGround Self-Service",
    docType: "21-10210",
    businessLine: "CMP",
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("content", new Blob([bufferOf(input.primary.bytes)], { type: "application/pdf" }), input.primary.filename);
  input.attachments.forEach((file, index) => {
    form.append(
      `attachment${index + 1}`,
      new Blob([bufferOf(file.bytes)], { type: "application/pdf" }),
      file.filename,
    );
  });

  const uploaded = await fetch(location, {
    method: "PUT",
    headers: {
      apikey: apiKey,
      "X-Checksum-SHA256": sha256,
    },
    body: form,
  });
  if (!uploaded.ok) {
    const detail = await uploaded.text();
    throw new Error(`VA intake upload failed (${uploaded.status}). ${detail.slice(0, 280)}`);
  }

  return {
    guid,
    status: "uploaded",
    mode,
    sha256,
    detail:
      mode === "sandbox"
        ? "Sent to the VA Lighthouse sandbox. A sandbox GUID is not a real claim and not a decision. Confirm anything that matters in your own VA.gov account."
        : "Sent to the VA Lighthouse base URL you configured. Confirm receipt in VA.gov. A GUID is not a decision.",
  };
}

export async function pollIntake(guid: string): Promise<IntakeReceipt> {
  const mode = lighthouseMode();
  if (guid.startsWith("sim_") || mode === "simulation") {
    const known = readSimulatedIntake(guid);
    const createdAt = known?.createdAt ?? Date.now();
    return {
      guid,
      status: simulatedStatus(createdAt),
      mode: "simulation",
      sha256: "",
      detail: "Local simulation. Nothing was sent to VA.",
    };
  }

  const base = lighthouseBaseUrl();
  const response = await fetch(`${base}/services/vba_documents/v1/uploads/${encodeURIComponent(guid)}`, {
    headers: {
      apikey: process.env.VA_LIGHTHOUSE_API_KEY as string,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`VA intake status failed (${response.status}). ${text.slice(0, 280)}`);
  }
  const json = text ? (JSON.parse(text) as IntakeOpenResponse) : {};
  return {
    guid,
    status: json.data?.attributes?.status || "pending",
    mode,
    sha256: "",
    detail: "Status reported by VA Lighthouse. It is not a rating decision.",
  };
}

type IntakeOpenResponse = {
  data?: {
    id?: string;
    attributes?: { guid?: string; location?: string; status?: string };
  };
};

function bufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
