import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { SpaceParticles } from "@/components/landing/SpaceParticles";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
      <LandingNav sceneLabel="SIGNAL LOST" showProgress={false} />
      <main className="relative flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden bg-background p-8 text-center">
        <SpaceParticles className="absolute inset-0" />
        <p className="relative font-mono text-xs tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="relative font-display text-4xl sm:text-5xl">Lost in space?</h1>
        <p className="relative max-w-md text-muted-foreground">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="relative mt-2 inline-flex py-2 font-mono text-xs tracking-[0.2em] underline underline-offset-4"
        >
          ← BACK TO HOME
        </Link>
      </main>
    </>
  );
}
