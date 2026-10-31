"use client";

import { useEffect, useState } from "react";

// The window height the dashboard lays itself out against. It follows width
// changes only: opening the browser's developer tools (or a mobile toolbar
// collapsing) shrinks the height alone, and re-laying the whole dashboard out
// each time made the map jump and shrink. The page scrolls instead.
export function useStageHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    let width = window.innerWidth;
    setHeight(window.innerHeight);
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return height;
}
