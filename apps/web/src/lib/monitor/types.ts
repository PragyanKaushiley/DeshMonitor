// Shapes the dashboard renders. Everything here is satisfied today by the
// mock generator in mock.ts; a real API can replace it by implementing
// MonitorSource without the components changing.

export const CATEGORY_IDS = [
  "weather",
  "disasters",
  "markets",
  "economy",
  "government",
  "infrastructure",
  "energy",
  "environment",
  "agriculture",
  "water",
  "transport",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

// How serious the finding is. Drives colour everywhere: marker, dot, chip.
export type Severity = "critical" | "warning" | "watch";

// What a signal is built from. News is not a category — it is evidence, and
// most signals carry some.
export type EvidenceKind = "news" | "weather" | "traffic" | "official" | "sensor" | "market";

export interface Evidence {
  kind: EvidenceKind;
  label: string;
  count?: number;
}

export interface Headline {
  outlet: string;
  title: string;
  minutesAgo: number;
}

export interface SignalAction {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface TimelineEntry {
  time: string;
  severity: Severity;
  text: string;
}

export interface Signal {
  id: string;
  category: CategoryId;
  // Other categories this touches — shown as secondary chips, never as a
  // second home for the signal.
  tags: CategoryId[];
  severity: Severity;
  title: string;
  summary: string;
  place: string;
  state: string;
  // Null for nationwide signals: no map marker, an "ALL INDIA" tag instead.
  lat: number | null;
  lng: number | null;
  confidence: number;
  evidence: Evidence[];
  headlines: Headline[];
  // Points for the detail charts, in the unit named by seriesLabel.
  series: { label: string; value: number }[];
  seriesLabel: string;
  actions: SignalAction[];
  timeline: TimelineEntry[];
  createdAt: number;
  updatedAt: number;
}

// The small cards in the "MORE DATA" carousel. One per data family, each
// carrying whichever shape that family is published in.
export type DataCardId =
  | "markets"
  | "economy"
  | "weather"
  | "environment"
  | "water"
  | "energy"
  | "transport"
  | "agriculture"
  | "disasters";

export interface DataRow {
  label: string;
  value: number;
  // Percentage change, where the family publishes one.
  change?: number;
  // A secondary string, e.g. a city or a time.
  note?: string;
}

export interface DataCard {
  id: DataCardId;
  title: string;
  meta: string;
  // Headline figure, where the family has one.
  headline?: { value: string; change?: number };
  rows: DataRow[];
  // Points for a sparkline / bar / line chart, depending on the card.
  series: number[];
  unit?: string;
}

export interface FeedEvent {
  type: "new" | "update";
  signal: Signal;
}

// The boundary a real API would implement. The dashboard talks only to this.
export interface MonitorSource {
  initialSignals(): Signal[];
  subscribe(onEvent: (event: FeedEvent) => void): () => void;
  dataCards(): DataCard[];
  subscribeCards(onUpdate: (cards: DataCard[]) => void): () => void;
}
