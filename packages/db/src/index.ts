export { createDb } from "./client";
export type { Database } from "./client";
export * as rawNewsSchema from "./schema/rawNews";
export {
  upsertSources,
  getActiveSources,
  insertItems,
  recordFetch,
} from "./repositories/news";
export type {
  SourceSeedInput,
  SourceRecord,
  NewsItemInput,
  FetchRecordInput,
} from "./repositories/news";
export * as rawWeatherSchema from "./schema/rawWeather";
export {
  upsertLocations,
  getLocationsByTag,
  getAllActiveLocations,
  updateLocationElevation,
  startFetch,
  completeFetch,
  insertObservation,
  insertForecastDays,
  insertAirQuality,
  insertSeasonalForecast,
  insertMarineForecast,
  insertFloodDays,
  upsertClimateProjectionDays,
} from "./repositories/weather";
export type {
  LocationSeedInput,
  LocationRecord,
  StartFetchInput,
  CompleteFetchInput,
  ObservationInput,
  ForecastDayInput,
  AirQualityInput,
  SeasonalForecastInput,
  MarineForecastInput,
  FloodDayInput,
  ClimateProjectionDayInput,
} from "./repositories/weather";
export * as appSchema from "./schema/app";
export { createUser, getUserByEmail, getUserById } from "./repositories/users";
export type { UserRecord, CreateUserInput } from "./repositories/users";
