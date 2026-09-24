"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Particles } from "@/components/ui/particles";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

// Particles draw on a canvas with a hex colour, so the theme is resolved
// here rather than through CSS tokens.
export function SpaceParticles({ className = "" }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || reducedMotion) return null;

  return (
    <Particles
      className={className}
      quantity={140}
      ease={80}
      size={0.5}
      color={resolvedTheme === "light" ? "#0a0a0a" : "#ffffff"}
    />
  );
}
