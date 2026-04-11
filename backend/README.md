# AgentConnect Backend (v0.2)

Five-agent startup validation pipeline. Zero paid AI — runs on local Ollama.

```
/src
  /agents           Scout, Atlas, Forge, Deck, Connect (Scout + Atlas real; rest stubbed)
  /routes           auth, reports, investors, export, founder, community, pivot, trends, calendar
  /services         ai.ts (Ollama), serper.ts, trends.ts
  /db               memory store + schema.sql for Supabase swap
  /queue            pipeline runner (in-process; BullMQ-ready)
  /middleware       auth (JWT), errorHandler
  /types            shared interfaces
  websocket.ts      room-based broadcast (/ws/agent/:reportId)
  index.ts          Express entry
```

## Prereqs

- Node 20+
- Ollama running locally: `ollama serve`
- Models pulled: `ollama pull llama3.1` (required for Phase 1)
- Optional: `ollama pull mistral deepseek-coder` for Phase 2+
- Optional: Supabase project (otherwise in-memory store)
- Optional: Serper API key (otherwise agents get mocked search results)

## Setup

```bash
cp .env.example .env
npm install
npm run dev          # :4000
```

## What's wired right now

| Route | Status |
|---|---|
| `POST /api/auth/signup` | real (bcrypt + JWT) |
| `POST /api/auth/login`  | real |
| `GET  /api/founder/profile` | real |
| `GET  /api/founder/validations` | real |
| `POST /api/reports/generate` | real — schedules pipeline |
| `GET  /api/reports/:id` | real |
| `GET  /api/reports/:id/score` | real |
| `WS   /ws/agent/:reportId` | real — streams log + status |
| `POST /api/investors/match` | reads `connect_output` |
| `POST /api/investors/outreach` | 501 Phase 2 |
| `POST /api/export/*` | returns stashed URLs |
| `GET  /api/trends/:idea` | real (Serper + Trends) |
| `POST /api/pivot/generate` | reads `atlas_output.pivots` |
| `POST /api/calendar/push` | 501 Phase 4 |
| `GET  /api/track/:token/open` | real — 1×1 tracking pixel |

## Pipeline

```
POST /api/reports/generate
  ↓
reports row created (status: pending)
  ↓ 400ms delay (lets the client open its WebSocket)
  ↓
Scout  → Serper + Trends + llama3.1
Atlas  → llama3.1 (consumes Scout)
Forge  → stub (Phase 2)
Deck   → stub (Phase 2)
Connect → stub (Phase 2)
  ↓
status: complete → { type: 'complete' } on WS
```

## WebSocket event shapes

```json
{ "type": "hello",    "reportId": "..." }
{ "type": "log",      "agent": "scout", "msg": "..." }
{ "type": "status",   "agent": "scout", "status": "running"  }
{ "type": "status",   "agent": "scout", "status": "complete", "output": { ... } }
{ "type": "complete" }
{ "type": "error",    "msg": "..." }
```

These shapes match what the existing frontend listens for — no client changes required.

## Phase 1 test

```bash
# 1. ensure ollama has llama3.1
ollama list

# 2. start backend
npm run dev

# 3. in another terminal:
curl -s -X POST localhost:4000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.c","password":"hunter2","name":"Ada"}' | jq
# -> { token, user }

TOKEN=...   # paste from above

curl -s -X POST localhost:4000/api/reports/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"idea":"An AI tutor for high schoolers learning calculus"}' | jq
# -> { reportId }

# 4. open the frontend and watch agents stream
```

## Swap in Supabase

1. Create a Supabase project → SQL editor → run `src/db/schema.sql`
2. Fill `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Implement `src/db/supabase.ts` against the `memoryStore` method surface (see `src/db/memory.ts`)
4. Re-export it as `db` from `src/db/index.ts`

No route code needs to change.

## Swap in BullMQ

1. Provision Upstash Redis → copy URL into `REDIS_URL`
2. Replace the `setTimeout` branch in `src/queue/pipeline.ts` with a real `Queue` + `Worker`

## Rules

- All Ollama calls go through `src/services/ai.ts` — never call the SDK directly from an agent.
- All JSON parsing uses `extractJSON()` — local models wrap output in markdown fences.
- When a free tier is exceeded, services degrade gracefully (Serper → mocked results, Trends → neutral placeholder) so the pipeline never crashes.
