import Parser from "rss-parser";

// Media RSS elements as rss-parser (xml2js) returns them with keepArray:
// attributes live under `$`.
interface MediaElement {
  $?: { url?: string; medium?: string; type?: string; width?: string };
}

export type RssItem = Parser.Item & {
  mediaContent?: MediaElement[];
  mediaThumbnail?: MediaElement[];
  "content:encoded"?: string;
};

// rss-parser drops unknown elements by default; keep Media RSS so covers can
// be extracted now and re-extracted later from the stored raw payload.
export function createRssParser(): Parser<Record<string, unknown>, RssItem> {
  return new Parser<Record<string, unknown>, RssItem>({
    customFields: {
      item: [
        ["media:content", "mediaContent", { keepArray: true }],
        ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ],
    },
  });
}

const MAX_URL_LENGTH = 2048;

function cleanUrl(value: string | undefined): string | null {
  if (!value) return null;
  const decoded = value.trim().replace(/&amp;/g, "&");
  if (decoded.length === 0 || decoded.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(decoded);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isImage(element: MediaElement): boolean {
  const medium = element.$?.medium?.toLowerCase();
  const type = element.$?.type?.toLowerCase();
  if (medium && medium !== "image") return false;
  if (type && !type.startsWith("image/")) return false;
  return true;
}

// Largest declared width first; elements without a width keep feed order.
function bestOf(elements: MediaElement[] | undefined): string | null {
  const candidates = (elements ?? []).filter(isImage);
  const ranked = [...candidates].sort((a, b) => Number(b.$?.width ?? 0) - Number(a.$?.width ?? 0));
  for (const element of ranked) {
    const url = cleanUrl(element.$?.url);
    if (url) return url;
  }
  return null;
}

function firstImgSrc(html: string | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i);
  return cleanUrl(match?.[1]);
}

// The item's cover image as the publisher provides it, checked in this order:
// media:content → media:thumbnail → image enclosure → first <img> in the
// description/content. Returns null when the feed gives none (e.g. Google
// News, Economic Times). The URL is stored as-is — never resized or guessed.
export function extractImageUrl(item: RssItem): string | null {
  const enclosure = item.enclosure;
  const enclosureUrl =
    enclosure && (!enclosure.type || enclosure.type.toLowerCase().startsWith("image/")) ? cleanUrl(enclosure.url) : null;

  return (
    bestOf(item.mediaContent) ??
    bestOf(item.mediaThumbnail) ??
    enclosureUrl ??
    firstImgSrc(item.content) ??
    firstImgSrc(item["content:encoded"])
  );
}
