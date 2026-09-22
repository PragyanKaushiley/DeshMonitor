import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, upsertLocations, type LocationSeedInput } from "@desh-monitor/db";
import { createLogger } from "@desh-monitor/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "locations.seed.json");

async function main() {
  const logger = createLogger({ app: "ingest", domain: "weather", task: "seed" });

  const raw = await readFile(SEED_FILE, "utf8");
  const seedLocations = JSON.parse(raw) as LocationSeedInput[];

  const db = createDb();
  const result = await upsertLocations(db, seedLocations);
  logger.info("seeded weather locations", { count: result.length });

  await unlink(SEED_FILE);
  logger.info("deleted local seed file (not committed)", { file: SEED_FILE });
}

main().catch((error) => {
  console.error("weather location seeding failed:", error);
  process.exitCode = 1;
});
