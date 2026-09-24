import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upsertLocations, type LocationSeedInput } from "@desh-monitor/db";
import { runScript } from "../../core/logging";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "locations.seed.json");

runScript({ task: "weather seed", domain: "weather" }, async ({ db, logger }) => {

  const raw = await readFile(SEED_FILE, "utf8");
  const seedLocations = JSON.parse(raw) as LocationSeedInput[];

  const result = await upsertLocations(db, seedLocations);
  logger.info("seeded weather locations", { count: result.length });

  await unlink(SEED_FILE);
  logger.info("deleted local seed file (not committed)", { file: SEED_FILE });
});
