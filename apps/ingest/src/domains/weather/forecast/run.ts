import { createDb, getAllActiveLocations } from "@desh-monitor/db";
import { runWeatherIngestion } from "../runWeather";
import { toWeatherSources } from "../types";
import { createForecastAdapter } from "./adapter";

async function main() {
  const db = createDb();
  const locations = await getAllActiveLocations(db);

  await runWeatherIngestion({
    db,
    dataType: "forecast",
    sources: toWeatherSources(locations, "forecast"),
    makeAdapter: createForecastAdapter,
  });
}

main().catch((error) => {
  console.error("weather forecast ingestion run crashed:", error);
  process.exitCode = 1;
});
