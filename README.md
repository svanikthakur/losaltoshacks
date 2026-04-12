# Venture AI

Validate a startup idea in 10 minutes. 5 AI agents, one click, five real files out.

This repo has two apps:

```
frontend/   React + Vite + TS + Tailwind + Framer Motion   (animated UI)
backend/    Express + TS + WS                              (stubbed agent pipeline)
```

The backend runs **everything in stub mode** out of the box — no API keys needed. The pipeline returns plausible mock data so you can demo the end-to-end flow immediately. Swap agent bodies in `backend/src/agents/pipeline.ts` for real Gemini / ProductHunt / GitHub calls when you're ready.

---

## Quick start

Open two terminals.

**1. Backend**
```bash
cd backend
cp .env.example .env      # optional — defaults are fine for local dev
npm install
npm run dev               # → http://localhost:4000
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev               # → http://localhost:5173
```

Vite proxies `/api` and `/ws` to the backend, so the dev server just works.

---

## Try it

1. Open http://localhost:5173
2. Click **Get started** → create an account (anything works; it's in-memory)
3. Click **New idea**, paste a one-paragraph startup idea
4. Watch the 5 agents run with live-streamed logs
5. Inspect the outputs in the report page

---

## What's built vs. stubbed

| Layer | Status |
|---|---|
| Landing page, animations, pricing, CTA | ✅ real |
| Auth (signup / login / JWT) | ✅ real (bcrypt + JWT) |
| Founder profile | ✅ real (in-memory) |
| Report generation + WS streaming | ✅ real plumbing |
| Agent bodies (Scout/Atlas/Forge/Deck/Connect) | ⚠️ stubbed — return mock data |
| Persistent DB (Supabase/Postgres) | ⚠️ in-memory only |
| Real exports (.pptx, GitHub repo, Sheets) | ⚠️ mock URLs |
| BullMQ + Redis queue | ⚠️ currently runs in-process |

### Why stubs?

The stubs let you ship the UX today and swap real API calls in one file at a time without touching routes, WebSockets, or the frontend. Each agent in `backend/src/agents/pipeline.ts` is a self-contained function — replace the body, keep the `hub.emit` calls, done.

---

## Swap in real APIs

Each agent is isolated:

- **Scout** → `backend/src/agents/pipeline.ts` `runScout()` — plug in Gemini, Google Trends, ProductHunt, YC
- **Atlas** → `runAtlas()` — Gemini + scraping
- **Forge** → `runForge()` — GitHub REST API (`POST /user/repos`) + template files
- **Deck** → `runDeck()` — Google Slides API
- **Connect** → `runConnect()` — Gemini ranking + Google Sheets API export

Add keys to `backend/.env`. See `.env.example`.

---

## Deployment

- **Frontend**: Vercel (connect the `frontend/` dir, it auto-detects Vite)
- **Backend**: Railway / Render / Fly.io — just set `JWT_SECRET` and `PORT`, run `npm run build && npm start`
- Set the frontend's API base to your deployed backend (currently `/api` via Vite proxy — on prod, point at the real host)

---

## Tech stack

**Frontend**
- React 18 + Vite + TypeScript (strict)
- Tailwind CSS
- Framer Motion (scroll, hover, parallax, page transitions)
- Lucide icons
- React Router

**Backend**
- Node + Express + TypeScript
- `ws` for WebSockets
- `jsonwebtoken` + `bcryptjs` for auth
- In-memory store (swap for Supabase/Postgres)

Everything free-tier.
