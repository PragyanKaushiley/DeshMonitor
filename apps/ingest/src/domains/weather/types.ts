import type { LocationRecord } from "@desh-monitor/db";
import type { SourceLike } from "../../core/types";

export type WeatherDataType = "forecast" | "air_quality" | "seasonal" | "marine" | "flood" | "climate";

/**
 * `fetchId` is set by the adapter's `fetch()` before the HTTP call (the fetches
 * row is created up front so data rows can carry a valid FK), then read back by
 * `normalize()` and by `onSourceComplete`. Mutation is safe here: the runner
 * gives each source object to exactly one concurrent worker.
 */
export interface WeatherSource extends SourceLike {
  location: LocationRecord;
  dataType: WeatherDataType;
  fetchId?: string;
}

export function toWeatherSources(locations: LocationRecord[], dataType: WeatherDataType): WeatherSource[] {
  return locations.map((location) => ({
    id: `${location.id}:${dataType}`,
    url: "", // computed per-adapter from location.latitude/longitude
    location,
    dataType,
  }));
}
