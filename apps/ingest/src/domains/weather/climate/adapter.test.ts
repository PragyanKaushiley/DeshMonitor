import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createClimateAdapter } from "./adapter";
import { CLIMATE_MODEL } from "../openMeteo";

const adapter = createClimateAdapter(undefined as unknown as Database);

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

const source = { id: "loc-1:climate", url: "", location, dataType: "climate" as const, fetchId: "fetch-1" };

describe("climate adapter", () => {
  it("validates an item with a date", () => {
    expect(adapter.validate({ date: "2020-01-01" })).toBe(true);
  });

  it("normalizes into a (location, model, date) row, not fetch-scoped", () => {
    const row = adapter.normalize(
      { date: "2020-01-01", temperature_2m_max: 30, temperature_2m_min: 15, precipitation_sum: 0 },
      source,
    );
    expect(row.locationId).toBe("loc-1");
    expect(row.model).toBe(CLIMATE_MODEL);
    expect(row.date).toBe("2020-01-01");
    expect(row.temperatureMaxC).toBe(30);
    expect("fetchId" in row).toBe(false);
  });
});
