import { createDb, getAllActiveLocations } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createSeasonalAdapter } from "./adapter";

async function main() {
  const db = createDb();
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    dataType: "seasonal",
    sources: toWeatherSources(locations, "seasonal"),
    makeAdapter: createSeasonalAdapter,
  });
}

main().catch((error) => {
  console.error("weather seasonal ingestion run crashed:", error);
  process.exitCode = 1;
});
