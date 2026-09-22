import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createForecastAdapter } from "./adapter";

// validate()/normalize() don't touch the DB — only fetch()/persist() do — so a
// real Database instance is unnecessary for these tests.
const adapter = createForecastAdapter(undefined as unknown as Database);

const location: LocationRecord = {
  id: "loc-1",
  slug: "test-city",
  name: "Test City",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
  elevationM: 5,
  tags: ["capital"],
  isActive: true,
};

const source = { id: "loc-1:forecast", url: "", location, dataType: "forecast" as const, fetchId: "fetch-1" };

describe("forecast adapter validate", () => {
  it("accepts a valid current item", () => {
    expect(adapter.validate({ kind: "current", time: "2026-01-01T00:00", temperature_2m: 25 })).toBe(true);
  });

  it("rejects a current item missing time", () => {
    expect(adapter.validate({ kind: "current", time: "", temperature_2m: 25 })).toBe(false);
  });

  it("accepts a valid daily item", () => {
    expect(adapter.validate({ kind: "daily", date: "2026-01-01" })).toBe(true);
  });

  it("rejects a daily item missing date", () => {
    expect(adapter.validate({ kind: "daily", date: "" })).toBe(false);
  });
});

describe("forecast adapter normalize", () => {
  it("normalizes a current item into an observation row", () => {
    const result = adapter.normalize(
      { kind: "current", time: "2026-01-01T00:00", temperature_2m: 25, relative_humidity_2m: 60 },
      source,
    );
    expect(result.kind).toBe("current");
    if (result.kind === "current") {
      expect(result.row.locationId).toBe("loc-1");
      expect(result.row.fetchId).toBe("fetch-1");
      expect(result.row.temperatureC).toBe(25);
      expect(result.row.relativeHumidityPct).toBe(60);
    }
  });

  it("normalizes a daily item into a forecast-day row", () => {
    const result = adapter.normalize(
      { kind: "daily", date: "2026-01-02", temperature_2m_max: 30, temperature_2m_min: 20 },
      source,
    );
    expect(result.kind).toBe("daily");
    if (result.kind === "daily") {
      expect(result.row.targetDate).toBe("2026-01-02");
      expect(result.row.temperatureMaxC).toBe(30);
      expect(result.row.temperatureMinC).toBe(20);
    }
  });

  it("maps missing optional fields to null, not undefined", () => {
    const result = adapter.normalize({ kind: "daily", date: "2026-01-03" }, source);
    if (result.kind === "daily") {
      expect(result.row.temperatureMaxC).toBeNull();
      expect(result.row.weatherCode).toBeNull();
    }
  });
});
