import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

/** Lazily-created singleton pool — apps/ingest is a normal Node process
 * (a GitHub Actions job), so a real, pooled TCP connection is the right
 * tool here (contrast apps/api, which runs on an edge runtime with no
 * raw sockets and uses an HTTP-based driver instead — see
 * performance-and-scaling guideline on matching DB access to the runtime). */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
