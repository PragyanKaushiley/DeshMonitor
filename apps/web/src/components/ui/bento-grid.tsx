import { type ComponentPropsWithRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

// Magic UI's Bento Grid, adapted: theme tokens instead of fixed neutrals,
// lucide + next/link instead of extra icon/button dependencies, an optional
// call-to-action (the lift on hover only makes room for it), and type that
// follows the site (mono caps names, compact sizes).

interface BentoGridProps extends ComponentPropsWithRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithRef<"div"> {
  name: string
  className?: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href?: string
  cta?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  children,
  ...props
}: BentoCardProps) => {
  const action =
    href && cta ? (
      <Link
        href={href}
        className="pointer-events-auto inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {cta}
        <ArrowRight className="ms-2 size-4 rtl:rotate-180" aria-hidden />
      </Link>
    ) : null

  return (
    <div
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
        // light styles
        "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles
        "transform-gpu dark:bg-background dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
        className
      )}
      {...props}
    >
      <div>{background}</div>
      <div className="relative p-3 md:p-4">
        <div
          className={cn(
            "pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300",
            action && "lg:group-hover:-translate-y-10"
          )}
        >
          <Icon className="size-5 origin-left transform-gpu text-muted-foreground transition-all duration-300 ease-in-out group-hover:scale-75 md:size-7" />
          <h3 className="mt-1 font-mono text-[10px] leading-snug font-medium tracking-[0.2em] text-foreground md:text-sm">{name}</h3>
          <p className="max-w-lg text-xs text-muted-foreground md:text-sm">{description}</p>
        </div>

        {action && <div className="flex w-full flex-row items-center lg:hidden">{action}</div>}
      </div>

      {action && (
        <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
          {action}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10" />
      {children}
    </div>
  )
}

export { BentoCard, BentoGrid }
