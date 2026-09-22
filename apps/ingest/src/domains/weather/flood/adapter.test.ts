import { describe, expect, it } from "vitest";
import type { Database, LocationRecord } from "@desh-monitor/db";
import { createFloodAdapter } from "./adapter";

const adapter = createFloodAdapter(undefined as unknown as Database);

const location: LocationRecord = {
  id: "loc-1",
  slug: "test-river-city",
  name: "Test River City",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
  elevationM: 50,
  tags: ["river_basin"],
  isActive: true,
};

const source = { id: "loc-1:flood", url: "", location, dataType: "flood" as const, fetchId: "fetch-1" };

describe("flood adapter", () => {
  it("validates an item with a date", () => {
    expect(adapter.validate({ date: "2026-01-01", river_discharge: 120 })).toBe(true);
  });

  it("rejects an item missing a date", () => {
    expect(adapter.validate({ date: "" })).toBe(false);
  });

  it("normalizes river_discharge into targetDate rows, one per day", () => {
    const row = adapter.normalize({ date: "2026-01-05", river_discharge: 88.5 }, source);
    expect(row.locationId).toBe("loc-1");
    expect(row.fetchId).toBe("fetch-1");
    expect(row.targetDate).toBe("2026-01-05");
    expect(row.riverDischargeM3s).toBe(88.5);
  });

  it("maps a missing discharge value to null", () => {
    const row = adapter.normalize({ date: "2026-01-05" }, source);
    expect(row.riverDischargeM3s).toBeNull();
  });
});
