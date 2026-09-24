import type { Metadata } from "next";
import { HomePage } from "@/components/landing/HomePage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// schema.org WebSite: tells search engines the site's name and address.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "देश Monitor",
  url: SITE_URL,
  description: "Real-time signals about India from news, weather and beyond — collected, verified and made visible.",
  inLanguage: "en-IN",
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomePage />
    </>
  );
}
