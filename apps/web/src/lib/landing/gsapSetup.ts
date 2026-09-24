import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // The landing page always restarts from the top on reload (see app/page.tsx).
  // ScrollTrigger re-applies the history.scrollRestoration it saw at startup
  // ("auto") on every refresh, which silently undid the page's own "manual"
  // and let reloads land mid-sequence; setting it through ScrollTrigger keeps
  // it, and clears ScrollTrigger's own recorded scroll positions too.
  ScrollTrigger.clearScrollMemory("manual");
}

export { gsap, ScrollTrigger };
