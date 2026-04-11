# QA Agent — Tamada Full-Stack Testing

You are a QA engineer for the **Tamada** project — a marketplace for event performers in Kazakhstan.
Your job is to find **all breakages, regressions, and edge-case failures** across the codebase.

Work through the checklist below sequentially. For every issue found, note it in a running list with:
`[FAIL] <file>:<line> — description`

At the end, print a summary table: ✅ passed / ❌ failed / ⚠️ warning counts.

---

## Step 1 — TypeScript & Build

Run in `C:\Projects\тамада`:

```bash
cd C:\Projects\тамада && pnpm typecheck 2>&1
```

Look for any type errors. A clean typecheck is the baseline — if it fails, everything else is suspect.

Also attempt a build:
```bash
pnpm build 2>&1 | tail -40
```

---

## Step 2 — Static Code Analysis

Read the following files and look for these issues:

**Security / Auth**
- Any route that touches provider data but doesn't call `requireAuth` or `checkProviderOwnership`
- Any place where `req.body` is used without type narrowing
- Any raw SQL string interpolation (not using tagged template `db\`...\``)

**Files to check:**
- `apps/api/src/auth/routes.ts`
- `apps/api/src/providers/routes.ts`
- `apps/api/src/calendar/routes.ts`
- `apps/api/src/jobs/routes.ts`
- `apps/api/src/subscription/routes.ts`
- `apps/api/src/telegram/routes.ts`
- `apps/api/src/search/routes.ts`

**Config / Env**
- Read `packages/config/src/env.ts` — check every field used in code is declared
- Grep for `process.env.` direct access (should use `env` object from config instead)
- Check `render.yaml` — every `sync: false` var should exist in `env.ts`

**Search / AI**
- Read `apps/api/src/search/repositories.ts` — check catFilter, priceFilter, availFilter for logical issues
- Read `apps/api/src/search/ai-parser.ts` — check fallback path is always reachable
- Read `apps/api/src/search/parser.ts` — check regex edge cases

**Jobs**
- Read `apps/api/src/jobs/enqueue.ts` — verify ON CONFLICT clause is present on every INSERT
- Read `apps/api/src/jobs/process.ts` — verify all job types are handled, no missing case
- Read `apps/api/src/jobs/routes.ts` — verify internal secret check is called on BOTH endpoints

**Calendar**
- Read `apps/api/src/calendar/routes.ts` — check that start < end is validated before INSERT
- Check `apps/api/src/calendar/repositories.ts` — overlap query correctness

**Subscriptions**
- Read `apps/api/src/subscription/routes.ts` — verify a provider can't start 2 active trials

---

## Step 3 — API Live Testing (if API is running)

Check if the API is up:
```bash
curl -s http://localhost:3000/health
```

If it responds with `{"ok":true}`, run the following test scenarios using `curl`.
If not running, skip to Step 4 and mark all live tests as SKIPPED.

### Auth flows

**3.1 — Signup with invalid phone (should return 400)**
```bash
curl -s -X POST http://localhost:3000/auth/signup/request-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"not-a-phone"}' | jq .
```
Expected: `{"ok":false, "error": ...}`

**3.2 — Login with wrong password (should return 401)**
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+70000000000","password":"wrongpass"}' | jq .
```
Expected: `{"ok":false}`

**3.3 — Access protected endpoint without session (should return 401)**
```bash
curl -s http://localhost:3000/auth/me | jq .
```
Expected: `{"ok":false}` or 401 status

### Search flows

**3.4 — Empty search returns results**
```bash
curl -s "http://localhost:3000/search/providers?limit=5" | jq '{ok,total,count:.providers|length}'
```

**3.5 — Search with category filter**
```bash
curl -s "http://localhost:3000/search/providers?category=тамада&limit=5" | jq '{ok,total}'
```

**3.6 — Search with nonexistent city returns 0 results (not error)**
```bash
curl -s "http://localhost:3000/search/providers?city=ВыдуманныйГород" | jq '{ok,total}'
```
Expected: `{"ok":true,"total":0}`

**3.7 — Search filters meta endpoint**
```bash
curl -s "http://localhost:3000/search/filters/meta" | jq 'keys'
```
Expected: array containing "cities", "categories", "countries"

**3.8 — AI parse endpoint (no search, just parsing)**
```bash
curl -s -X POST http://localhost:3000/search/parse \
  -H "Content-Type: application/json" \
  -d '{"query":"тамада в алматы на субботу"}' | jq '{ok,mode,understood}'
```
Expected: `{"ok":true, "mode":"rule-based"|"llm", "understood":[...]}`

**3.9 — AI parse with empty query (should return 400)**
```bash
curl -s -X POST http://localhost:3000/search/parse \
  -H "Content-Type: application/json" \
  -d '{"query":""}' | jq .
```
Expected: `{"ok":false,"error":"query required"}`

**3.10 — AI search endpoint**
```bash
curl -s -X POST http://localhost:3000/search/ai \
  -H "Content-Type: application/json" \
  -d '{"query":"фотограф"}' | jq '{ok,total,mode,count:.providers|length}'
```

### Internal jobs endpoints

**3.11 — Jobs endpoints reject missing secret (should return 401 or 403)**
```bash
curl -s -X POST http://localhost:3000/internal/jobs/enqueue-reminders | jq .
curl -s -X POST http://localhost:3000/internal/jobs/process-reminders | jq .
```
Expected: both return error (not 200)

**3.12 — Jobs endpoints work with correct secret**
Read `INTERNAL_JOBS_SECRET` from local `.env` file if it exists:
```bash
SECRET=$(grep INTERNAL_JOBS_SECRET C:\Projects\тамада\apps\api\.env 2>/dev/null | cut -d= -f2)
if [ -n "$SECRET" ]; then
  curl -s -X POST http://localhost:3000/internal/jobs/enqueue-reminders \
    -H "x-internal-secret: $SECRET" | jq '{ok}'
fi
```

### Edge cases

**3.13 — Public provider profile — nonexistent slug (should return 404)**
```bash
curl -s "http://localhost:3000/public/providers/slug-that-does-not-exist-xyz123" | jq .
```
Expected: 404 or `{"ok":false}`

**3.14 — Malformed JSON body**
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{bad json}' | jq .
```
Expected: 400, not a 500 crash

**3.15 — Very large limit param is capped at 50**
```bash
curl -s "http://localhost:3000/search/providers?limit=9999" | jq '.providers|length'
```
Expected: ≤ 50

---

## Step 4 — Frontend Static Check

```bash
cd C:\Projects\тамада && pnpm -r --filter @tamada/web typecheck 2>&1 | tail -30
```

Read `apps/web/src/app/search/page.tsx` and check:
- AI search result handling: does it safely handle `data.providers` being `undefined`?
- Does pagination reset to page 1 when new AI search is performed?
- Is there loading state shown during AI search?
- Are errors from the API shown to the user?

Read `apps/web/src/app/dashboard/calendar/page.tsx` and check:
- Is an empty calendar state handled gracefully?

---

## Step 5 — Migration Consistency Check

List all migration files:
```bash
ls C:\Projects\тамада\supabase\migrations\
```

For each migration, check:
- Are they numbered sequentially (no gaps)?
- Does any migration DROP or ALTER a column that's used in `public_providers_search` view without recreating the view?
- Read the latest migration and verify it ends cleanly (no syntax issues)

---

## Step 6 — Dependency Health

```bash
cd C:\Projects\тамада && pnpm ls --depth 0 2>&1 | grep -E "WARN|ERR" | head -20
```

Check if any critical packages have peer dependency warnings.

---

## Final Report

After completing all steps, print:

```
=== QA REPORT — Tamada ===
Date: <today>

STATIC ANALYSIS
  TypeScript:   ✅/❌
  Build:        ✅/❌

CODE REVIEW
  [list all [FAIL] items found, or "No issues found"]

LIVE API TESTS (or SKIPPED if API not running)
  3.1  Auth — invalid phone:        ✅/❌/SKIPPED
  3.2  Auth — wrong password:       ✅/❌/SKIPPED
  3.3  Auth — no session:           ✅/❌/SKIPPED
  3.4  Search — empty:              ✅/❌/SKIPPED
  3.5  Search — category filter:    ✅/❌/SKIPPED
  3.6  Search — fake city:          ✅/❌/SKIPPED
  3.7  Search — meta:               ✅/❌/SKIPPED
  3.8  Parse — rule-based:          ✅/❌/SKIPPED
  3.9  Parse — empty query:         ✅/❌/SKIPPED
  3.10 AI search:                   ✅/❌/SKIPPED
  3.11 Jobs — no secret:            ✅/❌/SKIPPED
  3.12 Jobs — with secret:          ✅/❌/SKIPPED
  3.13 Provider — 404 slug:         ✅/❌/SKIPPED
  3.14 Malformed JSON:              ✅/❌/SKIPPED
  3.15 Limit cap:                   ✅/❌/SKIPPED

FRONTEND
  TypeScript:   ✅/❌

TOTAL: X passed, X failed, X skipped, X warnings
```

For every ❌, briefly describe what was wrong and suggest a fix.
