import Parser from "rss-parser";
import { extractImageUrl, type ImageCandidateFields } from "./extractImage.js";

/** The normalized shape every parsed feed item is reduced to, regardless
 * of which RSS/Atom quirks the source feed happens to have. */
export interface NormalizedItem {
  title: string;
  url: string;
  description?: string;
  /** ISO 8601, or null when the feed omits a publish date. */
  publishedAt: string | null;
  /** A representative image URL for the story, or null when the feed
   * carries none (see extractImage.ts) — never a downloaded/re-hosted
   * copy, always a reference to the publisher's own image. */
  imageUrl: string | null;
}

type ParsedItem = Parser.Item & ImageCandidateFields;

// customFields pulls in the two Media RSS elements most Indian
// publishers and Google News actually use for a story thumbnail — plain
// <enclosure> is already parsed by rss-parser out of the box, so it
// isn't listed here.
const parser = new Parser<Record<string, unknown>, ParsedItem>({
  timeout: 15_000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

export class FeedParseError extends Error {
  constructor(
    message: string,
    readonly sourceUrl: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FeedParseError";
  }
}

/** Parse a feed's raw XML body into normalized items. Items with no
 * usable link are dropped — a story with no URL can't be deduplicated or
 * linked to, so it isn't a story this pipeline can do anything with. */
export async function parseFeed(xml: string, sourceUrl: string): Promise<NormalizedItem[]> {
  let feed: Parser.Output<ParsedItem>;
  try {
    feed = await parser.parseString(xml);
  } catch (cause) {
    throw new FeedParseError("Failed to parse feed XML", sourceUrl, cause);
  }

  const items: NormalizedItem[] = [];
  for (const item of feed.items ?? []) {
    const url = item.link?.trim();
    const title = item.title?.trim();
    if (!url || !title) continue;

    const isoDate = item.isoDate ?? item.pubDate;
    const publishedAt = isoDate ? toIsoOrNull(isoDate) : null;

    items.push({
      title,
      url,
      description: item.contentSnippet?.trim() || item.summary?.trim() || undefined,
      publishedAt,
      imageUrl: extractImageUrl(item),
    });
  }
  return items;
}

function toIsoOrNull(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
