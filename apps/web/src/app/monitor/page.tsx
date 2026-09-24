import type { Metadata } from "next";
import Link from "next/link";
import { Desh } from "@/components/landing/Desh";
import { VisitTracker } from "@/components/consent/VisitTracker";

export const metadata: Metadata = {
  title: "Monitor",
  // Placeholder until the dashboard exists — keep it out of search results.
  robots: { index: false, follow: true },
};

export default function MonitorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-3xl">Monitor</h1>
      <p className="max-w-md text-muted-foreground">
        The <Desh /> Monitor dashboard is under construction. This page is a placeholder destination for
        the landing page&apos;s &ldquo;Enter <Desh /> Monitor&rdquo; call to action.
      </p>
      <Link href="/" className="font-mono text-xs tracking-[0.2em] underline underline-offset-4">
        ← BACK
      </Link>
      {/* Records the visit (with the CTA's UTM tags) if consent was given. */}
      <VisitTracker />
    </main>
  );
}
