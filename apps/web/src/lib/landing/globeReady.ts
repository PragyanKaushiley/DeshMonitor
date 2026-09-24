// Plain module-level signals between the loader and GlobeScene. Kept out of
// React state on purpose: a state change here re-renders the whole landing
// tree, which landed right on the first frame of the loader's exit animation.

// Lets the loader wait for the WebGL globe (dynamic three import + scene
// build + first frame), not just the fetched assets. The timeout guarantees
// a WebGL failure can never trap the page behind the loader.
const SAFETY_TIMEOUT_MS = 8000;

let ready = false;
const readyListeners = new Set<() => void>();

export function markGlobeReady() {
  if (ready) return;
  ready = true;
  for (const listener of readyListeners) listener();
  readyListeners.clear();
}

export function resetGlobeReady() {
  ready = false;
  introRequested = false;
}

export function whenGlobeReady(): Promise<void> {
  if (ready) return Promise.resolve();
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      readyListeners.delete(done);
      resolve();
    }, SAFETY_TIMEOUT_MS);
    function done() {
      window.clearTimeout(timeoutId);
      resolve();
    }
    readyListeners.add(done);
  });
}

// The loader asks the globe to play its zoom-out intro as its exit begins.
let introRequested = false;
let introHandler: (() => void) | null = null;

export function requestGlobeIntro() {
  introRequested = true;
  introHandler?.();
}

export function onGlobeIntro(handler: (() => void) | null) {
  introHandler = handler;
  if (handler && introRequested) handler();
}
