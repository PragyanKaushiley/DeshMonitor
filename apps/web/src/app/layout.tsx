import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ErrorReporter } from "@/components/logging/ErrorReporter";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const DESCRIPTION = "India is constantly changing. Desh Monitor helps you see it.";

// Social images come from app/opengraph-image.png and twitter-image.png.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Desh Monitor — Real-time signals about India",
    template: "%s — Desh Monitor",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: "Desh Monitor — Real-time signals about India",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Desh Monitor — Real-time signals about India",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorReporter />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
