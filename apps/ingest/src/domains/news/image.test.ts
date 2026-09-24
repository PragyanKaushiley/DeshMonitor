import { describe, expect, it } from "vitest";
import { createRssParser, extractImageUrl } from "./image";

// Item markup mirrors what the configured feeds actually publish.
function feed(itemXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel><title>Test</title><link>https://example.com</link><description>t</description>
    <item><title>Headline</title><link>https://example.com/a</link>${itemXml}</item>
  </channel>
</rss>`;
}

async function imageOf(itemXml: string): Promise<string | null> {
  const parsed = await createRssParser().parseString(feed(itemXml));
  const item = parsed.items[0];
  if (!item) throw new Error("no item parsed");
  return extractImageUrl(item);
}

describe("extractImageUrl", () => {
  it("reads media:content (The Hindu, Hindustan Times, Livemint, NDTV)", async () => {
    await expect(
      imageOf(`<media:content url="https://th-i.thgim.com/public/a.ece/alternates/LANDSCAPE_1200/bus.png" medium="image"/>`),
    ).resolves.toBe("https://th-i.thgim.com/public/a.ece/alternates/LANDSCAPE_1200/bus.png");
    await expect(
      imageOf(`<media:content url="https://c.ndtvimg.com/2026-09/x_625x300.jpeg" type="image/jpeg"/>`),
    ).resolves.toBe("https://c.ndtvimg.com/2026-09/x_625x300.jpeg");
  });

  it("prefers media:content over media:thumbnail (Indian Express has both)", async () => {
    await expect(
      imageOf(`<media:thumbnail url="https://images.example.com/thumb.jpg" />
        <media:content url="https://images.example.com/full.jpg" medium="image"><media:title type="html">t</media:title></media:content>`),
    ).resolves.toBe("https://images.example.com/full.jpg");
  });

  it("picks the widest media:content when several declare a width", async () => {
    await expect(
      imageOf(`<media:content url="https://img.example.com/small.jpg" medium="image" width="300"/>
        <media:content url="https://img.example.com/large.jpg" medium="image" width="1200"/>`),
    ).resolves.toBe("https://img.example.com/large.jpg");
  });

  it("skips non-image media:content (e.g. video)", async () => {
    await expect(
      imageOf(`<media:content url="https://cdn.example.com/clip.mp4" medium="video"/>
        <media:thumbnail url="https://cdn.example.com/poster.jpg"/>`),
    ).resolves.toBe("https://cdn.example.com/poster.jpg");
  });

  it("reads media:thumbnail as-is, without upscaling (BBC)", async () => {
    await expect(
      imageOf(`<media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/x.jpg"/>`),
    ).resolves.toBe("https://ichef.bbci.co.uk/ace/standard/240/x.jpg");
  });

  it("reads an image enclosure (Times of India)", async () => {
    await expect(
      imageOf(`<enclosure url="https://static.toiimg.com/photo/msid-1,imgsize-2.cms" length="1020621" type="image/jpeg"/>`),
    ).resolves.toBe("https://static.toiimg.com/photo/msid-1,imgsize-2.cms");
  });

  it("falls back to the first <img> in the description (India Today), decoding &amp;", async () => {
    await expect(
      imageOf(
        `<description><![CDATA[<a href="https://x"><img align="left" src="https://akm-img.example.com/a.jpg?Version=1&amp;size=2" /></a> Story text]]></description>`,
      ),
    ).resolves.toBe("https://akm-img.example.com/a.jpg?Version=1&size=2");
  });

  it("returns null when the feed has no image (Google News, Economic Times)", async () => {
    await expect(imageOf(`<description>Plain text summary</description>`)).resolves.toBeNull();
  });

  it("ignores non-http(s) and malformed URLs", async () => {
    await expect(imageOf(`<media:content url="javascript:alert(1)" medium="image"/>`)).resolves.toBeNull();
    await expect(imageOf(`<media:thumbnail url="not a url"/>`)).resolves.toBeNull();
  });

  it("keeps the Media RSS elements on the parsed item, so the raw payload preserves them", async () => {
    const parsed = await createRssParser().parseString(feed(`<media:content url="https://img.example.com/a.jpg" medium="image"/>`));
    expect(parsed.items[0]?.mediaContent?.[0]?.$?.url).toBe("https://img.example.com/a.jpg");
  });
});
