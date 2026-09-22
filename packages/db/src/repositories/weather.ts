import { and, arrayContains, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import {
  airQuality,
  climateProjections,
  fetches,
  floodForecasts,
  forecasts,
  locations,
  marineForecasts,
  observations,
  seasonalForecasts,
} from "../schema/rawWeather";

export interface LocationSeedInput {
  slug: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  tags: string[];
}

export interface LocationRecord {
  id: string;
  slug: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  tags: string[];
  isActive: boolean;
}

export async function upsertLocations(db: Database, rows: LocationSeedInput[]): Promise<LocationRecord[]> {
  if (rows.length === 0) return [];

  return db
    .insert(locations)
    .values(rows)
    .onConflictDoUpdate({
      target: locations.slug,
      set: {
        name: sql`excluded.name`,
        region: sql`excluded.region`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        tags: sql`excluded.tags`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
}

export async function getLocationsByTag(db: Database, tag: string): Promise<LocationRecord[]> {
  return db
    .select()
    .from(locations)
    .where(and(eq(locations.isActive, true), arrayContains(locations.tags, [tag])));
}

export async function getAllActiveLocations(db: Database): Promise<LocationRecord[]> {
  return db.select().from(locations).where(eq(locations.isActive, true));
}

export async function updateLocationElevation(db: Database, locationId: string, elevationM: number): Promise<void> {
  await db
    .update(locations)
    .set({ elevationM, updatedAt: new Date() })
    .where(and(eq(locations.id, locationId), sql`${locations.elevationM} is null`));
}

export interface StartFetchInput {
  locationId: string;
  dataType: string;
  startedAt: Date;
}

export async function startFetch(db: Database, input: StartFetchInput): Promise<string> {
  const [row] = await db
    .insert(fetches)
    .values({
      locationId: input.locationId,
      dataType: input.dataType,
      startedAt: input.startedAt,
      success: false,
    })
    .returning({ id: fetches.id });

  if (!row) throw new Error("failed to start fetch record");
  return row.id;
}

export interface CompleteFetchInput {
  finishedAt: Date;
  durationMs: number;
  httpStatus?: number | null;
  success: boolean;
  recordsFound: number;
  recordsInserted: number;
  errorMessage?: string | null;
}

export async function completeFetch(db: Database, fetchId: string, input: CompleteFetchInput): Promise<void> {
  await db
    .update(fetches)
    .set({
      finishedAt: input.finishedAt,
      durationMs: input.durationMs,
      httpStatus: input.httpStatus ?? null,
      success: input.success,
      recordsFound: input.recordsFound,
      recordsInserted: input.recordsInserted,
      errorMessage: input.errorMessage ?? null,
    })
    .where(eq(fetches.id, fetchId));
}

export type ObservationInput = typeof observations.$inferInsert;
export type ForecastDayInput = typeof forecasts.$inferInsert;
export type AirQualityInput = typeof airQuality.$inferInsert;
export type SeasonalForecastInput = typeof seasonalForecasts.$inferInsert;
export type MarineForecastInput = typeof marineForecasts.$inferInsert;
export type FloodDayInput = typeof floodForecasts.$inferInsert;
export type ClimateProjectionDayInput = typeof climateProjections.$inferInsert;

export async function insertObservation(db: Database, row: ObservationInput): Promise<void> {
  await db.insert(observations).values(row);
}

export async function insertForecastDays(db: Database, rows: ForecastDayInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await db.insert(forecasts).values(rows).returning({ id: forecasts.id });
  return inserted.length;
}

export async function insertAirQuality(db: Database, row: AirQualityInput): Promise<void> {
  await db.insert(airQuality).values(row);
}

export async function insertSeasonalForecast(db: Database, row: SeasonalForecastInput): Promise<void> {
  await db.insert(seasonalForecasts).values(row);
}

export async function insertMarineForecast(db: Database, row: MarineForecastInput): Promise<void> {
  await db.insert(marineForecasts).values(row);
}

export async function insertFloodDays(db: Database, rows: FloodDayInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await db.insert(floodForecasts).values(rows).returning({ id: floodForecasts.id });
  return inserted.length;
}

export async function upsertClimateProjectionDays(
  db: Database,
  rows: ClimateProjectionDayInput[],
): Promise<{ insertedCount: number; updatedCount: number }> {
  if (rows.length === 0) return { insertedCount: 0, updatedCount: 0 };

  const result = await db
    .insert(climateProjections)
    .values(rows)
    .onConflictDoUpdate({
      target: [climateProjections.locationId, climateProjections.model, climateProjections.date],
      set: {
        temperatureMaxC: sql`excluded.temperature_max_c`,
        temperatureMinC: sql`excluded.temperature_min_c`,
        precipitationSumMm: sql`excluded.precipitation_sum_mm`,
        fetchedAt: sql`now()`,
      },
    })
    .returning({ wasInsert: sql<boolean>`(xmax = 0)` });

  const insertedCount = result.filter((r) => r.wasInsert).length;
  return { insertedCount, updatedCount: result.length - insertedCount };
}
