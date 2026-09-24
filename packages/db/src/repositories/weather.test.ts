import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { climateProjections, fetches, forecasts, locations } from "../schema/rawWeather";
import {
  completeFetch,
  getLocationsByTag,
  insertForecastDays,
  startFetch,
  upsertClimateProjectionDays,
  upsertLocations,
} from "./weather";

loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("weather repository (integration)", () => {
  const createdLocationIds: string[] = [];

  // Test locations are active, so leaving them behind would make real
  // weather runs fetch them.
  afterAll(async () => {
    if (createdLocationIds.length === 0) return;
    const db = createDb();
    await db.delete(forecasts).where(inArray(forecasts.locationId, createdLocationIds));
    await db.delete(climateProjections).where(inArray(climateProjections.locationId, createdLocationIds));
    await db.delete(fetches).where(inArray(fetches.locationId, createdLocationIds));
    await db.delete(locations).where(inArray(locations.id, createdLocationIds));
  });

  it("upserts a location, tags it, and finds it by tag", async () => {
    const db = createDb();
    const slug = `test-location-${randomUUID()}`;

    const [location] = await upsertLocations(db, [
      { slug, name: "Test Location", region: "Test Region", latitude: 1, longitude: 2, tags: ["coastal"] },
    ]);
    expect(location).toBeDefined();
    if (!location) throw new Error("expected location to be created");
    createdLocationIds.push(location.id);

    const coastal = await getLocationsByTag(db, "coastal");
    expect(coastal.some((l) => l.id === location.id)).toBe(true);

    const [updated] = await upsertLocations(db, [
      { slug, name: "Test Location Renamed", region: "Test Region", latitude: 1, longitude: 2, tags: ["coastal"] },
    ]);
    expect(updated?.id).toBe(location.id);
    expect(updated?.name).toBe("Test Location Renamed");
  });

  it("starts and completes a fetch record, then inserts forecast days without dedup", async () => {
    const db = createDb();
    const slug = `test-location-${randomUUID()}`;
    const [location] = await upsertLocations(db, [
      { slug, name: "Test Location", region: "Test Region", latitude: 1, longitude: 2, tags: ["major_city"] },
    ]);
    if (!location) throw new Error("expected location to be created");
    createdLocationIds.push(location.id);

    const fetchId = await startFetch(db, { locationId: location.id, dataType: "forecast", startedAt: new Date() });
    expect(typeof fetchId).toBe("string");

    const firstRun = await insertForecastDays(db, [
      {
        locationId: location.id,
        fetchId,
        targetDate: "2026-01-01",
        temperatureMaxC: 30,
        rawPayload: { date: "2026-01-01" },
      },
    ]);
    expect(firstRun).toBe(1);

    // A second "run" issuing a forecast for the same target date is independent
    // evidence (the prediction may have changed) — it must NOT be deduped away.
    const fetchId2 = await startFetch(db, { locationId: location.id, dataType: "forecast", startedAt: new Date() });
    const secondRun = await insertForecastDays(db, [
      {
        locationId: location.id,
        fetchId: fetchId2,
        targetDate: "2026-01-01",
        temperatureMaxC: 31,
        rawPayload: { date: "2026-01-01" },
      },
    ]);
    expect(secondRun).toBe(1);

    await expect(
      completeFetch(db, fetchId, {
        finishedAt: new Date(),
        durationMs: 100,
        httpStatus: 200,
        success: true,
        recordsFound: 1,
        recordsInserted: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it("upserts climate projection days — a re-fetch of the same date updates, not duplicates", async () => {
    const db = createDb();
    const slug = `test-location-${randomUUID()}`;
    const [location] = await upsertLocations(db, [
      { slug, name: "Test Location", region: "Test Region", latitude: 1, longitude: 2, tags: ["capital"] },
    ]);
    if (!location) throw new Error("expected location to be created");
    createdLocationIds.push(location.id);

    const first = await upsertClimateProjectionDays(db, [
      { locationId: location.id, model: "TEST_MODEL", date: "2020-06-01", temperatureMaxC: 30 },
    ]);
    expect(first).toEqual({ insertedCount: 1, updatedCount: 0 });

    const second = await upsertClimateProjectionDays(db, [
      { locationId: location.id, model: "TEST_MODEL", date: "2020-06-01", temperatureMaxC: 31 },
    ]);
    expect(second).toEqual({ insertedCount: 0, updatedCount: 1 });
  });
});
