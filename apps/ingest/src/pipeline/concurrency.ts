/**
 * Run `tasks` with at most `limit` running concurrently. Hand-rolled
 * rather than a dependency (`p-limit` and similar) — this is a small
 * enough piece of logic that a dependency isn't justified for it
 * (dependency-management guideline), and it has no external inputs that
 * make it risky to get right in-house.
 */
export async function runWithConcurrencyLimit<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
