export async function runWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  worker: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= items.length) return;

    results[index] = await worker(items[index] as TItem, index);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);

  return results;
}
