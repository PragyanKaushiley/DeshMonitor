"use client"

import * as React from "react"
import { cn } from "cn"
import { Drawer as DrawerPrimitive } from "vaul"

// shadcn's Drawer (vaul), restyled for this site: page background and border
// tokens instead of popover ones, a stronger scrim, a 400px right sheet, and
// a teal hairline on the edge that faces the page. Reduced motion is handled
// in globals.css, since vaul sets its transitions inline.

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  // The drag handle belongs to the bottom sheet only. Rendering it
  // conditionally rather than hiding it with a class: vaul injects
  // `[data-vaul-handle]{display:block}` into the page at runtime, after our
  // stylesheet, so a `hidden` class of equal specificity loses to it.
  showHandle = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { showHandle?: boolean }) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-background text-sm text-foreground",
          // Bottom sheet (phones): full width, 20px top corners.
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[85vh] data-[vaul-drawer-direction=bottom]:rounded-t-[20px] data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:border-border",
          // Right sheet (desktop): 400px, full height.
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-[min(400px,88vw)] data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:border-border",
          // Teal hairline along the edge facing the page, like the bento shine.
          "before:pointer-events-none before:absolute before:bg-linear-to-r before:from-transparent before:via-teal-500 before:to-transparent",
          "data-[vaul-drawer-direction=bottom]:before:inset-x-[20%] data-[vaul-drawer-direction=bottom]:before:top-0 data-[vaul-drawer-direction=bottom]:before:h-px",
          "data-[vaul-drawer-direction=right]:before:inset-y-[18%] data-[vaul-drawer-direction=right]:before:left-0 data-[vaul-drawer-direction=right]:before:w-px data-[vaul-drawer-direction=right]:before:bg-linear-to-b",
          className
        )}
        {...props}
      >
        {showHandle && (
          // Doubled-up attribute selectors ([&[data-vaul-handle]]) so these
          // beat vaul's own injected rule for size and colour too.
          <DrawerPrimitive.Handle className="mt-3 shrink-0 [&[data-vaul-handle]]:h-[5px] [&[data-vaul-handle]]:w-12 [&[data-vaul-handle]]:rounded-full [&[data-vaul-handle]]:bg-muted [&[data-vaul-handle]]:opacity-100" />
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
