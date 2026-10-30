import {
  Building2,
  ChartLine,
  CloudSun,
  Construction,
  Droplets,
  Landmark,
  Leaf,
  TrainFront,
  TriangleAlert,
  Wheat,
  Zap,
} from "lucide-react";
import type { CategoryId, Severity } from "./types";

// The eleven filterable categories. Every signal has exactly one; the same
// table drives the left rail, the panel chips, the map markers and the mock
// generator, so those can never drift apart.

export type CategoryGroup = "hazards" | "movement" | "money";

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  group: CategoryGroup;
  // Whether signals in this category normally carry coordinates.
  onMap: boolean;
  covers: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "weather", name: "Weather", icon: CloudSun, group: "hazards", onMap: true, covers: "Forecasts, rainfall, temperature, severe weather" },
  { id: "disasters", name: "Disasters", icon: TriangleAlert, group: "hazards", onMap: true, covers: "Floods, cyclones, earthquakes, fires" },
  { id: "environment", name: "Environment", icon: Leaf, group: "hazards", onMap: true, covers: "Air, climate, forests" },
  { id: "water", name: "Water", icon: Droplets, group: "hazards", onMap: true, covers: "Rivers, reservoirs, water availability" },
  { id: "transport", name: "Transport", icon: TrainFront, group: "movement", onMap: true, covers: "Rail, aviation, roads, ports, mobility" },
  { id: "infrastructure", name: "Infrastructure", icon: Construction, group: "movement", onMap: true, covers: "Roads, railways, airports, ports, projects" },
  { id: "energy", name: "Energy", icon: Zap, group: "movement", onMap: true, covers: "Power, renewables, fuel, grid" },
  { id: "markets", name: "Markets", icon: ChartLine, group: "money", onMap: false, covers: "Equities, indices, commodities" },
  { id: "economy", name: "Economy", icon: Landmark, group: "money", onMap: false, covers: "Indicators, trade, inflation, employment" },
  { id: "government", name: "Government", icon: Building2, group: "money", onMap: false, covers: "Policies, announcements, official releases" },
  { id: "agriculture", name: "Agriculture", icon: Wheat, group: "money", onMap: true, covers: "Crops, sowing, food systems" },
];

export const CATEGORY_GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: "hazards", label: "HAZARDS" },
  { id: "movement", label: "MOVEMENT" },
  { id: "money", label: "MONEY & POLICY" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: CategoryId): CategoryMeta {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`unknown category: ${id}`);
  return found;
}

// Severity colours. Kept as class strings rather than raw hex so both themes
// pick up the right shade, with the map's marker fills given separately.
export const SEVERITY: Record<Severity, { label: string; text: string; bg: string; border: string; marker: string; glow: string }> = {
  critical: {
    label: "CRITICAL",
    text: "text-red-400",
    bg: "bg-red-400",
    border: "border-red-400/40",
    marker: "var(--sev-critical, #f87171)",
    glow: "var(--sev-critical-glow, rgba(248,113,113,0.35))",
  },
  warning: {
    label: "WARNING",
    text: "text-amber-400",
    bg: "bg-amber-400",
    border: "border-amber-400/40",
    marker: "var(--sev-warning, #fbbf24)",
    glow: "var(--sev-warning-glow, rgba(251,191,36,0.32))",
  },
  watch: {
    label: "WATCH",
    text: "text-teal-400",
    bg: "bg-teal-400",
    border: "border-teal-400/40",
    marker: "var(--sev-watch, #2dd4bf)",
    glow: "var(--sev-watch-glow, rgba(45,212,191,0.3))",
  },
};

export const SEVERITY_ORDER: Severity[] = ["critical", "warning", "watch"];

// The teal set used by the shine borders and the scroll-progress bar.
export const SHINE_COLORS = ["#2dd4bf", "#0f766e", "#5eead4"];

// States and union territories, for the region filter.
export const REGIONS = [
  "All India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const TIME_WINDOWS = ["6H", "24H", "7D", "30D"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];
