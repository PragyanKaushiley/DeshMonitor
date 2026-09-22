import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, upsertSources, type SourceSeedInput } from "@desh-monitor/db";
import { createLogger } from "@desh-monitor/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "sources.seed.json");

async function main() {
  const logger = createLogger({ app: "ingest", domain: "news", task: "seed" });

  const raw = await readFile(SEED_FILE, "utf8");
  const seedSources = JSON.parse(raw) as SourceSeedInput[];

  const db = createDb();
  const result = await upsertSources(db, seedSources);
  logger.info("seeded news sources", { count: result.length });

  await unlink(SEED_FILE);
  logger.info("deleted local seed file (not committed)", { file: SEED_FILE });
}

main().catch((error) => {
  console.error("news source seeding failed:", error);
  process.exitCode = 1;
});
