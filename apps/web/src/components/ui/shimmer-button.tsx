import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

// Magic UI's Shimmer Button, adapted: a `ShimmerLink` variant for
// navigation (a <button> inside an <a> is invalid), the highlight follows
// --radius (it was fixed at rounded-2xl, which showed on square buttons),
// and the moving spark is hidden for reduced motion.

interface ShimmerOptions {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
}

export interface ShimmerButtonProps
  extends ComponentPropsWithoutRef<"button">,
    ShimmerOptions {
  className?: string
  children?: React.ReactNode
}

export interface ShimmerLinkProps
  extends ComponentPropsWithoutRef<typeof Link>,
    ShimmerOptions {
  className?: string
  children?: React.ReactNode
}

function shimmerStyle({
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  shimmerDuration = "3s",
  borderRadius = "100px",
  background = "rgba(0, 0, 0, 1)",
}: { [K in keyof ShimmerOptions]?: ShimmerOptions[K] | undefined }) {
  return {
    "--spread": "90deg",
    "--shimmer-color": shimmerColor,
    "--radius": borderRadius,
    "--speed": shimmerDuration,
    "--cut": shimmerSize,
    "--bg": background,
  } as CSSProperties
}

const shimmerClassName =
  "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-white [background:var(--bg)] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px"

function ShimmerLayers({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* spark container */}
      <div
        className={cn(
          "-z-30 blur-[2px] motion-reduce:hidden",
          "@container-[size] absolute inset-0 overflow-visible"
        )}
      >
        {/* spark */}
        <div className="animate-shimmer-slide absolute inset-0 aspect-[1] h-[100cqh] rounded-none [mask:none]">
          {/* spark before */}
          <div className="animate-spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
        </div>
      </div>
      {children}

      {/* Highlight */}
      <div
        className={cn(
          "absolute inset-0 size-full",

          "[border-radius:var(--radius)] px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",

          // transition
          "transform-gpu transition-all duration-300 ease-in-out",

          // on hover
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",

          // on click
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )}
      />

      {/* backdrop */}
      <div
        className={cn(
          "absolute inset-(--cut) -z-20 [border-radius:var(--radius)] [background:var(--bg)]"
        )}
      />
    </>
  )
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor,
      shimmerSize,
      shimmerDuration,
      borderRadius,
      background,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={shimmerStyle({ shimmerColor, shimmerSize, shimmerDuration, borderRadius, background })}
        className={cn(shimmerClassName, className)}
        ref={ref}
        {...props}
      >
        <ShimmerLayers>{children}</ShimmerLayers>
      </button>
    )
  }
)

ShimmerButton.displayName = "ShimmerButton"

export const ShimmerLink = React.forwardRef<HTMLAnchorElement, ShimmerLinkProps>(
  (
    {
      shimmerColor,
      shimmerSize,
      shimmerDuration,
      borderRadius,
      background,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Link
        style={shimmerStyle({ shimmerColor, shimmerSize, shimmerDuration, borderRadius, background })}
        className={cn(shimmerClassName, className)}
        ref={ref}
        {...props}
      >
        <ShimmerLayers>{children}</ShimmerLayers>
      </Link>
    )
  }
)

ShimmerLink.displayName = "ShimmerLink"
