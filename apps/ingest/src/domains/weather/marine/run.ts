import { createDb, getLocationsByTag } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createMarineAdapter } from "./adapter";

async function main() {
  const db = createDb();
  const locations = await getLocationsByTag(db, "coastal");

  await runWeatherIngestion({
    db,
    dataType: "marine",
    sources: toWeatherSources(locations, "marine"),
    makeAdapter: createMarineAdapter,
  });
}

main().catch((error) => {
  console.error("weather marine ingestion run crashed:", error);
  process.exitCode = 1;
});
