// "देश" (Devanagari) sits next to Latin "Monitor"/"MONITOR" everywhere on
// the site — the display font (Fraunces) has no Devanagari glyphs, so the
// browser silently substitutes a fallback font for just this word, and that
// fallback typically renders visibly shorter than Fraunces' Latin glyphs at
// the same font-size. Bumping the size here (not by guessing at every call
// site) keeps every instance visually balanced with "Monitor" from one
// place. `title` gives a native hover tooltip; no extra dependency needed
// for something this simple, and it works identically inside the loader,
// the WebGL HUD overlay, and plain body copy alike.
export function Desh({ className = "" }: { className?: string }) {
  return (
    <span lang="hi" title="India / Bharat" className={`text-[1.18em] ${className}`}>
      देश
    </span>
  );
}
