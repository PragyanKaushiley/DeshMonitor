"use client";

import { useEffect, useState, type RefObject } from "react";

// True once the page has scrolled `offset` px past the top of `ref`'s
// element. Used to drop the reduced-motion scroll hints (instantly — there
// is no fade to scrub) as soon as the visitor starts scrolling that screen.
export function useScrolledPast(ref: RefObject<HTMLElement | null>, enabled: boolean, offset = 40): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const update = () => setPast(el.getBoundingClientRect().top < -offset);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref, enabled, offset]);

  return past;
}
