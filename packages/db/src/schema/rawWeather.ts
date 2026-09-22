import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const rawWeatherSchema = pgSchema("raw_weather");

export const locations = rawWeatherSchema.table("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  elevationM: doublePrecision("elevation_m"),
  tags: text("tags").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fetches = rawWeatherSchema.table("fetches", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  dataType: text("data_type").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  httpStatus: integer("http_status"),
  success: boolean("success").notNull(),
  recordsFound: integer("records_found").notNull().default(0),
  recordsInserted: integer("records_inserted").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const observations = rawWeatherSchema.table("observations", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  temperatureC: doublePrecision("temperature_c"),
  relativeHumidityPct: doublePrecision("relative_humidity_pct"),
  apparentTemperatureC: doublePrecision("apparent_temperature_c"),
  precipitationMm: doublePrecision("precipitation_mm"),
  weatherCode: integer("weather_code"),
  windSpeedKmh: doublePrecision("wind_speed_kmh"),
  windDirectionDeg: doublePrecision("wind_direction_deg"),
  surfacePressureHpa: doublePrecision("surface_pressure_hpa"),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forecasts = rawWeatherSchema.table("forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  targetDate: date("target_date").notNull(),
  weatherCode: integer("weather_code"),
  temperatureMaxC: doublePrecision("temperature_max_c"),
  temperatureMinC: doublePrecision("temperature_min_c"),
  precipitationSumMm: doublePrecision("precipitation_sum_mm"),
  precipitationProbabilityPct: doublePrecision("precipitation_probability_pct"),
  windSpeedMaxKmh: doublePrecision("wind_speed_max_kmh"),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const airQuality = rawWeatherSchema.table("air_quality", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  pm10: doublePrecision("pm10"),
  pm2_5: doublePrecision("pm2_5"),
  carbonMonoxide: doublePrecision("carbon_monoxide"),
  nitrogenDioxide: doublePrecision("nitrogen_dioxide"),
  sulphurDioxide: doublePrecision("sulphur_dioxide"),
  ozone: doublePrecision("ozone"),
  usAqi: integer("us_aqi"),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasonalForecasts = rawWeatherSchema.table("seasonal_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  forecastDays: integer("forecast_days").notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marineForecasts = rawWeatherSchema.table("marine_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  waveHeightM: doublePrecision("wave_height_m"),
  waveDirectionDeg: doublePrecision("wave_direction_deg"),
  wavePeriodS: doublePrecision("wave_period_s"),
  dailyWaveHeightMax: jsonb("daily_wave_height_max").notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const floodForecasts = rawWeatherSchema.table("flood_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  fetchId: uuid("fetch_id")
    .notNull()
    .references(() => fetches.id),
  targetDate: date("target_date").notNull(),
  riverDischargeM3s: doublePrecision("river_discharge_m3s"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const climateProjections = rawWeatherSchema.table(
  "climate_projections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    model: text("model").notNull(),
    date: date("date").notNull(),
    temperatureMaxC: doublePrecision("temperature_max_c"),
    temperatureMinC: doublePrecision("temperature_min_c"),
    precipitationSumMm: doublePrecision("precipitation_sum_mm"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("climate_projections_location_model_date_key").on(table.locationId, table.model, table.date)],
);
