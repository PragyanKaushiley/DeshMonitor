import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createMarineAdapter } from "./adapter";

const adapter = createMarineAdapter(undefined as unknown as Database);

const location: LocationRecord = {
  id: "loc-1",
  slug: "test-coastal-city",
  name: "Test Coastal City",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
  elevationM: 2,
  tags: ["coastal"],
  isActive: true,
};

const source = { id: "loc-1:marine", url: "", location, dataType: "marine" as const, fetchId: "fetch-1" };

describe("marine adapter", () => {
  it("validates an item with a time field", () => {
    expect(adapter.validate({ time: "2026-01-01T00:00", dailyWaveHeightMax: [], raw: {} })).toBe(true);
  });

  it("normalizes wave fields and keeps the daily array", () => {
    const dailyWaveHeightMax = [{ date: "2026-01-01", value: 1.2 }];
    const row = adapter.normalize(
      { time: "2026-01-01T00:00", wave_height: 0.8, wave_direction: 200, dailyWaveHeightMax, raw: { x: 1 } },
      source,
    );
    expect(row.locationId).toBe("loc-1");
    expect(row.waveHeightM).toBe(0.8);
    expect(row.waveDirectionDeg).toBe(200);
    expect(row.dailyWaveHeightMax).toEqual(dailyWaveHeightMax);
  });
});
