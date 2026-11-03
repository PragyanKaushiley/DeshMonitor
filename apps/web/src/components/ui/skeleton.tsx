import { cn } from "cn"

// A soft highlight sweeps across the block. `foreground` flips with the
// theme, so the same low-alpha band reads as a light sheen on dark and a
// darker one on light. Reduced motion keeps the plain block.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-y-0 after:left-0 after:w-3/5 after:animate-[skeleton-shimmer_2.2s_linear_infinite]",
        "after:bg-linear-to-r after:from-transparent after:via-foreground/10 after:to-transparent",
        "motion-reduce:after:hidden",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
