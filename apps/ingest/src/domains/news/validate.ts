import { z } from "zod";
import type Parser from "rss-parser";

const rssItemSchema = z.object({
  title: z.string().trim().min(1),
  link: z.string().trim().min(1),
});

export function isValidRssItem(item: Parser.Item): boolean {
  return rssItemSchema.safeParse(item).success;
}
