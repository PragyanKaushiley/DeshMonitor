import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2-backed incremental cache yet — not needed for a static placeholder
// page. Add it (see @opennextjs/cloudflare/overrides/incremental-cache) once
// there's real ISR content that needs it.
export default defineCloudflareConfig({});
