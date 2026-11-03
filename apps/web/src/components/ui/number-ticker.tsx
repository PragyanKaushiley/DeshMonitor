"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { animate, useInView, useMotionValue } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  delay?: number
  decimalPlaces?: number
  locale?: string
}

// Magic UI's Number Ticker, adapted: a fixed-length ease-out roll instead of
// a spring (the spring took many seconds to settle, so a value the feed
// changes every few seconds never arrived), the first roll from `startValue`
// a little longer than later ones, a configurable locale, and the colour
// inherited from the surrounding text.
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
  decimalPlaces = 0,
  locale = "en-US",
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(startValue)
  const isInView = useInView(ref, { once: true, margin: "0px" })
  const rolled = useRef(false)

  useEffect(() => {
    if (!isInView) return
    const controls = animate(motionValue, value, {
      duration: rolled.current ? 0.6 : 1.2,
      delay: rolled.current ? 0 : delay,
      ease: "easeOut",
    })
    rolled.current = true
    return () => controls.stop()
  }, [motionValue, isInView, value, delay])

  useEffect(
    () =>
      motionValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat(locale, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [motionValue, decimalPlaces, locale]
  )

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {startValue}
    </span>
  )
}
