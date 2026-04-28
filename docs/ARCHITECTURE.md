# Architecture

## Overview

**Brand:** Octiqa — платформа, которая помогает исполнителю управлять занятостью и связывает его с клиентом.
**Brand mark:** rounded square + minimalist octopus imprint (`apps/web/src/components/OctiLogo.tsx`).

```
Browser → octiqa-web (Next.js, Render)
             ↓ fetch
octiqa-api (Fastify, Render)
             ↓ postgres.js
Supabase (PostgreSQL + Auth + Storage)
```

> Note: internal package scope is still `@tamada/*` (not renamed to avoid breaking builds).
> Service display names: `octiqa-web`, `octiqa-api`.

## Apps

### apps/api
- Fastify v5
- Entry: src/main.ts → parseEnv() → createApp() → listen()
- Health: GET /health, GET /api/health → { status, service, env, uptime }
- Reads env via @tamada/config (Zod)  <!-- internal scope, not renamed -->
- Security: @fastify/helmet + @fastify/rate-limit + CORS (CORS_ORIGINS)
- Body limit: 512 KB JSON, 10 MB multipart

### apps/web
- Next.js 15, App Router
- Entry: src/app/page.tsx
- Health: GET /api/health (Next.js route handler)
- output: standalone for Docker
- SEO: sitemap.xml, robots.txt, generateMetadata on /p/[slug]

## Route Map (API)

| Prefix                        | Auth       | Rate limit      |
|-------------------------------|------------|-----------------|
| POST /auth/*                  | Public     | 15 req / 15 min |
| GET /auth/me                  | Bearer     | 15 req / 15 min |
| GET/POST /search/*            | Public     | 30 req / min    |
| GET /reference/*              | Public     | 120 req / min   |
| GET /account/subscription     | Bearer     | 120 req / min   |
| POST /account/subscription/*  | Bearer     | 120 req / min   |
| POST /account/payments/*      | Bearer     | 120 req / min   |
| GET /public/providers/*       | Public     | 120 req / min   |
| POST/PATCH/DELETE /providers/*| Bearer     | 120 req / min   |
| GET/POST /providers/*/calendar| Bearer     | 120 req / min   |
| POST /telegram/webhook        | None       | Unlimited       |
| POST /telegram/link-token     | Bearer     | 120 req / min   |
| POST /internal/jobs/*         | x-internal-secret | 120 req/min |

## Packages

| Package           | Purpose                              |
|-------------------|--------------------------------------|
| @tamada/config    | Zod env schema + parseEnv()          |
| @tamada/types     | Shared TypeScript types              |
| @tamada/utils     | Shared utility functions             |

## Database

- Provider: Supabase (PostgreSQL)
- Migrations: /supabase/migrations/ (versioned SQL files, 001–026)
- Schema reference: /supabase/schema.sql
- Connection: postgres.js with `prepare: false` (PgBouncer compatible)
- Key view: `public_providers_search` — only active + subscribed providers
- **Subscription model**: account-level — one subscription covers ALL profiles of the account. `subscriptions.account_id` FK, `provider_id` nullable. Migration 011.
- Reference tables: `ref_countries`, `ref_regions`, `ref_cities`, `ref_categories`, `ref_subcategories`, `ref_currencies`, `ref_link_types`
- Reference data: Kazakhstan (ISO 3166-2:KZ), 20 regions, ~55 cities, 16 categories, 4 currencies
- Providers have nullable `country_id`, `region_id`, `city_id` FKs (migration 010, safe transition)

## Notifications / Jobs

- `notification_jobs` table with partial unique index for deduplication
- `FOR UPDATE SKIP LOCKED` for safe concurrent processing
- Job types: event_reminder, subscription_reminder, calendar_stale_reminder
- Delivery: Telegram bot → all linked accounts per provider
- Triggered via POST /internal/jobs/enqueue-reminders (cron on Render)

## AI Search

- Enabled via AI_SEARCH_ENABLED=true
- POST /search/ai → parse query → search providers in one shot
- Falls back to rule-based parser if AI disabled or OpenAI fails
- Rule-based: CITIES + CATEGORIES dictionaries + regex (Russian language)

## Deploy (Render)

- Both services use multi-stage Docker builds
- Env vars set in Render dashboard (sync: false for secrets)
- Health checks ensure zero-downtime deploys

## Env Variables

| Key                     | Service    | Set via          |
|-------------------------|------------|------------------|
| NODE_ENV                | API        | render.yaml      |
| APP_BASE_URL            | API        | Render dashboard |
| CORS_ORIGINS            | API        | Render dashboard |
| DATABASE_URL            | API        | Render dashboard |
| DATABASE_DIRECT_URL     | API        | Render dashboard |
| SUPABASE_*              | API        | Render dashboard |
| SESSION_SECRET          | API        | Render dashboard |
| TELEGRAM_BOT_TOKEN      | API        | Render dashboard |
| KASPI_API_KEY           | API        | Render dashboard |
| INTERNAL_JOBS_SECRET    | API        | Render dashboard |
| OPENAI_API_KEY          | API        | Render dashboard |
| NEXT_PUBLIC_API_URL     | Web        | Render dashboard |
| NEXT_PUBLIC_WEB_URL     | Web        | Render dashboard |
