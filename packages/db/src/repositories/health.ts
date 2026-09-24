import { sql } from "drizzle-orm";
import type { Database } from "../client";

// A trivial round trip, for health checks: throws if the database can't be
// reached or the query fails.
export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
