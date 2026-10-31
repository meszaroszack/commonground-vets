import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { isDatabaseConfigured } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let cached: Database | null | undefined;

export function getDb(): Database | null {
  if (cached !== undefined) return cached;
  if (!isDatabaseConfigured()) {
    cached = null;
    return null;
  }
  const url = process.env.DATABASE_URL as string;
  const local = /localhost|127\.0\.0\.1/.test(url);
  const client = postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local ? false : "require",
    prepare: false,
  });
  cached = drizzle(client, { schema });
  return cached;
}
