"use client";

import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORIES, REGIONS, TIME_WINDOWS } from "@/lib/monitor/categories";
import type { TimeWindow } from "@/lib/monitor/categories";
import type { Signal } from "@/lib/monitor/types";
import type { SignalFilters } from "@/lib/monitor/useSignalFilters";

// What sits on and around the map, in the manner of World Monitor: a titled
// strip above it (name, clock, region), a floating time-range box, and a
// collapsible LAYERS checklist. The categories are the same filter state the
// signals list reads.

// The region list opens straight below its trigger at one fixed size, whichever
// state is picked and wherever the trigger sits (the default places the list
// around the chosen item, so its size and position kept changing). It is
// shorter than the 40 entries, so it always scrolls, and shows a scroll bar;
// only in a very short window does it shrink to fit.
const REGION_LIST =
  "h-[min(18rem,var(--radix-select-content-available-height))] max-h-[min(18rem,var(--radix-select-content-available-height))] w-(--radix-select-trigger-width)";

export function MapHeader({ filters, count }: { filters: SignalFilters; count: number }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-1.5">
      <h1 className="font-mono text-[11px] tracking-[0.2em] text-foreground">INDIA SITUATION</h1>
      <span className="rounded border border-teal-500/30 bg-teal-500/5 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-teal-400">
        {count} SIGNALS
      </span>
      <Select value={filters.region} onValueChange={filters.setRegion}>
        <SelectTrigger size="sm" className="ml-auto h-7 w-44 border-border bg-card/60 text-xs" aria-label="Region">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className={REGION_LIST}>
          {REGIONS.map((region) => (
            <SelectItem key={region} value={region} className="text-xs">
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TimeRangeBox({ filters }: { filters: SignalFilters }) {
  return (
    <ToggleGroup
      type="single"
      value={filters.window}
      onValueChange={(value) => value && filters.setWindow(value as TimeWindow)}
      className="absolute top-3 left-3 z-10 rounded-lg border border-border bg-card/90 p-1 backdrop-blur-sm"
    >
      {TIME_WINDOWS.map((w) => (
        <ToggleGroupItem
          key={w}
          value={w}
          aria-label={`Last ${w}`}
          className="h-7 min-w-9 rounded-md px-2 font-mono text-[10px] tracking-[0.15em] data-[state=on]:bg-teal-500 data-[state=on]:text-white"
        >
          {w}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function LayersPanel({ filters, signals }: { filters: SignalFilters; signals: Signal[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="absolute top-3 right-3 z-10 w-56 rounded-lg border border-border bg-card/90 backdrop-blur-sm"
    >
      <div className="flex items-center">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-teal-400">
          <Layers aria-hidden className="size-3.5 text-muted-foreground" />
          LAYERS
          <ChevronDown
            aria-hidden
            className={`ml-auto size-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </CollapsibleTrigger>
        <button
          type="button"
          onClick={() => filters.clear()}
          className="mr-2 rounded px-1.5 py-1 font-mono text-[9px] tracking-[0.15em] text-teal-400 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          ALL
        </button>
      </div>
      <CollapsibleContent>
        <ScrollArea className="h-40 border-t border-border">
          <ul className="flex flex-col py-1">
            {CATEGORIES.map((meta) => {
              const on = filters.active.has(meta.id);
              return (
                <li key={meta.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors hover:bg-muted/50">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(next) => filters.set(meta.id, next === true)}
                      aria-label={`${meta.name} signals`}
                      className="data-checked:border-teal-500 data-checked:bg-teal-500"
                    />
                    <meta.icon aria-hidden className={`size-3.5 ${on ? "text-foreground" : "text-muted-foreground/50"}`} />
                    <span className={`flex-1 truncate text-xs ${on ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {meta.name}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {filters.countFor(signals, meta.id)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

// The time range and region, for the phone layout, where the map has no room
// for the floating boxes and the header strip the desktop uses.
export function MobileControls({ filters }: { filters: SignalFilters }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ToggleGroup
        type="single"
        value={filters.window}
        onValueChange={(value) => value && filters.setWindow(value as TimeWindow)}
        aria-label="Time range"
        className="h-11 shrink-0 items-stretch rounded-lg border border-border bg-card/80 p-0.5"
      >
        {TIME_WINDOWS.map((w) => (
          <ToggleGroupItem
            key={w}
            value={w}
            aria-label={`Last ${w}`}
            className="h-full min-w-10 rounded-md px-2 font-mono text-[10px] tracking-[0.15em] data-[state=on]:bg-teal-500 data-[state=on]:text-white"
          >
            {w}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select value={filters.region} onValueChange={filters.setRegion}>
        <SelectTrigger className="min-w-0 flex-1 border-border bg-card/80 text-xs data-[size=default]:h-11" aria-label="Region">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className={REGION_LIST}>
          {REGIONS.map((region) => (
            <SelectItem key={region} value={region} className="text-xs">
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
