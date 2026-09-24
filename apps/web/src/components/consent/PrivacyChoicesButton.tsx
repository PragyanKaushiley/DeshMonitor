"use client";

import { openConsentBanner } from "@/lib/consent";

// Reopens the consent banner so a visitor can change or withdraw their choice.
export function PrivacyChoicesButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentBanner} className={className}>
      Privacy choices
    </button>
  );
}
