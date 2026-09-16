# DeshMonitor

DeshMonitor is an India-focused, real-time public-data intelligence
platform — the goal is to correlate the public data streams that
describe what's actually happening in India, not just to summarize
headlines about it.

News ingestion is the first functionality being built on top of this
platform, not the whole of it. This repo currently holds only that
piece: a pipeline that pulls free Indian news sources, normalizes and
deduplicates them, geo-tags each story by state, and writes the result
to Postgres. There is no API or web app in this repo yet — those were
removed along with the rest of the previous implementation when this
project restarted from scratch, and will come back as their own pieces
once the ingest pipeline itself is trustworthy. This README describes
what's actually built today, and gets updated as that changes — it
isn't a fixed feature list or a roadmap.

## Stack

Node.js 20+ / TypeScript, pnpm workspaces, Postgres. Ingestion is meant
to run on a GitHub Actions cron once deployed (see
`.github/workflows/ingest.yml`); locally, `pnpm ingest` runs one pass
against all configured sources and exits — there's no local scheduler.

## Repo layout

```
apps/ingest/           the ingestion pipeline (fetch, parse, dedupe, geotag, write)
packages/shared-types/ TypeScript types shared across future apps in this monorepo
```

## Local setup

1. **Install pnpm** (not bundled with Node): `npm install -g pnpm`, or
   `corepack enable && corepack prepare pnpm@9.12.0 --activate` if your
   Node ships corepack.
2. `pnpm install` at the repo root.
3. Create a Postgres database, then run the schema SQL against it. The
   schema file isn't part of this repo — it only adds, never drops
   (`IF NOT EXISTS` throughout), so it's safe to re-run any time after
   a schema change too.
4. `cp apps/ingest/.env.example apps/ingest/.env.local` and fill in
   `DATABASE_URL`. **Only ever put real secrets in `.env.local`, never
   in `.env.example`** — `.env.local` is gitignored, `.env.example` is
   committed as-is.
5. `pnpm ingest` — runs the ingestion pipeline once against all sources
   in `apps/ingest/src/config/sources.ts` and exits. `.env.local` is
   loaded automatically (no extra setup, no `dotenv` package needed).

## Exact run scripts

```sh
npm install -g pnpm                          # or corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
cp apps/ingest/.env.example apps/ingest/.env.local     # then fill in DATABASE_URL
psql "<connection string>" -f <path to schema.sql>
pnpm ingest
```

**Typecheck everything:**

```sh
pnpm typecheck        # runs tsc --noEmit in every workspace (ingest, shared-types)
```

**Run the ingest test suite:**

```sh
pnpm --filter @deshmonitor/ingest test
```

## Deploying

Ingestion is meant to run on GitHub Actions' own cron schedule (see
`.github/workflows/ingest.yml`) — nothing to trigger manually once
deployed. Set `DATABASE_URL` as a GitHub Actions repo secret first.

## Known limitations

- **The RSS source list has not been verified yet** — the URLs in
  `apps/ingest/src/config/sources.ts` haven't all been confirmed
  reachable or well-formed.
- **Geo-tagging is a keyword-matching heuristic**, not a guarantee —
  occasional mis-tags on stories mentioning multiple places are
  expected (see `apps/ingest/src/pipeline/geotag.ts`).
- **There is no API or web app in this repo.** They'll be rebuilt as
  their own pieces once the ingest pipeline is verified end-to-end.
