// Enumerated domain values shared across every workspace. Each constant is
// declared once, as a readonly tuple, so both the runtime array and the
// derived union type stay in sync by construction — there is exactly one
// place that lists "the six categories" or "the 36 states," never two
// lists that can silently drift apart.

/** The six editorial categories news items are ingested into. */
export const CATEGORIES = [
  "national",
  "business",
  "finance",
  "technology",
  "sports",
  "entertainment",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Source language, matching the database's CHECK (language IN (...)). */
export const LANGUAGES = ["en", "hi"] as const;

export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

/**
 * A shared time window, used by every endpoint that can be scoped to
 * "recent" vs "all time" — keeping this in one place is what lets a map's
 * per-state counts and the feed a click into that state opens describe
 * the same window, instead of two different endpoints each picking their
 * own default.
 */
export const TIME_RANGES = ["24h", "all"] as const;

export type TimeRange = (typeof TIME_RANGES)[number];

export function isTimeRange(value: string): value is TimeRange {
  return (TIME_RANGES as readonly string[]).includes(value);
}

/**
 * India's 28 states and 8 union territories. A news item's `state` is one
 * of these, or `null` when no state was confidently detected (treated as
 * "national" everywhere in the UI).
 */
export const STATES = [
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
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type State = (typeof STATES)[number];

export function isState(value: string): value is State {
  return (STATES as readonly string[]).includes(value);
}
