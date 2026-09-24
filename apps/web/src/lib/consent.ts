// Visitor consent for recording visits (IP, location, device, referrer, UTM).
// Bump CONSENT_VERSION when the privacy notice changes materially, so
// everyone is asked again.
export const CONSENT_VERSION = "1";
const STORAGE_KEY = "dm_consent";
export const OPEN_CONSENT_EVENT = "dm:open-consent";

export type ConsentChoice = "accepted" | "declined";

interface StoredConsent {
  version: string;
  choice: ConsentChoice;
  at: string;
}

export function getConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredConsent;
    return stored.version === CONSENT_VERSION ? stored.choice : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    const stored: StoredConsent = { version: CONSENT_VERSION, choice, at: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked (private mode etc.) — the choice just isn't remembered.
  }
}

// Lets the "Privacy choices" link reopen the banner from anywhere.
export function openConsentBanner(): void {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
