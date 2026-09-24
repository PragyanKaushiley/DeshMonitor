import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything may be crawled; /monitor stays out of search through its own
// noindex (a robots.txt block would stop crawlers from seeing that).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
