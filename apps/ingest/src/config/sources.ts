// The full source list. UNVERIFIED as of this rewrite — this environment
// has no network path to any of these domains (proxy allowlist blocks
// them, see scripts/verify-sources.sh's own header comment), so every
// entry below is a candidate picked from general knowledge of each
// publisher's known RSS conventions, not a URL confirmed against a live
// response. Per data-sourcing-standards guideline: do not treat this
// list as trustworthy until scripts/verify-sources.sh has actually been
// run (from a real terminal, not this sandbox) and every row confirmed
// as real feed XML, not a redirect, a landing page, or a bot-protection
// wall. Update SOURCES_VERIFICATION.md with the real results once that's
// done, and fix or drop any entry that doesn't check out — don't guess a
// replacement URL for one that fails.

import type { Category, Language, State } from "@deshmonitor/shared-types";

export interface SourceConfig {
  /** Stable slug — used as raw.news_items.source_id / raw.source_meta.source_id. */
  id: string;
  name: string;
  url: string;
  category: Category;
  language: Language;
  /**
   * Set only when a source is inherently state/city-specific, to skip
   * keyword text analysis entirely for its items (tier-1 geo-tagging).
   * Unused today (every current source is a national outlet) but wired
   * through the pipeline for the first state-specific source added.
   */
  defaultState?: State;
}

export const SOURCES: SourceConfig[] = [
  // National / Politics
  { id: "toi-top-stories", name: "Times of India Top Stories", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", category: "national", language: "en" },
  { id: "ndtv-top-stories", name: "NDTV Top Stories", url: "https://feeds.feedburner.com/ndtvnews-top-stories", category: "national", language: "en" },
  { id: "hindustantimes-india-news", name: "Hindustan Times India News", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", category: "national", language: "en" },
  { id: "pib-press-releases", name: "PIB Press Releases", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1", category: "national", language: "en" },
  { id: "google-news-national", name: "Google News - India, National", url: "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en", category: "national", language: "en" },

  // Business
  { id: "moneycontrol-business", name: "Moneycontrol Business", url: "https://www.moneycontrol.com/rss/business.xml", category: "business", language: "en" },
  { id: "business-standard-latest", name: "Business Standard Latest", url: "https://www.business-standard.com/rss/latest.rss", category: "business", language: "en" },
  { id: "livemint-companies", name: "LiveMint Companies", url: "https://www.livemint.com/rss/companies", category: "business", language: "en" },
  { id: "economictimes-industry", name: "Economic Times Industry", url: "https://economictimes.indiatimes.com/industry/rssfeeds/13358071.cms", category: "business", language: "en" },
  { id: "google-news-business", name: "Google News - India, Business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en", category: "business", language: "en" },

  // Finance
  { id: "moneycontrol-markets", name: "Moneycontrol Markets", url: "https://www.moneycontrol.com/rss/marketreports.xml", category: "finance", language: "en" },
  { id: "livemint-markets", name: "LiveMint Markets", url: "https://www.livemint.com/rss/markets", category: "finance", language: "en" },
  { id: "economictimes-markets", name: "Economic Times Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", category: "finance", language: "en" },
  { id: "business-standard-markets", name: "Business Standard Markets", url: "https://www.business-standard.com/rss/markets-106.rss", category: "finance", language: "en" },
  { id: "google-news-markets-search", name: "Google News - markets search", url: "https://news.google.com/rss/search?q=(sensex%20OR%20nifty%20OR%20rbi)%20india&hl=en-IN&gl=IN&ceid=IN:en", category: "finance", language: "en" },

  // Technology
  { id: "toi-tech", name: "Times of India Tech", url: "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms", category: "technology", language: "en" },
  { id: "inc42-startups", name: "Inc42 Startups", url: "https://inc42.com/feed/", category: "technology", language: "en" },
  { id: "hackernews", name: "Hacker News Frontpage", url: "https://hnrss.org/frontpage", category: "technology", language: "en" },
  { id: "google-news-technology", name: "Google News - India, Technology", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en", category: "technology", language: "en" },

  // Sports
  { id: "toi-cricket", name: "Times of India Cricket", url: "https://timesofindia.indiatimes.com/rssfeeds/54829575.cms", category: "sports", language: "en" },
  { id: "espncricinfo", name: "ESPN Cricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", category: "sports", language: "en" },
  { id: "ndtv-sports", name: "NDTV Sports", url: "https://feeds.feedburner.com/ndtvsports-latest", category: "sports", language: "en" },
  { id: "indianexpress-sports", name: "Indian Express Sports", url: "https://indianexpress.com/section/sports/feed/", category: "sports", language: "en" },
  { id: "google-news-sports", name: "Google News - India, Sports", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en", category: "sports", language: "en" },

  // Entertainment
  { id: "toi-entertainment", name: "Times of India Entertainment", url: "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", category: "entertainment", language: "en" },
  { id: "bollywoodhungama", name: "Bollywood Hungama", url: "https://www.bollywoodhungama.com/feed/", category: "entertainment", language: "en" },
  { id: "pinkvilla", name: "Pinkvilla", url: "https://www.pinkvilla.com/rss.xml", category: "entertainment", language: "en" },
  { id: "indianexpress-entertainment", name: "Indian Express Entertainment", url: "https://indianexpress.com/section/entertainment/feed/", category: "entertainment", language: "en" },
  { id: "google-news-entertainment", name: "Google News - India, Entertainment", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en", category: "entertainment", language: "en" },
];

export function sourceById(id: string): SourceConfig | undefined {
  return SOURCES.find((source) => source.id === id);
}
