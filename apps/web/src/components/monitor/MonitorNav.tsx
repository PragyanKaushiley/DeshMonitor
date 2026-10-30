"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { AccountDrawer } from "@/components/auth/account-drawer";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Desh } from "@/components/landing/Desh";
import { CATEGORIES, REGIONS } from "@/lib/monitor/categories";
import type { CategoryId, Signal } from "@/lib/monitor/types";

// The dashboard's own nav, built like LandingNav: same wordmark, same
// blurred scrim, same teal progress line — with a search field in the
// middle and a live clock on the right.

function IstClock() {
  // Rendered only after mount: the server has no idea what time it is in
  // the reader's session, and a mismatched first paint would hydrate badly.
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date()
          .toLocaleString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Kolkata",
          })
          .replace(",", "")
          .replace(",", "")
          .toUpperCase(),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground tabular-nums">
      {time ? `${time} IST` : "--:--:-- IST"}
    </span>
  );
}

export function MonitorNav({
  signals,
  onPickSignal,
  onPickCategory,
  onPickRegion,
}: {
  signals: Signal[];
  onPickSignal: (signal: Signal) => void;
  onPickCategory: (id: CategoryId) => void;
  onPickRegion: (region: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  // "/" focuses search, unless the visitor is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, [contenteditable='true']");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav className="relative z-40 flex shrink-0 items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background/50 backdrop-blur-sm [html[data-theme-switching]_&]:bg-background" />

      <a
        href="/"
        className="shrink-0 whitespace-nowrap font-display text-sm tracking-[0.2em] text-foreground sm:text-base"
      >
        <Desh tooltip={false} /> MONITOR
      </a>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-left transition-colors outline-none hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 md:flex"
      >
        <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs text-muted-foreground">Search a city, state or signal</span>
        <kbd className="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 md:hidden"
        >
          <Search aria-hidden className="size-4" />
        </button>

        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="relative grid size-2 place-items-center">
            <span className="absolute size-2 rounded-full bg-teal-400 opacity-70 motion-safe:animate-ping" />
            <span className="size-1.5 rounded-full bg-teal-400" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-teal-400">LIVE</span>
        </span>

        <span className="hidden sm:inline">
          <IstClock />
        </span>

        <div className="flex items-center gap-2">
          {mounted ? <ThemeTogglerButton variant="ghost" size="sm" /> : <span className="size-9" aria-hidden />}
          <AccountDrawer />
        </div>
      </div>

      {/* This CommandDialog renders its children straight into the dialog,
          so the Command root has to be supplied here — without it cmdk's
          children have no store and throw while rendering. */}
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find a city, state or signal">
        <Command>
          <CommandInput placeholder="Search a city, state or signal" />
          <CommandList>
            <CommandEmpty>Nothing matched.</CommandEmpty>
            <CommandGroup heading="Signals">
              {signals.slice(0, 8).map((signal) => (
                <CommandItem
                  key={signal.id}
                  value={`${signal.title} ${signal.place} ${signal.category}`}
                  onSelect={() => {
                    onPickSignal(signal);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{signal.title}</span>
                  <span className="ml-auto font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
                    {signal.place.toUpperCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Categories">
              {CATEGORIES.map((meta) => (
                <CommandItem
                  key={meta.id}
                  value={meta.name}
                  onSelect={() => {
                    onPickCategory(meta.id);
                    setOpen(false);
                  }}
                >
                  <meta.icon className="size-4 text-muted-foreground" />
                  {meta.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Regions">
              {REGIONS.slice(0, 12).map((region) => (
                <CommandItem
                  key={region}
                  value={region}
                  onSelect={() => {
                    onPickRegion(region);
                    setOpen(false);
                  }}
                >
                  {region}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </nav>
  );
}
