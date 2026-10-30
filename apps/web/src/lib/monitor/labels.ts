// Places a name next to every point on the map so no two names sit on top of
// each other, or on top of another point. Pure geometry in the map's own
// drawing units, so it can be checked without a browser.

export interface LabelPoint {
  key: string;
  text: string;
  x: number;
  y: number;
}

export interface PlacedLabel {
  key: string;
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const GAP = 16; // from the point's centre to the text
const MARKER = 16; // half-size of the box a point occupies
const CHAR_WIDTH = 0.58; // average glyph width, as a fraction of the font size

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

// Points should be given most important first: they pick their spot first, so
// the least important name is the one that has to move or overlap.
export function layoutLabels(
  points: LabelPoint[],
  fontSize: number,
  bounds: { width: number; height: number },
): PlacedLabel[] {
  const height = fontSize * 1.1;
  const markers: Box[] = points.map((p) => ({ x0: p.x - MARKER, y0: p.y - MARKER, x1: p.x + MARKER, y1: p.y + MARKER }));
  const placed: Box[] = [];

  return points.map((point, index) => {
    const width = point.text.length * fontSize * CHAR_WIDTH;
    const candidates: { anchor: PlacedLabel["anchor"]; x: number; y: number }[] = [
      { anchor: "start", x: point.x + GAP, y: point.y + height * 0.3 },
      { anchor: "end", x: point.x - GAP, y: point.y + height * 0.3 },
      { anchor: "middle", x: point.x, y: point.y - GAP },
      { anchor: "middle", x: point.x, y: point.y + GAP + height * 0.8 },
      { anchor: "start", x: point.x + GAP * 0.7, y: point.y - GAP * 0.8 },
      { anchor: "end", x: point.x - GAP * 0.7, y: point.y - GAP * 0.8 },
      { anchor: "start", x: point.x + GAP * 0.7, y: point.y + GAP + height * 0.6 },
      { anchor: "end", x: point.x - GAP * 0.7, y: point.y + GAP + height * 0.6 },
      // A second ring, for crowded places: further out, but still beside it.
      { anchor: "start", x: point.x + GAP, y: point.y - height * 0.9 },
      { anchor: "start", x: point.x + GAP, y: point.y + height * 1.5 },
      { anchor: "end", x: point.x - GAP, y: point.y - height * 0.9 },
      { anchor: "end", x: point.x - GAP, y: point.y + height * 1.5 },
      { anchor: "middle", x: point.x, y: point.y - GAP - height * 1.1 },
      { anchor: "middle", x: point.x, y: point.y + GAP + height * 1.9 },
    ];

    let best = candidates[0]!;
    let bestBox: Box | null = null;
    let bestCost = Infinity;

    for (const c of candidates) {
      const x0 = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - width : c.x - width / 2;
      const box: Box = { x0, x1: x0 + width, y0: c.y - height * 0.8, y1: c.y + height * 0.25 };

      let cost = 0;
      for (const other of placed) cost += overlap(box, other);
      markers.forEach((marker, i) => {
        if (i !== index) cost += overlap(box, marker);
      });
      // Running off the drawing is worse than a little overlap.
      const outside = Math.max(0, -box.x0) + Math.max(0, box.x1 - bounds.width) + Math.max(0, -box.y0) + Math.max(0, box.y1 - bounds.height);
      cost += outside * height * 4;

      if (cost < bestCost) {
        best = c;
        bestBox = box;
        bestCost = cost;
        if (cost === 0) break;
      }
    }

    if (bestBox) placed.push(bestBox);
    return { key: point.key, text: point.text, x: best.x, y: best.y, anchor: best.anchor };
  });
}
