import { createDb, getAllActiveLocations } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createAirQualityAdapter } from "./adapter";

async function main() {
  const db = createDb();
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    dataType: "air_quality",
    sources: toWeatherSources(locations, "air_quality"),
    makeAdapter: createAirQualityAdapter,
  });
}

main().catch((error) => {
  console.error("weather air quality ingestion run crashed:", error);
  process.exitCode = 1;
});
