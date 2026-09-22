import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./concurrency";

describe("runWithConcurrency", () => {
  it("returns results in the original order", async () => {
    const items = [3, 1, 2];
    const results = await runWithConcurrency(items, 2, async (item) => item * 10);
    expect(results).toEqual([30, 10, 20]);
  });

  it("never runs more than the given limit at once", async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("propagates a worker's error to the caller (isolation is the caller's job)", async () => {
    await expect(
      runWithConcurrency([1, 2, 3], 3, async (item) => {
        if (item === 2) throw new Error("boom");
        return item;
      }),
    ).rejects.toThrow("boom");
  });
});
