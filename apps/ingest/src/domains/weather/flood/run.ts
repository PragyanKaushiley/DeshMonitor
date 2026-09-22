import { createDb, getLocationsByTag } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createFloodAdapter } from "./adapter";

async function main() {
  const db = createDb();
  const locations = await getLocationsByTag(db, "river_basin");

  await runWeatherIngestion({
    db,
    dataType: "flood",
    sources: toWeatherSources(locations, "flood"),
    makeAdapter: createFloodAdapter,
  });
}

main().catch((error) => {
  console.error("weather flood ingestion run crashed:", error);
  process.exitCode = 1;
});
