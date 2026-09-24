import { normalizeUrl, sha256Hex } from "@desh-monitor/utils";
import type { NewsItemInput, SourceRecord } from "@desh-monitor/db";
import { extractImageUrl, type RssItem } from "./image";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeRssItem(item: RssItem, source: SourceRecord): NewsItemInput {
  const link = (item.link ?? "").trim();

  let url: string;
  try {
    url = normalizeUrl(link);
  } catch {
    url = link;
  }

  const guid = item.guid?.trim();
  const externalId = guid && guid.length > 0 ? guid : url;
  const title = (item.title ?? "").trim();
  const description = item.contentSnippet?.trim() || item.summary?.trim() || item.content?.trim() || null;
  const author = item.creator?.trim() || null;
  const publishedAt = parseDate(item.isoDate) ?? parseDate(item.pubDate);
  const sourceCategories = item.categories && item.categories.length > 0 ? item.categories : null;

  return {
    sourceId: source.id,
    externalId,
    url,
    title,
    description,
    author,
    publishedAt,
    sourceCategories,
    imageUrl: extractImageUrl(item),
    contentHash: sha256Hex(`${title}|${url}`),
    rawPayload: item,
  };
}
