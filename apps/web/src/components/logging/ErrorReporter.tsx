"use client";

import { useEffect } from "react";
import { errorFields } from "@desh-monitor/logger";
import { flushLogs, log } from "@/lib/log";

// Noise that isn't ours to fix: browser extensions and a benign
// ResizeObserver notice some browsers raise as an error.
function isNoise(message: string, filename?: string): boolean {
  return /extension:\/\//.test(filename ?? "") || /ResizeObserver loop/.test(message);
}

// Reports uncaught errors and unhandled promise rejections anywhere on the
// site (render errors included — React re-throws them to the window), and
// sends queued reports before the page goes away.
export function ErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isNoise(event.message, event.filename)) return;
      log.error("uncaught error", {
        ...errorFields(event.error ?? event.message),
        path: window.location.pathname,
        file: event.filename || undefined,
        line: event.lineno || undefined,
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      log.error("unhandled promise rejection", { ...errorFields(event.reason), path: window.location.pathname });
    }
    function onHide() {
      void flushLogs();
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}
