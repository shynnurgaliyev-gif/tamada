# CLAUDE.md — Instructions for AI assistant

## Project
Тамада — платформа для организации мероприятий.
Monorepo: pnpm workspaces. Stack: Fastify API + Next.js Web + Supabase + Render.

## Rules
- Проект делаем поэтапно — не плодить папки без причины
- Сначала смотреть текущую структуру, потом менять
- После каждого этапа обновлять docs/
- Secrets только через Render Environment Variables, никогда в код
- Весь SQL — только в /supabase/migrations/ и /supabase/schema.sql
- Reference проект: C:\Projects\Aqsha_AI (паттерны, НЕ копировать слепо)
  - subscription patterns
  - render setup
  - supabase setup

## Structure
```
apps/api     — Fastify API (port 3000)
apps/web     — Next.js (port 3001)
packages/config  — Zod env validation + parseEnv()
packages/types   — Domain types
packages/utils   — Shared utilities
supabase/        — Migrations + schema
docs/            — This file + architecture
```

## Commands
```bash
pnpm dev          # run all apps in parallel
pnpm build        # build all
pnpm typecheck    # type check all
pnpm lint         # lint all
```

## Health endpoints
- API:  GET /health  →  { status, service, env }
- API:  GET /api/health  →  same
- Web:  GET /api/health  →  { status, service, env }

## Deploy
- API → Render web service via apps/api/Dockerfile
- Web → Render web service via apps/web/Dockerfile
- DB  → Supabase (run migrations manually via Supabase SQL editor or CLI)
