"use client"

import React, { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

interface MeteorsProps {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  // Frozen at random points along their paths — the reduced-motion version.
  still?: boolean
  className?: string
}

export const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  still = false,
  className,
}: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>(
    []
  )

  useEffect(() => {
    // Moving meteors fall at an angle, so each drifts sideways by the time it
    // crosses the screen: spawning only across the width left the far side
    // of tall, narrow (mobile) screens empty. Spawn across the width plus
    // that drift. (Their travel angle is twice --angle: the head's rotate
    // class and the keyframes' rotate both apply.)
    const travel = (-2 * angle * Math.PI) / 180
    const dx = -Math.cos(travel)
    const dy = -Math.sin(travel)
    const drift = dy > 0 ? (dx / dy) * window.innerHeight : 0
    const spawnFrom = Math.min(0, -drift)
    const spawnTo = window.innerWidth + Math.max(0, -drift)

    const styles = [...new Array(number)].map(() =>
      still
        ? {
            "--angle": -angle + "deg",
            top: `${Math.floor(Math.random() * 100)}%`,
            left: `calc(0% + ${Math.floor(Math.random() * window.innerWidth)}px)`,
            opacity: 0.35 + Math.random() * 0.65,
            // The keyframes' starting transform, so a still meteor points
            // the same way as a moving one (the class's rotate stacks on it).
            transform: "rotate(var(--angle))",
          }
        : {
            "--angle": -angle + "deg",
            top: "-5%",
            left: `calc(0% + ${Math.floor(spawnFrom + Math.random() * (spawnTo - spawnFrom))}px)`,
            animationDelay: Math.random() * (maxDelay - minDelay) + minDelay + "s",
            animationDuration:
              Math.floor(Math.random() * (maxDuration - minDuration) + minDuration) +
              "s",
          }
    )
    setMeteorStyles(styles)
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle, still])

  return (
    <>
      {[...meteorStyles].map((style, idx) => (
        // Meteor Head
        <span
          key={idx}
          style={{ ...style }}
          className={cn(
            !still && "animate-meteor",
            "pointer-events-none absolute size-0.5 rotate-(--angle) rounded-full bg-foreground/60 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
            className
          )}
        >
          {/* Meteor Tail */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-12.5 -translate-y-1/2 bg-linear-to-r from-foreground/50 to-transparent" />
        </span>
      ))}
    </>
  )
}
