import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createAirQualityAdapter } from "./adapter";

const adapter = createAirQualityAdapter(undefined as unknown as Database);

const location: LocationRecord = {
  id: "loc-1",
  slug: "test-city",
  name: "Test City",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
  elevationM: null,
  tags: ["major_city"],
  isActive: true,
};

const source = { id: "loc-1:air_quality", url: "", location, dataType: "air_quality" as const, fetchId: "fetch-1" };

describe("air quality adapter", () => {
  it("validates an item with a time field", () => {
    expect(adapter.validate({ time: "2026-01-01T00:00", pm2_5: 40 })).toBe(true);
  });

  it("rejects an item missing time", () => {
    expect(adapter.validate({ time: "" })).toBe(false);
  });

  it("normalizes pm2_5/pm10/us_aqi into the row shape", () => {
    const row = adapter.normalize({ time: "2026-01-01T00:00", pm10: 100, pm2_5: 45, us_aqi: 150 }, source);
    expect(row.locationId).toBe("loc-1");
    expect(row.fetchId).toBe("fetch-1");
    expect(row.pm10).toBe(100);
    expect(row.pm2_5).toBe(45);
    expect(row.usAqi).toBe(150);
  });

  it("maps missing fields to null", () => {
    const row = adapter.normalize({ time: "2026-01-01T00:00" }, source);
    expect(row.pm10).toBeNull();
    expect(row.ozone).toBeNull();
  });
});
