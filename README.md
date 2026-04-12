# Venture AI

> Five AI agents validate a startup idea in under 90 seconds — returning a pitch deck, market map, live website, VC outreach with real email tracking, and investor-ready PDFs.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991)](https://openai.com/)
[![APIs](https://img.shields.io/badge/APIs-13%20integrations-green)]()

---

## What is this?

Venture AI is a multi-agent startup validation platform. You type one idea. Five specialized AI agents run in parallel to produce **real, downloadable artifacts** — not just text output:

- A **10-slide pitch deck** (.pptx) with dynamic theming and real Pexels imagery
- A **market research report** grounded in live Google Search, Product Hunt, and YC data
- A **technical blueprint** with architecture, roadmap, and a deployed live website
- **Personalized cold emails** sent to matched VCs via SendGrid with open/click tracking
- **Professional PDFs** — 8-page validation report and 4-page market research

No other tool can do this. Claude gives you text. Gamma gives you slides. Lovable gives you a UI. Venture AI gives you a validated business with real artifacts, all grounded in live data.

---

## Quick Start

```bash
# Clone
git clone https://github.com/svanikthakur/losaltoshacks.git
cd losaltoshacks

# Backend
cd backend
cp .env.example .env        # fill in your API keys
npm install
npm run dev                  # → http://localhost:4000

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev                  # → http://localhost:5173
```

Open `http://localhost:5173`, sign up, and validate your first idea.

---

## Architecture

```
frontend/   React 18 + Vite + TypeScript + Tailwind + Framer Motion + Recharts
backend/    Express + TypeScript + WebSocket + pdfkit + pptxgenjs
```

### Agent Pipeline

```
[Scout || Atlas]   ← parallel (30s budget each)
       ↓
     Forge          ← waits for both (60s budget)
       ↓
      Deck          ← waits for Forge (90s budget)
       ↓
    Connect         ← waits for Deck (90s budget)
       ↓
  [Notion export]   ← if configured
       ↓
  [Auto-Pivot]      ← if opportunity score < 50
```

Each agent runs through a soft-timeout orchestrator. If an agent exceeds its budget, the pipeline continues and the agent's result patches in via a late-arrival background callback.

---

## The 5 Agents

| # | Agent | What it does | Key output |
|---|-------|-------------|------------|
| 01 | **Scout** | Market intelligence — Serper search, source validation, competitor mapping, collision scoring against Product Hunt + YC + internal DB, Solana on-chain signals | Competitors, collision score, market article, differentiation angles |
| 02 | **Atlas** | Market sizing — TAM/SAM/SOM, top regions, customer segments, tailwinds/headwinds, opportunity score | Market size, opportunity 0-100, launch region |
| 03 | **Forge** | Technical blueprint — architecture, tech stack, MVP features, 12-week roadmap + deployed live website via Vercel | Blueprint + live app URL |
| 04 | **Deck** | Pitch deck — 10 slides with dynamic theme per idea, real Pexels photos, downloadable .pptx | Branded pitch deck |
| 05 | **Connect** | VC outreach — 10 matched VCs with personalized cold emails, readiness score, accelerator picks, fundraising strategy | Emails sent via SendGrid with tracking |

---

## 30 Features

### Core Pipeline
1. Scout — market intelligence from live search + validated sources
2. Atlas — TAM/SAM/SOM + regions + segments + tailwinds/headwinds
3. Forge — technical blueprint + deployed live website
4. Deck — 10-slide pitch deck with dynamic theme + Pexels imagery + .pptx
5. Connect — 10 matched VCs + personalized emails + fundraising strategy

### Moat Features (things no single AI tool can replicate)
6. **Real email delivery** — SendGrid sends actual cold emails with tracking pixel
7. **VC engagement scoring** — webhook events re-rank investor list by open/click in real time
8. **Solana on-chain signals** — DeFi Llama TVL + Solana RPC for crypto-adjacent ideas
9. **Platform collision score** — cross-references against Product Hunt (90d), YC (5,000+), and internal DB
10. **Founder DNA** — persistent profile that personalizes every agent across sessions
11. **Co-founder matching** — complementary skill vectors + shows what each match is building
12. **Auto-pivot** — fires 5 ranked pivot directions when opportunity < 50
13. **Weekly validation refresh** — re-scores as market conditions change
14. **Per-agent regeneration** — re-run any single agent without restarting the pipeline

### AI Tools
15. A/B headline tester — 5 scored pitch variations
16. Revenue model generator — 5 strategies with MRR projections
17. Competitor deep dive — Serper-powered teardown of any competitor
18. Due diligence checklist — stage-specific investor checklist
19. 30-day sprint planner — execution roadmap with task guides
20. Co-founder pitch simulator — voice-enabled roleplay + scoring
21. Voice pitch coach — 60s recording + AI scoring + ElevenLabs audio feedback
22. Live market pulse — detect new competitors and funding rounds
23. Cohort benchmarking — percentile rank against all platform users
24. Warm intro mapper — plausible intro paths to target VCs

### Infrastructure
25. Source validator — domain allowlist/blocklist + trust scoring
26. Fuzzy cache — Jaccard similarity skips redundant API calls
27. Error boundary — surfaces render errors instead of black screen
28. SendGrid webhook — processes open/click/bounce events in real time
29. Notion export — full report as a structured Notion page
30. PDF export — 8-page validation report + 4-page market research via pdfkit

---

## 13 API Integrations (all free tier)

| API | Purpose |
|-----|---------|
| **OpenAI** (gpt-4o-mini) | All agent intelligence + 10 feature tools |
| **Serper** | Google Search grounding for Scout |
| **Pexels** | Real photos for pitch deck slides |
| **SendGrid** | Cold email delivery + open/click/bounce webhooks |
| **GitHub** | Real repo creation with full scaffold |
| **Vercel** | One-click website deployment |
| **Product Hunt** | Collision score from recent launches |
| **ElevenLabs** | Text-to-speech audio feedback |
| **Notion** | Workspace export |
| **DeFi Llama** | Solana protocol TVL data |
| **Solana RPC** | Live network stats |
| **YC Companies** | 5,000+ company directory |
| **Google Trends** | Trend direction signal |

---

## Report Page Layout

```
┌────────────────────────────────────────┐
│ HEADER — idea + validation score       │
├────────────────────────────────────────┤
│ QUICK STATS — 6 glassmorphic cards     │
├───┬────────────────────────────────────┤
│01 │ SCOUT — market article + collision │
├───┼────────────────────────────────────┤
│02 │ ATLAS — charts + regions + segments│
├───┼────────────────────────────────────┤
│!! │ PIVOT (auto, if score < 50)        │
├───┼────────────────────────────────────┤
│03 │ DECK — slides + dynamic theme      │
├───┼────────────────────────────────────┤
│04 │ FORGE — blueprint + live app       │
├───┼────────────────────────────────────┤
│05 │ CONNECT — VC list + send buttons   │
├───┼────────────────────────────────────┤
│06 │ EXPORT — PDF downloads             │
├───┼────────────────────────────────────┤
│07 │ TOOLS — AI feature hub             │
└───┴────────────────────────────────────┘
```

---

## Environment Variables

```env
# Required
OPENAI_API_KEY=              # Powers all agents
SERPER_API_KEY=              # Scout search grounding
JWT_SECRET=                  # Auth signing (use a 64-char random hex)

# Recommended
PEXELS_API_KEY=              # Deck slide photos
SENDGRID_API_KEY=            # Real email delivery
SENDGRID_FROM_EMAIL=         # Verified sender address
GITHUB_TOKEN=                # Repo creation (classic PAT, repo scope)
VERCEL_TOKEN=                # Website deployment
PRODUCT_HUNT_DEV_TOKEN=      # Collision score

# Optional
ELEVENLABS_API_KEY=          # Voice coach TTS feedback
NOTION_API_KEY=              # Notion export
NOTION_TEMPLATE_PAGE_ID=     # Notion parent page
SUPABASE_URL=                # Persistent DB (falls back to in-memory)
SUPABASE_SERVICE_ROLE_KEY=   # Supabase auth
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#07090D` | Page base |
| Surface | `#0C0F15` | Cards |
| Accent | `#00FF41` | Matrix green |
| Text | `#ECE8DF` | Primary (14:1 contrast) |
| Display font | Barlow Condensed | Headlines |
| Body font | Barlow | Paragraphs |
| Mono font | Fragment Mono | Labels + data |

Visual effects: matrix rain canvas, mouse-tracked heat bloom, grain overlay, scan lines, glassmorphism cards with cursor-tracking edge glow.

---

## What Makes This Unreplicable

1. **Real email delivery** — SendGrid sends, tracks opens/clicks, re-ranks VCs live
2. **Live blockchain data** — Solana RPC + DeFi Llama, no other validation tool does this
3. **Persistent founder DNA** — every agent personalizes to your profile across sessions
4. **Cross-user collision** — your idea is checked against every other founder on the platform
5. **Dynamic VC re-ranking** — engagement scoring from real webhook events
6. **Voice-enabled pitch practice** — Web Speech API + ElevenLabs TTS
7. **Platform network effects** — co-founder matching improves with every new user
8. **Weekly living reports** — scores update as the market moves
9. **30+ real integrations** — not a wrapper around one LLM call; a system of systems

---

## Tech Stack

**Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3, Framer Motion 11, Recharts 3, React Router 6

**Backend:** Node.js, Express 4, TypeScript, pdfkit, pptxgenjs, JSZip, ws, jsonwebtoken, axios, @sendgrid/mail

**Database:** In-memory (Supabase PostgreSQL adapter ready)

**Deployment:** Vercel (frontend) + Railway (backend)

---

Built at Los Altos Hacks 2025.
