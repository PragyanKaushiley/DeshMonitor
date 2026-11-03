"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

interface WordRotateProps {
  words: string[]
  duration?: number
  motionProps?: MotionProps
  className?: string
}

// Magic UI's Word Rotate, adapted to sit inside a sentence: an inline span
// (not an h1) that takes the surrounding text's font and colour and is only
// as wide as the current word.
export function WordRotate({
  words,
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
}: WordRotateProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, duration)
    return () => clearInterval(interval)
  }, [words, duration])

  return (
    <span className={cn("inline-block overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="wait">
        <motion.span key={words[index]} className="inline-block" {...motionProps}>
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
