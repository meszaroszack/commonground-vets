import "server-only";
import { readLocalFile, saveLocalFile } from "@/db/repository";
import { isStorageConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function putBytes(path: string, bytes: Uint8Array, contentType: string) {
  if (isStorageConfigured()) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.storage.from("evidence-vault").upload(path, bytes, {
        contentType,
        upsert: true,
      });
      if (!error) return { location: "supabase" as const };
      console.error("evidence vault upload failed", error.message);
    } catch (error) {
      console.error("evidence vault upload failed", error instanceof Error ? error.message : "unknown");
    }
  }
  saveLocalFile(path, bytes);
  return { location: "local" as const };
}

export async function getBytes(path: string): Promise<Uint8Array | null> {
  const local = readLocalFile(path);
  if (local) return local;
  if (!isStorageConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from("evidence-vault").download(path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch (error) {
    console.error("evidence vault download failed", error instanceof Error ? error.message : "unknown");
    return null;
  }
}
