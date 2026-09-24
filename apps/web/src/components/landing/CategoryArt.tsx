import { useId, type ReactNode } from "react";

// Line illustrations for the category bento cards. Drawn in currentColor
// (theme-aware) with teal accents, and faded out towards the card's text.
// News and Government are drawn wide (they span two columns), Weather and
// Markets narrow.

function ArtFrame({ children, viewBox }: { children: ReactNode; viewBox: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[68%] p-3 text-foreground [mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)] md:p-4"
    >
      <svg viewBox={viewBox} preserveAspectRatio="xMaxYMin meet" className="size-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </div>
  );
}

// Tailwind teal-400, the same accent as the cards' shine borders.
const ACCENT = "#2dd4bf";

export function NewsArt() {
  const cards = [
    { x: 150, y: 8, o: 0.35 },
    { x: 118, y: 44, o: 0.6 },
    { x: 86, y: 80, o: 1 },
  ];
  return (
    <ArtFrame viewBox="0 0 400 160">
      {cards.map(({ x, y, o }, i) => (
        <g key={i} opacity={o}>
          <rect x={x} y={y} width={230} height={70} rx={8} fill="var(--card)" stroke="currentColor" strokeOpacity={0.35} />
          <rect x={x + 12} y={y + 12} width={46} height={46} rx={4} stroke={ACCENT} strokeOpacity={0.8} fill={ACCENT} fillOpacity={0.12} />
          <path d={`M${x + 22} ${y + 48} l10 -12 l8 8 l6 -6 l6 10`} stroke={ACCENT} strokeOpacity={0.8} />
          <rect x={x + 70} y={y + 14} width={140} height={7} rx={3.5} fill="currentColor" fillOpacity={0.55} />
          <rect x={x + 70} y={y + 27} width={110} height={7} rx={3.5} fill="currentColor" fillOpacity={0.55} />
          <rect x={x + 70} y={y + 46} width={70} height={5} rx={2.5} fill="currentColor" fillOpacity={0.25} />
          {i === cards.length - 1 && <circle cx={x + 214} cy={y + 14} r={3.5} fill={ACCENT} />}
        </g>
      ))}
    </ArtFrame>
  );
}

export function WeatherArt() {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <ArtFrame viewBox="0 0 200 160">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${118 + i * 16} C 50 ${96 + i * 16}, 90 ${146 + i * 16}, 140 ${120 + i * 16} S 200 ${108 + i * 16}, 210 ${112 + i * 16}`}
          stroke="currentColor"
          strokeOpacity={0.18}
        />
      ))}
      <circle cx={122} cy={44} r={20} stroke={ACCENT} strokeWidth={1.5} />
      {rays.map((a, i) => (
        <line
          key={i}
          x1={122 + Math.cos(a) * 27}
          y1={44 + Math.sin(a) * 27}
          x2={122 + Math.cos(a) * 35}
          y2={44 + Math.sin(a) * 35}
          stroke={ACCENT}
          strokeWidth={1.5}
        />
      ))}
      <path
        d="M58 96 H166 A22 22 0 0 0 160 54 A32 32 0 0 0 100 44 A26 26 0 0 0 58 96 Z"
        fill="var(--card)"
        stroke="currentColor"
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
      {[76, 96, 116, 136, 156].map((x, i) => (
        <line key={x} x1={x} y1={106 + (i % 2) * 6} x2={x - 6} y2={120 + (i % 2) * 6} stroke={ACCENT} strokeOpacity={0.8} strokeWidth={1.5} />
      ))}
    </ArtFrame>
  );
}

export function MarketsArt() {
  const gradientId = useId();
  // Decorative shape only — not real market data.
  const candles = [
    { x: 24, o: 96, c: 84, h: 78, l: 102 },
    { x: 44, o: 86, c: 92, h: 80, l: 98 },
    { x: 64, o: 90, c: 72, h: 66, l: 94 },
    { x: 84, o: 74, c: 80, h: 68, l: 86 },
    { x: 104, o: 78, c: 60, h: 52, l: 82 },
    { x: 124, o: 62, c: 54, h: 46, l: 70 },
    { x: 144, o: 56, c: 64, h: 50, l: 70 },
    { x: 164, o: 60, c: 40, h: 32, l: 64 },
  ];
  const trend = "M14 108 L44 100 L64 92 L84 84 L104 72 L124 62 L144 64 L164 46 L190 34";
  return (
    <ArtFrame viewBox="0 0 200 160">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[30, 60, 90, 120].map((y) => (
        <line key={y} x1={6} y1={y} x2={196} y2={y} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 5" />
      ))}
      <path d={`${trend} L190 150 L14 150 Z`} fill={`url(#${gradientId})`} />
      <path d={trend} stroke={ACCENT} strokeWidth={1.5} />
      {candles.map(({ x, o, c, h, l }) => {
        const up = c < o;
        return (
          <g key={x} stroke={up ? ACCENT : "currentColor"} strokeOpacity={up ? 0.9 : 0.5}>
            <line x1={x} y1={h} x2={x} y2={l} />
            <rect x={x - 4} y={Math.min(o, c)} width={8} height={Math.max(Math.abs(o - c), 2)} rx={1} fill="var(--card)" />
          </g>
        );
      })}
    </ArtFrame>
  );
}

export function GovernmentArt() {
  const columns = [76, 100, 124, 148];
  return (
    <ArtFrame viewBox="0 0 400 160">
      {/* A generic colonnaded building */}
      <g stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.5}>
        <path d="M60 52 L112 22 L164 52 Z" fill="var(--card)" />
        <line x1={60} y1={58} x2={164} y2={58} />
        {columns.map((x) => (
          <line key={x} x1={x} y1={64} x2={x} y2={116} />
        ))}
        <line x1={60} y1={122} x2={164} y2={122} />
        <line x1={52} y1={130} x2={172} y2={130} />
      </g>
      {/* A notification: document with a header band and a stamp */}
      <g>
        <rect x={210} y={14} width={150} height={140} rx={6} fill="var(--card)" stroke="currentColor" strokeOpacity={0.35} />
        <rect x={210} y={14} width={150} height={20} rx={6} fill={ACCENT} fillOpacity={0.18} />
        {[48, 62, 76, 90].map((y, i) => (
          <rect key={y} x={224} y={y} width={i === 3 ? 70 : 118} height={6} rx={3} fill="currentColor" fillOpacity={0.45} />
        ))}
        <circle cx={326} cy={124} r={18} stroke={ACCENT} strokeWidth={1.5} />
        <circle cx={326} cy={124} r={12} stroke={ACCENT} strokeOpacity={0.6} strokeDasharray="2 3" />
        <path d="M319 124 l5 5 l9 -10" stroke={ACCENT} strokeWidth={1.5} />
      </g>
    </ArtFrame>
  );
}
