# Architecture

## Overview

```
Browser → tamada-web (Next.js, Render)
             ↓ fetch
tamada-api (Fastify, Render)
             ↓ postgres.js
Supabase (PostgreSQL + Auth + Storage)
```

## Apps

### apps/api
- Fastify v5
- Entry: src/main.ts → parseEnv() → createApp() → listen()
- Health: GET /health, GET /api/health
- Reads env via @tamada/config (Zod)

### apps/web
- Next.js 15, App Router
- Entry: src/app/page.tsx
- Health: GET /api/health (Next.js route handler)
- output: standalone for Docker

## Packages

| Package           | Purpose                              |
|-------------------|--------------------------------------|
| @tamada/config    | Zod env schema + parseEnv()          |
| @tamada/types     | Shared TypeScript types              |
| @tamada/utils     | Shared utility functions             |

## Database

- Provider: Supabase (PostgreSQL)
- Migrations: /supabase/migrations/ (versioned SQL files)
- Schema reference: /supabase/schema.sql
- Connection: postgres.js with `prepare: false` (PgBouncer compatible)

## Deploy (Render)

- Both services use multi-stage Docker builds
- Env vars set in Render dashboard (sync: false for secrets)
- Health checks ensure zero-downtime deploys

## Env Variables

| Key                    | Where set      |
|------------------------|----------------|
| NODE_ENV               | render.yaml    |
| APP_BASE_URL           | Render dashboard |
| DATABASE_URL           | Render dashboard |
| DATABASE_DIRECT_URL    | Render dashboard |
| SUPABASE_URL           | Render dashboard |
| SUPABASE_ANON_KEY      | Render dashboard |
| SUPABASE_SERVICE_ROLE_KEY | Render dashboard |
