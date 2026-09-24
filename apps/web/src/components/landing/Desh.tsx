// "देश" (Devanagari) sits next to Latin "Monitor"/"MONITOR" everywhere on
// the site — the display font (Fraunces) has no Devanagari glyphs, so the
// browser silently substitutes a fallback font for just this word, and that
// fallback typically renders visibly shorter than Fraunces' Latin glyphs at
// the same font-size. Bumping the size here (not by guessing at every call
// site) keeps every instance visually balanced with "Monitor" from one
// place. `title` gives a native hover tooltip; no extra dependency needed
// for something this simple, and it works identically inside the loader,
// the WebGL HUD overlay, and plain body copy alike.
// `explain` adds the meaning as screen-reader text too, since the `title`
// tooltip is hover-only (unreachable by keyboard and touch). Use it on the
// main heading only, so it isn't read out at every occurrence.
export function Desh({ className = "", explain = false }: { className?: string; explain?: boolean }) {
  return (
    <>
      {/* tracking-normal: letter-spacing inherited from spaced-out caps
          (nav, CTA, loader) splits Devanagari's joining headline bar, making
          "दे" and "श" look like separate words. */}
      <span lang="hi" title="India / Bharat" className={`text-[1.18em] tracking-normal ${className}`}>
        देश
      </span>
      {explain && <span className="sr-only"> (India / Bharat)</span>}
    </>
  );
}
