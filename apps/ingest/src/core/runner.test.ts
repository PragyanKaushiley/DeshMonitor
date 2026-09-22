import { describe, expect, it } from "vitest";
import { createLogger } from "@desh-monitor/logger";
import { runIngestion } from "./runner";
import type { SourceAdapter, SourceLike } from "./types";

interface FakeSource extends SourceLike {
  shouldFail: boolean;
}

function makeAdapter(rejectOneItem: boolean): SourceAdapter<FakeSource, { valid: boolean }, { valid: boolean }> {
  return {
    async fetch(source) {
      if (source.shouldFail) {
        throw new Error(`fetch failed for ${source.id}`);
      }
      const rawItems = rejectOneItem ? [{ valid: true }, { valid: false }] : [{ valid: true }];
      return { httpStatus: 200, rawItems };
    },
    validate: (item) => item.valid,
    normalize: (item) => item,
    async persist(_source, normalizedItems) {
      return { insertedCount: normalizedItems.length, duplicateCount: 0 };
    },
  };
}

const silentLogger = createLogger({ test: true });

describe("runIngestion", () => {
  it("isolates a failing source without affecting the others", async () => {
    const sources: FakeSource[] = [
      { id: "a", url: "https://a.example", shouldFail: false },
      { id: "b", url: "https://b.example", shouldFail: true },
      { id: "c", url: "https://c.example", shouldFail: false },
    ];

    const results = await runIngestion({
      sources,
      adapter: makeAdapter(false),
      logger: silentLogger,
    });

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.sourceId === "a")?.success).toBe(true);
    expect(results.find((r) => r.sourceId === "b")?.success).toBe(false);
    expect(results.find((r) => r.sourceId === "b")?.errorMessage).toMatch(/fetch failed/);
    expect(results.find((r) => r.sourceId === "c")?.success).toBe(true);
  });

  it("counts rejected items separately from inserted ones", async () => {
    const sources: FakeSource[] = [{ id: "a", url: "https://a.example", shouldFail: false }];

    const [result] = await runIngestion({
      sources,
      adapter: makeAdapter(true),
      logger: silentLogger,
    });

    expect(result?.itemsFound).toBe(2);
    expect(result?.itemsRejected).toBe(1);
    expect(result?.itemsInserted).toBe(1);
  });

  it("invokes onSourceComplete for every source, including failures", async () => {
    const sources: FakeSource[] = [
      { id: "a", url: "https://a.example", shouldFail: false },
      { id: "b", url: "https://b.example", shouldFail: true },
    ];

    const completed: string[] = [];

    await runIngestion({
      sources,
      adapter: makeAdapter(false),
      logger: silentLogger,
      onSourceComplete: async (result) => {
        completed.push(result.sourceId);
      },
    });

    expect(completed.sort()).toEqual(["a", "b"]);
  });
});
