"use client";

import { useEffect, useState } from "react";

// The dashboard renders one layout or the other, never both: they share a
// scroll container ref and would otherwise each mount a map and a full
// signals list. Starts null — "not known yet" — so the server and first client
// render agree and the caller can show a skeleton instead of guessing a layout.
//
// The side-by-side layout (rail, map, a 300-odd-pixel column of cards) needs a
// laptop-sized screen; at 768px (an iPad mini, or any tablet in portrait) it cut
// off values, headers and the search box. Below 1024px the single column,
// which has the room, is used.
export function useIsDesktop(query = "(min-width: 1024px)"): boolean | null {
  const [desktop, setDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);

  return desktop;
}
