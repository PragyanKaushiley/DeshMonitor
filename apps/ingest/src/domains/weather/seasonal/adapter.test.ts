import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createSeasonalAdapter } from "./adapter";

const adapter = createSeasonalAdapter(undefined as unknown as Database);

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

const source = { id: "loc-1:seasonal", url: "", location, dataType: "seasonal" as const, fetchId: "fetch-1" };

describe("seasonal adapter", () => {
  it("validates an item with a non-empty dates array", () => {
    expect(adapter.validate({ dates: ["2026-01-01"], daily: {} })).toBe(true);
  });

  it("rejects an item with an empty dates array", () => {
    expect(adapter.validate({ dates: [], daily: {} })).toBe(false);
  });

  it("normalizes into forecastDays count plus the full ensemble as rawPayload", () => {
    const daily = { temperature_2m_max: [1, 2, 3], temperature_2m_max_member01: [1.1, 2.1, 3.1] };
    const row = adapter.normalize({ dates: ["2026-01-01", "2026-01-02", "2026-01-03"], daily }, source);
    expect(row.locationId).toBe("loc-1");
    expect(row.forecastDays).toBe(3);
    expect(row.rawPayload).toEqual(daily);
  });
});
