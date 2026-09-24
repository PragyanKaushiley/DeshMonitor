export interface LoadResult {
  src: string;
  ok: boolean;
}

function loadImage(src: string): Promise<LoadResult> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ src, ok: true });
    img.onerror = () => resolve({ src, ok: false });
    img.src = src;
    // Already-cached images can resolve `complete` synchronously — lets a
    // returning visitor's loader finish near-instantly instead of waiting a
    // tick, per the "no artificial delay on cached visits" requirement.
    if (img.complete) resolve({ src, ok: true });
  });
}

// One fetch + parse per data file, shared by the loader and GlobeScene.
const jsonCache = new Map<string, Promise<unknown>>();

export function fetchJson<T = unknown>(src: string): Promise<T> {
  let pending = jsonCache.get(src);
  if (!pending) {
    pending = fetch(src).then((res) => {
      if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
      return res.json();
    });
    // Don't cache failures — a later caller may retry.
    pending.catch(() => jsonCache.delete(src));
    jsonCache.set(src, pending);
  }
  return pending as Promise<T>;
}

async function loadData(src: string): Promise<LoadResult> {
  try {
    await fetchJson(src);
    return { src, ok: true };
  } catch {
    return { src, ok: false };
  }
}

export async function fontsReady(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.ready;
  } catch {
    // Font Loading API is best-effort — never block the loader on it.
  }
}

export interface LoadAssetsOptions {
  assets: { src: string; type?: "image" | "font" | "data" }[];
  onSettled?: (result: LoadResult) => void;
}

export async function loadAssets({ assets, onSettled }: LoadAssetsOptions): Promise<LoadResult[]> {
  return Promise.all(
    assets.map(async (asset) => {
      const result = asset.type === "data" ? await loadData(asset.src) : await loadImage(asset.src);
      onSettled?.(result);
      return result;
    }),
  );
}
