import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upsertSources, type SourceSeedInput } from "@desh-monitor/db";
import { runScript } from "../../core/logging";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "sources.seed.json");

runScript({ task: "news seed", domain: "news" }, async ({ db, logger }) => {

  const raw = await readFile(SEED_FILE, "utf8");
  const seedSources = JSON.parse(raw) as SourceSeedInput[];

  const result = await upsertSources(db, seedSources);
  logger.info("seeded news sources", { count: result.length });

  await unlink(SEED_FILE);
  logger.info("deleted local seed file (not committed)", { file: SEED_FILE });
});
