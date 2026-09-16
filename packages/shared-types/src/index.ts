// @deshmonitor/shared-types
//
// Single source of truth for types shared between apps/ingest, apps/api,
// and apps/web. Deliberately dependency-free (no runtime imports, no
// side effects) so it can be consumed unmodified from a Cloudflare
// Worker, a GitHub Actions Node process, and a Vite/React bundle.

export * from "./constants.js";
export * from "./domain.js";
export * from "./api.js";
