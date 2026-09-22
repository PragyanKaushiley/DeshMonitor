import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { loadEnv } from "@desh-monitor/config";
import * as schema from "./schema/rawNews";

export function createDb(databaseUrl?: string) {
  const url = databaseUrl ?? loadEnv().DATABASE_URL;
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
