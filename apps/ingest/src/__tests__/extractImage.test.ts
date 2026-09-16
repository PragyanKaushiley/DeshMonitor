import { test } from "node:test";
import assert from "node:assert/strict";
import { extractImageUrl } from "../pipeline/extractImage.js";
import { parseFeed } from "../pipeline/parseFeed.js";

test("prefers an <enclosure> with an image MIME type", () => {
  const result = extractImageUrl({ enclosure: { url: "https://example.com/photo.jpg", type: "image/jpeg" } });
  assert.equal(result, "https://example.com/photo.jpg");
});

test("ignores a non-image enclosure (e.g. a podcast audio file)", () => {
  const result = extractImageUrl({ enclosure: { url: "https://example.com/episode.mp3", type: "audio/mpeg" } });
  assert.equal(result, null);
});

test("accepts an untyped enclosure whose URL has an image extension", () => {
  const result = extractImageUrl({ enclosure: { url: "https://example.com/photo.png" } });
  assert.equal(result, "https://example.com/photo.png");
});

test("falls back to media:content when there is no enclosure", () => {
  const result = extractImageUrl({
    mediaContent: [{ $: { url: "https://example.com/media-content.jpg", medium: "image" } }],
  });
  assert.equal(result, "https://example.com/media-content.jpg");
});

test("skips a media:content entry explicitly marked as a non-image medium", () => {
  const result = extractImageUrl({
    mediaContent: [
      { $: { url: "https://example.com/clip.mp4", medium: "video" } },
      { $: { url: "https://example.com/still.jpg", medium: "image" } },
    ],
  });
  assert.equal(result, "https://example.com/still.jpg");
});

test("falls back to media:thumbnail when media:content is absent", () => {
  const result = extractImageUrl({
    mediaThumbnail: [{ $: { url: "https://example.com/thumb.jpg" } }],
  });
  assert.equal(result, "https://example.com/thumb.jpg");
});

test("falls back to the first <img> in content:encoded HTML as a last resort", () => {
  const result = extractImageUrl({
    "content:encoded": '<p>Some text</p><img src="https://example.com/inline.jpg" alt="" /><p>more</p>',
  });
  assert.equal(result, "https://example.com/inline.jpg");
});

test("returns null when no image signal exists anywhere", () => {
  const result = extractImageUrl({ content: "<p>Just text, no picture.</p>" });
  assert.equal(result, null);
});

test("enclosure takes priority over media:content when both are present", () => {
  const result = extractImageUrl({
    enclosure: { url: "https://example.com/enclosure.jpg", type: "image/jpeg" },
    mediaContent: [{ $: { url: "https://example.com/media.jpg", medium: "image" } }],
  });
  assert.equal(result, "https://example.com/enclosure.jpg");
});

// End-to-end through the real rss-parser instance (not a hand-built
// object) — this is what actually proves the `customFields` wiring in
// parseFeed.ts maps <media:content>/<media:thumbnail> onto the fields
// extractImageUrl expects, which the unit tests above can't catch on
// their own since they construct that shape by hand.
test("parseFeed extracts media:content images from real RSS/Atom XML", async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Story with a media:content image</title>
      <link>https://example.com/story-1</link>
      <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
      <media:content url="https://example.com/story-1.jpg" medium="image" width="800" height="450" />
      <description>A story about something.</description>
    </item>
    <item>
      <title>Story with only a media:thumbnail</title>
      <link>https://example.com/story-2</link>
      <pubDate>Mon, 01 Sep 2026 11:00:00 GMT</pubDate>
      <media:thumbnail url="https://example.com/story-2-thumb.jpg" />
      <description>Another story.</description>
    </item>
    <item>
      <title>Story with no image at all</title>
      <link>https://example.com/story-3</link>
      <pubDate>Mon, 01 Sep 2026 12:00:00 GMT</pubDate>
      <description>A plain story.</description>
    </item>
  </channel>
</rss>`;

  const items = await parseFeed(xml, "https://example.com/feed.xml");
  assert.equal(items.length, 3);
  assert.equal(items[0]?.imageUrl, "https://example.com/story-1.jpg");
  assert.equal(items[1]?.imageUrl, "https://example.com/story-2-thumb.jpg");
  assert.equal(items[2]?.imageUrl, null);
});
