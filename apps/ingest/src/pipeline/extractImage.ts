// Pulls a representative image URL out of a parsed feed item, in the
// order real-world RSS/Atom feeds actually expose one: a plain
// <enclosure>, then Yahoo Media RSS (<media:content>/<media:thumbnail>,
// the namespace most Indian publishers and Google News actually use),
// then a raw <img> pulled out of the item's own HTML body as a last
// resort. Every step is defensive — a feed that has none of these simply
// yields `null`, which is a normal, expected outcome (not every source
// carries images), not an error.
//
// This never fetches or stores the image itself, only its source URL —
// hotlinking the publisher's own image is what every RSS reader and news
// aggregator does; downloading and re-hosting the binary would need a
// new object-storage decision this project hasn't made (CLAUDE.md's
// "everything free-tier, no invented infra" constraint), and would raise
// real copyright/attribution questions a URL reference doesn't.

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i;
const IMG_TAG_PATTERN = /<img[^>]+src=["']([^"']+)["']/i;

interface MediaEntry {
  $?: Record<string, string>;
}

export interface ImageCandidateFields {
  enclosure?: { url?: string; type?: string };
  mediaContent?: MediaEntry[];
  mediaThumbnail?: MediaEntry[];
  content?: string;
  "content:encoded"?: string;
  summary?: string;
}

export function extractImageUrl(item: ImageCandidateFields): string | null {
  const enclosureUrl = item.enclosure?.url?.trim();
  if (enclosureUrl && looksLikeImage(enclosureUrl, item.enclosure?.type)) {
    return enclosureUrl;
  }

  const fromMediaContent = firstMediaImageUrl(item.mediaContent);
  if (fromMediaContent) return fromMediaContent;

  const fromMediaThumbnail = firstMediaImageUrl(item.mediaThumbnail);
  if (fromMediaThumbnail) return fromMediaThumbnail;

  const html = item["content:encoded"] ?? item.content ?? item.summary;
  if (html) {
    const match = IMG_TAG_PATTERN.exec(html);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function looksLikeImage(url: string, mimeType?: string): boolean {
  if (mimeType) return mimeType.startsWith("image/");
  return IMAGE_EXTENSION_PATTERN.test(url);
}

/** media:content/media:thumbnail entries come back from rss-parser's
 * customFields as `{ $: { url, type?, medium? } }` (attributes land under
 * `$`, per the underlying xml2js parser's convention). A `medium` or
 * `type` attribute that positively says "not an image" (e.g.
 * medium="video") rules the entry out; anything else with a URL and no
 * disqualifying attribute is accepted, since many feeds omit both. */
function firstMediaImageUrl(entries?: MediaEntry[]): string | null {
  if (!entries) return null;
  for (const entry of entries) {
    const url = entry.$?.url?.trim();
    if (!url) continue;
    const medium = entry.$?.medium;
    if (medium && medium !== "image") continue;
    const type = entry.$?.type;
    if (type && !type.startsWith("image/")) continue;
    return url;
  }
  return null;
}
