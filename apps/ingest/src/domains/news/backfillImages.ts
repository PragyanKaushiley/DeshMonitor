import { createDb, listItemsWithoutImage, setItemImageUrl } from "@desh-monitor/db";
import { createLogger } from "@desh-monitor/logger";
import { extractImageUrl, type RssItem } from "./image";

// Reprocesses stored raw payloads (no refetch) to fill image_url on items
// ingested before cover images were extracted. Only covers the payload kept
// can be recovered: Media RSS tags weren't preserved before, so this mostly
// finds image enclosures and <img> tags in descriptions.
const PAGE_SIZE = 500;

async function main() {
  const logger = createLogger({ component: "news-image-backfill" });
  const db = createDb();
  let afterId: string | null = null;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const page = await listItemsWithoutImage(db, { afterId, limit: PAGE_SIZE });
    if (page.length === 0) break;
    for (const item of page) {
      const imageUrl = extractImageUrl(item.rawPayload as RssItem);
      if (imageUrl) {
        await setItemImageUrl(db, item.id, imageUrl);
        updated++;
      }
    }
    scanned += page.length;
    afterId = page[page.length - 1]?.id ?? null;
  }

  logger.info("news image backfill finished", { scanned, updated });
}

main().catch((error) => {
  console.error("news image backfill failed:", error);
  process.exitCode = 1;
});
