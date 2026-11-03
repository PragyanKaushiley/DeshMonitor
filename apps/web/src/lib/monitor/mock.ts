import type {
  CategoryId,
  DataCard,
  Evidence,
  FeedEvent,
  MonitorSource,
  Severity,
  Signal,
} from "./types";

// Sample data for the dashboard — plausible Indian places, sources and
// numbers, none of it real. Everything is generated after mount (see
// useMonitorFeed) so the server and the first client render agree.

let seq = 0;
const id = () => `sig-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;
const int = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const num = (min: number, max: number, dp = 1) => Number((Math.random() * (max - min) + min).toFixed(dp));

interface Place {
  place: string;
  state: string;
  lat: number;
  lng: number;
}

const PLACES: Record<string, Place> = {
  mumbai: { place: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  delhi: { place: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
  chennai: { place: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  kolkata: { place: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  bengaluru: { place: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  hyderabad: { place: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  ahmedabad: { place: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  pune: { place: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  jaipur: { place: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  lucknow: { place: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  patna: { place: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  guwahati: { place: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  bhubaneswar: { place: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  kochi: { place: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  nagpur: { place: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  jodhpur: { place: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243 },
  bhuj: { place: "Bhuj", state: "Gujarat", lat: 23.242, lng: 69.6669 },
  dehradun: { place: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  nashik: { place: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898 },
  ludhiana: { place: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573 },
  visakhapatnam: { place: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  nhavasheva: { place: "Nhava Sheva", state: "Maharashtra", lat: 18.9490, lng: 72.9525 },
  konkan: { place: "Konkan coast", state: "Maharashtra", lat: 17.0, lng: 73.3 },
  odishacoast: { place: "Odisha coast", state: "Odisha", lat: 19.8, lng: 85.9 },
  navimumbai: { place: "Navi Mumbai", state: "Maharashtra", lat: 19.033, lng: 73.0297 },
};

const ALL_INDIA = { place: "All India", state: "All India", lat: null, lng: null };

const OUTLETS = [
  "The Hindu",
  "Indian Express",
  "Times of India",
  "Hindustan Times",
  "Livemint",
  "NDTV",
  "India Today",
  "Business Standard",
  "The Telegraph",
  "Deccan Herald",
];

// Outlets cover the same story from slightly different angles, so the
// evidence list doesn't read as the same sentence three times.
const ANGLES = [
  (t: string) => t,
  (t: string) => `${t}: what we know so far`,
  (t: string) => `Officials respond as ${t.charAt(0).toLowerCase()}${t.slice(1)}`,
  (t: string) => `${t} — live updates`,
  (t: string) => `Explained: ${t.charAt(0).toLowerCase()}${t.slice(1)}`,
];

function headlines(title: string) {
  const outlets = [...OUTLETS].sort(() => Math.random() - 0.5).slice(0, int(3, 4));
  const angles = [...ANGLES].sort(() => Math.random() - 0.5);
  return outlets
    .map((outlet, i) => ({
      outlet,
      title: (angles[i] ?? ANGLES[0])!(title),
      minutesAgo: int(2, 180),
    }))
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
}

function newsEvidence(): Evidence {
  const articles = int(6, 38);
  return { kind: "news", label: `${articles} articles · ${int(4, 14)} outlets`, count: articles };
}

interface Template {
  category: CategoryId;
  tags: CategoryId[];
  severity: Severity[];
  places: (Place | typeof ALL_INDIA)[];
  build: (p: Place | typeof ALL_INDIA) => {
    title: string;
    summary: string;
    evidence: Evidence[];
    series: { label: string; value: number }[];
    seriesLabel: string;
    actions: Signal["actions"];
  };
}

const hours = (n: number) => Array.from({ length: n }, (_, i) => `${String((i + 1) * Math.floor(24 / n)).padStart(2, "0")}:00`);
const series = (n: number, min: number, max: number) =>
  hours(n).map((label) => ({ label, value: num(min, max, 0) }));

const P = (k: string) => PLACES[k] as Place;

const TEMPLATES: Template[] = [
  {
    category: "weather",
    tags: ["disasters", "water"],
    severity: ["critical", "warning"],
    places: [P("mumbai"), P("konkan"), P("kochi"), P("nagpur")],
    build: (p) => ({
      title: `Red alert: extreme rain in ${p.place}`,
      summary: `IMD expects ${int(150, 260)} mm in the next 24 hours, with waterlogging likely on low-lying roads.`,
      evidence: [newsEvidence(), { kind: "weather", label: "IMD red alert" }, { kind: "official", label: "State control room advisory" }],
      series: series(8, 5, 60),
      seriesLabel: "RAINFALL, MM PER 3H",
      actions: [
        { icon: "phone", title: "Disaster helpline", subtitle: "1916", href: "tel:1916" },
        { icon: "train", title: "Local train status", subtitle: "Live running information", href: "#" },
        { icon: "map", title: "Roads to avoid", subtitle: "Waterlogging reports", href: "#" },
      ],
    }),
  },
  {
    category: "weather",
    tags: ["energy", "environment"],
    severity: ["warning", "watch"],
    places: [P("jodhpur"), P("nagpur"), P("jaipur")],
    build: (p) => ({
      title: `${p.place} crosses ${num(44, 47)}°C`,
      summary: `A heat spell is forecast to hold for ${int(2, 5)} more days, with peak power demand climbing alongside it.`,
      evidence: [newsEvidence(), { kind: "weather", label: "IMD heat advisory" }, { kind: "sensor", label: "Grid-India load data" }],
      series: series(8, 34, 47),
      seriesLabel: "TEMPERATURE, °C",
      actions: [
        { icon: "shield", title: "Heat advisory", subtitle: "State health department", href: "#" },
        { icon: "zap", title: "Power demand", subtitle: "Grid-India live", href: "#" },
      ],
    }),
  },
  {
    category: "disasters",
    tags: ["water", "transport"],
    severity: ["critical"],
    places: [P("mumbai"), P("chennai"), P("patna"), P("guwahati")],
    build: (p) => ({
      title: `${p.place} is flooded`,
      summary: `Water is standing on arterial roads after ${int(90, 220)} mm overnight; suburban services are running late.`,
      evidence: [newsEvidence(), { kind: "official", label: "NDRF deployment" }, { kind: "traffic", label: "Road speed collapse" }],
      series: series(8, 10, 70),
      seriesLabel: "WATER LEVEL, CM",
      actions: [
        { icon: "phone", title: "Disaster helpline", subtitle: "1916", href: "tel:1916" },
        { icon: "map", title: "Roads to avoid", subtitle: "Live waterlogging map", href: "#" },
      ],
    }),
  },
  {
    category: "disasters",
    tags: ["weather", "transport"],
    severity: ["critical", "warning"],
    places: [P("odishacoast"), P("konkan"), P("visakhapatnam")],
    build: (p) => ({
      title: `Cyclone ${pick(["Remal", "Biparjoy", "Asani", "Midhili"])} to hit ${p.place} by ${pick(["Tuesday", "Wednesday", "Thursday", "Friday"])}`,
      summary: `Landfall is expected with winds of ${int(90, 150)} km/h; fishing has been suspended along the coast.`,
      evidence: [newsEvidence(), { kind: "weather", label: "IMD cyclone bulletin" }, { kind: "official", label: "Evacuation order" }],
      series: series(8, 40, 150),
      seriesLabel: "WIND SPEED, KM/H",
      actions: [
        { icon: "shield", title: "Evacuation centres", subtitle: "District administration", href: "#" },
        { icon: "phone", title: "Disaster helpline", subtitle: "1077", href: "tel:1077" },
      ],
    }),
  },
  {
    category: "disasters",
    tags: [],
    severity: ["warning", "watch"],
    places: [P("bhuj"), P("dehradun"), P("guwahati")],
    build: (p) => ({
      title: `M${num(4.1, 5.4, 1)} tremor near ${p.place}`,
      summary: `The National Centre for Seismology recorded a shallow quake; no damage has been reported so far.`,
      evidence: [newsEvidence(), { kind: "sensor", label: "NCS seismograph network" }],
      series: series(6, 1, 5),
      seriesLabel: "AFTERSHOCKS, PER HOUR",
      actions: [{ icon: "shield", title: "Safety guidance", subtitle: "NDMA", href: "#" }],
    }),
  },
  {
    category: "markets",
    tags: ["economy"],
    severity: ["warning", "watch"],
    places: [ALL_INDIA],
    build: () => ({
      title: `NIFTY falls ${num(1, 2)}% on ${pick(["global cues", "IT earnings", "crude prices", "foreign outflows"])}`,
      summary: `Selling was broad based, with banking and IT leading the decline through the afternoon session.`,
      evidence: [newsEvidence(), { kind: "market", label: "NSE end-of-day" }],
      series: series(8, 22800, 23400),
      seriesLabel: "NIFTY 50",
      actions: [{ icon: "chart", title: "NSE market summary", subtitle: "Official end-of-day", href: "#" }],
    }),
  },
  {
    category: "economy",
    tags: ["government"],
    severity: ["watch", "warning"],
    places: [ALL_INDIA],
    build: () => ({
      title: `Retail inflation rises to ${num(4.5, 6.4)}%`,
      summary: `Food prices led the increase, keeping the headline number above the mid-point of the RBI's band.`,
      evidence: [newsEvidence(), { kind: "official", label: "MoSPI release" }],
      series: series(6, 4, 7),
      seriesLabel: "CPI, % YEAR ON YEAR",
      actions: [{ icon: "chart", title: "MoSPI release", subtitle: "Consumer price index", href: "#" }],
    }),
  },
  {
    category: "government",
    tags: ["economy"],
    severity: ["watch"],
    places: [ALL_INDIA, P("lucknow"), P("bengaluru")],
    build: (p) =>
      p.place === "All India"
        ? {
            title: `RBI holds repo rate at ${num(6.0, 6.5, 2)}%`,
            summary: `The monetary policy committee kept its stance unchanged, citing food price risks.`,
            evidence: [newsEvidence(), { kind: "official", label: "RBI policy statement" }],
            series: series(6, 6, 6.6),
            seriesLabel: "REPO RATE, %",
            actions: [{ icon: "file", title: "RBI statement", subtitle: "Monetary policy", href: "#" }],
          }
        : {
            title: `${p.state} announces ${pick(["a housing scheme", "an EV subsidy", "a crop insurance top-up", "a metro extension"])}`,
            summary: `The cabinet cleared the proposal; the notification is expected within a fortnight.`,
            evidence: [newsEvidence(), { kind: "official", label: "PIB release" }],
            series: series(6, 10, 90),
            seriesLabel: "OUTLAY, ₹ BILLION",
            actions: [{ icon: "file", title: "PIB release", subtitle: "Official announcement", href: "#" }],
          },
  },
  {
    category: "infrastructure",
    tags: ["transport"],
    severity: ["watch", "warning"],
    places: [P("mumbai"), P("delhi"), P("navimumbai")],
    build: (p) => ({
      title: pick([`${p.place} expressway section opens`, `${p.place} airport runway closed for repairs`]),
      summary: `Traffic is being diverted while work continues; the authority expects normal operations within ${int(2, 10)} days.`,
      evidence: [newsEvidence(), { kind: "official", label: "AAI notice to airmen" }, { kind: "traffic", label: "Diversion in place" }],
      series: series(8, 20, 90),
      seriesLabel: "TRAFFIC INDEX",
      actions: [{ icon: "map", title: "Diversion map", subtitle: "Traffic police", href: "#" }],
    }),
  },
  {
    category: "energy",
    tags: ["weather"],
    severity: ["warning", "watch"],
    places: [P("delhi"), P("chennai"), P("lucknow")],
    build: (p) => ({
      title: pick([`Peak power demand hits record ${int(230, 260)} GW`, `Outage across parts of ${p.place}`]),
      summary: `Load is running well above the seasonal average, with the grid operator calling on reserve capacity.`,
      evidence: [newsEvidence(), { kind: "sensor", label: "Grid-India load curve" }],
      series: series(8, 180, 255),
      seriesLabel: "DEMAND, GW",
      actions: [{ icon: "zap", title: "Grid-India dashboard", subtitle: "National load", href: "#" }],
    }),
  },
  {
    category: "environment",
    tags: ["weather", "agriculture"],
    severity: ["critical", "warning"],
    places: [P("delhi"), P("lucknow"), P("ludhiana")],
    build: (p) => ({
      title: `${p.place} air turns severe (AQI ${int(320, 460)})`,
      summary: `Calm winds have trapped pollutants near the surface; the advisory asks people to limit outdoor activity.`,
      evidence: [newsEvidence(), { kind: "sensor", label: "CPCB monitoring stations" }, { kind: "official", label: "GRAP stage advisory" }],
      series: series(8, 180, 460),
      seriesLabel: "AQI",
      actions: [
        { icon: "shield", title: "CPCB air quality", subtitle: "Live station data", href: "#" },
        { icon: "file", title: "Health advisory", subtitle: "State pollution board", href: "#" },
      ],
    }),
  },
  {
    category: "agriculture",
    tags: ["economy", "weather"],
    severity: ["watch", "warning"],
    places: [P("nashik"), P("ludhiana"), P("nagpur")],
    build: (p) => ({
      title: pick([`Kharif sowing ${num(3, 12)}% behind last year`, `Onion prices jump ${int(12, 40)}% in ${p.place} mandi`]),
      summary: `Arrivals have thinned after unseasonal rain, pushing wholesale rates up through the week.`,
      evidence: [newsEvidence(), { kind: "official", label: "Agmarknet mandi prices" }],
      series: series(7, 900, 3200),
      seriesLabel: "PRICE, ₹ PER QUINTAL",
      actions: [{ icon: "chart", title: "Mandi prices", subtitle: "Agmarknet", href: "#" }],
    }),
  },
  {
    category: "water",
    tags: ["disasters", "agriculture"],
    severity: ["critical", "warning", "watch"],
    places: [P("patna"), P("guwahati"), P("bengaluru")],
    build: (p) => ({
      title: pick([
        `${pick(["Ganga", "Brahmaputra", "Yamuna", "Kosi"])} above danger mark at ${p.place}`,
        `${pick(["Krishnarajasagar", "Bhakra", "Tehri", "Hirakud"])} reservoir at ${int(24, 88)}% capacity`,
      ]),
      summary: `The Central Water Commission is watching levels hourly; low-lying villages have been alerted.`,
      evidence: [newsEvidence(), { kind: "sensor", label: "CWC gauge readings" }],
      series: series(8, 40, 100),
      seriesLabel: "LEVEL, % OF DANGER MARK",
      actions: [{ icon: "map", title: "CWC flood forecast", subtitle: "Gauge network", href: "#" }],
    }),
  },
  {
    category: "transport",
    tags: ["weather", "infrastructure"],
    severity: ["warning", "watch"],
    places: [P("mumbai"), P("delhi"), P("nhavasheva")],
    build: (p) => ({
      title: pick([
        `${int(2, 5)} in 10 ${p.place} flights delayed`,
        `${pick(["Harbour", "Western", "Central"])} line local trains suspended`,
        `${p.place} berth delays build up`,
      ]),
      summary: `Knock-on delays are spreading through the evening peak as crews and rakes fall out of position.`,
      evidence: [newsEvidence(), { kind: "sensor", label: "AAI on-time performance" }, { kind: "traffic", label: "Station crowding" }],
      series: series(8, 5, 60),
      seriesLabel: "DELAYED DEPARTURES, %",
      actions: [
        { icon: "train", title: "Live train status", subtitle: "Suburban network", href: "#" },
        { icon: "map", title: "Airport advisory", subtitle: "Check before you leave", href: "#" },
      ],
    }),
  },
];

function timelineFor(severity: Severity): Signal["timeline"] {
  const now = Date.now();
  const steps = int(3, 4);
  return Array.from({ length: steps }, (_, i) => {
    const at = new Date(now - (steps - i) * int(25, 90) * 60_000);
    return {
      time: at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }),
      severity: i === steps - 1 ? severity : pick(["watch", "warning"] as Severity[]),
      text: pick([
        "First reports picked up from news sources",
        "Official advisory issued",
        "Sensor readings crossed the alert threshold",
        "Coverage widened across outlets",
        "Severity raised after fresh readings",
      ]),
    };
  });
}

function makeSignal(template = pick(TEMPLATES)): Signal {
  const place = pick(template.places);
  const severity = pick(template.severity);
  const built = template.build(place);
  const createdAt = Date.now() - int(1, 220) * 60_000;
  return {
    id: id(),
    category: template.category,
    tags: template.tags,
    severity,
    title: built.title,
    summary: built.summary,
    place: place.place,
    state: place.state,
    lat: place.lat,
    lng: place.lng,
    confidence: int(58, 96),
    evidence: built.evidence,
    headlines: headlines(built.title),
    series: built.series,
    seriesLabel: built.seriesLabel,
    actions: built.actions,
    timeline: timelineFor(severity),
    createdAt,
    updatedAt: createdAt + int(1, 40) * 60_000,
  };
}

function initialSignals(): Signal[] {
  // One from each of nine different templates, so the first screen shows a
  // spread of categories rather than four floods.
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5).slice(0, int(8, 10));
  return shuffled
    .map((t) => makeSignal(t))
    .sort((a, b) => b.createdAt - a.createdAt);
}

const CITY_AQI = ["Delhi", "Lucknow", "Patna", "Kolkata", "Mumbai"];
const CITY_RAIN = ["Mumbai", "Kochi", "Chennai", "Guwahati", "Bhopal"];
const RESERVOIRS = ["Bhakra", "Hirakud", "Tehri", "Nagarjuna", "KRS"];
const AIRPORTS = [
  { code: "BOM", city: "Mumbai" },
  { code: "DEL", city: "Delhi" },
  { code: "BLR", city: "Bengaluru" },
  { code: "MAA", city: "Chennai" },
  { code: "HYD", city: "Hyderabad" },
];

function makeCards(): DataCard[] {
  return [
    {
      id: "markets",
      title: "MARKETS",
      meta: "NSE · LIVE",
      headline: { value: num(22800, 23600, 2).toLocaleString("en-IN"), change: num(-1.4, 1.4, 2) },
      rows: [
        { label: "SENSEX", value: num(74000, 77000, 2), change: num(-1.5, 1.5, 2) },
        { label: "USD/INR", value: num(82.5, 84.5, 2), change: num(-0.4, 0.4, 2) },
        { label: "GOLD", value: num(68000, 74000, 0), change: num(-1, 1.6, 2) },
      ],
      series: Array.from({ length: 24 }, () => num(22800, 23600, 0)),
      unit: "NIFTY 50",
    },
    {
      id: "economy",
      title: "ECONOMY",
      meta: "MoSPI",
      rows: [
        { label: "CPI INFLATION", value: num(4.4, 6.3, 2), change: num(-0.4, 0.5, 2), note: "% y/y" },
        { label: "IIP GROWTH", value: num(2, 8, 1), change: num(-1.2, 1.4, 2), note: "% y/y" },
        { label: "TRADE BALANCE", value: num(-26, -14, 1), change: num(-2, 2, 2), note: "$ bn" },
      ],
      series: Array.from({ length: 12 }, () => num(4, 7, 1)),
    },
    {
      id: "weather",
      title: "RAIN OUTLOOK",
      meta: "IMD · NEXT 24H",
      rows: CITY_RAIN.map((city) => ({ label: city, value: num(0, 180, 0), note: "mm" })),
      series: [],
      unit: "mm",
    },
    {
      id: "environment",
      title: "AIR QUALITY",
      meta: "CPCB",
      rows: CITY_AQI.map((city) => ({ label: city, value: int(60, 460) })),
      series: [],
      unit: "AQI",
    },
    {
      id: "water",
      title: "RESERVOIRS",
      meta: "CWC",
      rows: RESERVOIRS.map((name) => ({ label: name, value: int(18, 96), note: "% full" })),
      series: [],
      unit: "%",
    },
    {
      id: "energy",
      title: "PEAK DEMAND",
      meta: "GRID-INDIA",
      headline: { value: `${num(198, 252, 1)} GW`, change: num(-2, 3, 1) },
      rows: [],
      series: Array.from({ length: 24 }, (_, i) => num(140 + Math.sin((i / 24) * Math.PI * 2) * 40, 250, 0)),
      unit: "GW",
    },
    {
      id: "transport",
      title: "FLIGHT DELAYS",
      meta: "AAI",
      rows: AIRPORTS.map((a) => ({ label: a.code, value: int(4, 46), note: a.city })),
      series: [],
      unit: "% delayed",
    },
    {
      id: "agriculture",
      title: "MANDI PRICES",
      meta: "AGMARKNET",
      rows: [
        { label: "ONION", value: int(1200, 3400), change: num(-8, 22, 1), note: "₹/qtl" },
        { label: "TOMATO", value: int(900, 4200), change: num(-14, 28, 1), note: "₹/qtl" },
        { label: "WHEAT", value: int(2100, 2700), change: num(-3, 6, 1), note: "₹/qtl" },
      ],
      series: [],
    },
    {
      id: "disasters",
      title: "RECENT QUAKES",
      meta: "NCS",
      rows: [
        { label: "Bhuj, Gujarat", value: num(3.2, 5.4, 1), note: `${int(20, 300)} min ago` },
        { label: "Chamoli, Uttarakhand", value: num(2.8, 4.6, 1), note: `${int(60, 600)} min ago` },
        { label: "Kohima, Nagaland", value: num(3.0, 4.9, 1), note: `${int(120, 900)} min ago` },
      ],
      series: [],
      unit: "M",
    },
  ];
}

// Nudges a number by a small random amount, keeping it inside bounds.
function walk(value: number, pct: number, min = -Infinity, max = Infinity, dp = 2): number {
  const next = value * (1 + (Math.random() * 2 - 1) * pct);
  return Number(Math.min(max, Math.max(min, next)).toFixed(dp));
}

export function createMockSource(): MonitorSource {
  let cards = makeCards();

  return {
    initialSignals,

    subscribe(onEvent) {
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        timer = setTimeout(() => {
          // Mostly new signals, occasionally a revision to one already shown.
          if (Math.random() < 0.75) {
            onEvent({ type: "new", signal: makeSignal() });
          } else {
            const signal = makeSignal();
            onEvent({ type: "update", signal });
          }
          tick();
        }, int(6000, 12000));
      };
      tick();
      return () => clearTimeout(timer);
    },

    dataCards: () => cards,

    subscribeCards(onUpdate) {
      const timer = setInterval(
        () => {
          cards = cards.map((card) => {
            const next: DataCard = {
              ...card,
              rows: card.rows.map((row) => ({
                ...row,
                // Negative figures (the trade balance) stay negative.
                value: walk(row.value, 0.02, row.value < 0 ? -Infinity : 0, row.value < 0 ? 0 : Infinity, Math.abs(row.value) > 100 ? 0 : 2),
                ...(row.change === undefined ? {} : { change: walk(row.change || 0.1, 0.3, -30, 30, 1) }),
              })),
              series: card.series.map((v) => walk(v, 0.01, 0, Infinity, 0)),
            };
            // Only the families that publish a headline figure have one.
            if (card.headline) {
              next.headline = { value: card.headline.value, change: walk(card.headline.change ?? 0.1, 0.35, -3, 3, 2) };
            }
            return next;
          });
          onUpdate(cards);
        },
        int(3000, 5000),
      );
      return () => clearInterval(timer);
    },
  };
}

export type { FeedEvent };
