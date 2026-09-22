import Parser from "rss-parser";
import { fetchWithTimeout } from "@desh-monitor/utils";
import { insertItems, type Database, type NewsItemInput, type SourceRecord } from "@desh-monitor/db";
import type { SourceAdapter } from "../../core/types";
import { isValidRssItem } from "./validate";
import { normalizeRssItem } from "./normalize";

const USER_AGENT = "DeshMonitorBot/0.1 (+https://github.com/desh-monitor; ingestion bot)";

export function createRssAdapter(db: Database): SourceAdapter<SourceRecord, Parser.Item, NewsItemInput> {
  const parser = new Parser();

  return {
    async fetch(source) {
      const { status, body } = await fetchWithTimeout(source.url, {
        headers: { "User-Agent": USER_AGENT },
      });
      const feed = await parser.parseString(body);
      return { httpStatus: status, rawItems: feed.items ?? [] };
    },

    validate: isValidRssItem,

    normalize: normalizeRssItem,

    async persist(_source, normalizedItems) {
      return insertItems(db, normalizedItems);
    },
  };
}
