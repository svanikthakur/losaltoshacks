# AgentConnect — Product Requirements Document

## One-liner
Five AI agents validate a startup idea in under 90 seconds and return a pitch deck, market map, MVP scaffold, VC outreach list, and investor-ready PDFs — with live email tracking, on-chain signals, and co-founder matching that no single AI tool can replicate.

---

## Vision
AgentConnect is a multi-agent AI startup validation platform. A founder drops an idea, and five specialized agents — Scout, Atlas, Forge, Deck, Connect — run in parallel and sequence to produce real, downloadable artifacts grounded in live data. The platform has persistent memory (Founder DNA), cross-user intelligence (Collision Score, Co-founder Matching), and real-world integrations (SendGrid email delivery, GitHub repo creation, Pexels imagery, Solana on-chain data) that make it fundamentally impossible to replicate with a single Claude/GPT prompt, Gamma, or Lovable.

---

## Tech Stack

### Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 + TypeScript (strict) | UI rendering |
| Build | Vite 5 | Dev server + bundler |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Animation | Framer Motion 11 | Page transitions, progress bars, entrance animations |
| Charts | Recharts 3 | Radar charts, bar charts, responsive containers |
| Routing | React Router DOM 6 | SPA navigation with AnimatePresence |
| State | React hooks (useState, useEffect, useCallback, useMemo, useRef) | Local state management |
| Auth | JWT in localStorage | Token-based auth flow |

### Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js + TypeScript (strict) | Server runtime |
| Framework | Express 4 | HTTP + middleware |
| AI | OpenAI gpt-4o-mini | All 5 agents + 10 feature endpoints |
| Dev | tsx watch | Hot-reload dev server |
| PDF | pdfkit | Validation Report + Market Research PDF generation |
| Slides | pptxgenjs | Real .pptx pitch deck generation |
| ZIP | JSZip | MVP scaffold ZIP when GitHub fails |
| WebSocket | ws | Live agent status streaming |
| Auth | jsonwebtoken | JWT signing + verification |
| HTTP | axios | External API calls |

### Database
| Mode | Technology | Purpose |
|------|-----------|---------|
| Development | In-memory Maps | Zero-config local dev (auto-fallback) |
| Production | Supabase (PostgreSQL) | Persistent storage when configured |

### External APIs (all free tier)
| API | Env Variable | Purpose | Free Limit |
|-----|-------------|---------|------------|
| OpenAI | `OPENAI_API_KEY` | All agent intelligence | Pay-per-token |
| Serper | `SERPER_API_KEY` | Google Search grounding for Scout | 2,500/mo |
| Pexels | `PEXELS_API_KEY` | Real photos for pitch deck slides | 200/hr |
| SendGrid | `SENDGRID_API_KEY` | Real cold email delivery + tracking | 100/day |
| GitHub | `GITHUB_TOKEN` | Real repo creation for Forge scaffold | Unlimited |
| Product Hunt | `PRODUCT_HUNT_DEV_TOKEN` | Collision Score — recent launches | Unlimited |
| ElevenLabs | `ELEVENLABS_API_KEY` | TTS audio feedback for Voice Pitch Coach | 10k chars/mo |
| Notion | `NOTION_API_KEY` | Export full report to Notion workspace | Unlimited |
| DeFi Llama | (none — public) | Solana protocol TVL + 7d/30d changes | Unlimited |
| Solana RPC | (none — public) | Live network stats (TPS, epoch, tx count) | Rate-limited |
| YC Companies | (none — public) | 5,000+ company directory for Collision Score | Unlimited |
| Google Trends | (none — public) | Trend direction signal | Unofficial |
| ngrok | (none — free account) | Public tunnel for SendGrid webhook | 1 free domain |

---

## Theme & Design System

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-void` | `#07090D` | Page background |
| `--color-surface-1` | `#0C0F15` | Card background |
| `--color-surface-2` | `#111620` | Input fields |
| `--color-surface-3` | `#171E2C` | Elevated surfaces |
| `--color-charge` | `#00FF41` | Primary accent (Matrix green) |
| `--color-text-1` | `#ECE8DF` | Primary text (14:1 contrast) |
| `--color-text-2` | `#B3ADA2` | Secondary text (7:1 contrast) |
| `--color-text-3` | `#7E7A72` | Muted text (4.5:1 contrast) |
| `--color-border-1` | `rgba(0,255,65,0.12)` | Default borders |

### Typography
| Role | Font | Weight |
|------|------|--------|
| Display | Barlow Condensed | 600–900 |
| Body | Barlow | 300–500 |
| Mono / Labels | Fragment Mono | 400 |

### Visual Effects
- Matrix rain canvas (katakana + digits, 0.14 opacity, screen blend)
- Mouse-tracked radial heat bloom (lerped, green tint)
- Grain overlay (SVG noise, 0.5 opacity, overlay blend)
- Horizontal scan lines (repeating gradient)
- Corner targeting reticles (4 corners, 28px, green border)
- Glassmorphism cards (backdrop-blur, white/2% bg, cyan/purple glow borders)
- BorderGlow component (mesh-gradient cursor-tracking edge glow)

### Pitch Deck Theme
The Deck agent generates a **dynamic theme per idea** — not hard-coded black/neon. OpenAI picks a palette (bgColor, panelColor, inkColor, accentColor, fonts) that matches the idea's domain. Examples:
- Health tech → clinical white + deep teal
- Crypto → graphite + electric violet
- Consumer food → cream + terracotta
- DevTools → cool gray + amber

---

## Architecture

### Agent Pipeline
```
[Scout ║ Atlas]   ← Promise.all (parallel, 30s budget each)
       ↓
     Forge         ← waits for both (60s budget)
       ↓
      Deck         ← waits for Forge (90s budget)
       ↓
    Connect        ← waits for Deck (90s budget)
       ↓
  [Notion export]  ← if keys configured
       ↓
  [Auto-Pivot]     ← if Atlas opportunityScore < 50 (fire-and-forget)
```

Each agent runs through `runAgentWithTimeout()` with a soft cap. If an agent exceeds its budget, the pipeline continues with a partial flag and the original promise keeps running — when it eventually resolves, the `onLate` callback patches the DB and broadcasts the update via WebSocket.

### Agent Outputs

#### 01 Scout — Market Intelligence
| Field | Type | Description |
|-------|------|-------------|
| competitors | `ScoutCompetitor[]` | 4-6 real companies (name, stage, weakness, funding) |
| collisionScore | `number` (0-100) | Crowdedness — blended from LLM + real platform data |
| demandLevel | `'low' \| 'medium' \| 'high'` | Market demand assessment |
| differentiationAngles | `[string, string, string]` | 3 specific angles no competitor is taking |
| marketSignals | `ScoutMarketSignal[]` | 4-6 signals from trend/forum/launch/press/social/onchain |
| marketArticle | `{ headline, lede, body }` | Bloomberg-style market article |
| sources | `ScoutSource[]` | Verified sources with domain + trustScore (0-100) |
| collision | `CollisionReport` | Platform collision (PH launches + YC companies + internal ideas) |
| onchain | `SolanaSnapshot` | Solana protocol TVL + network stats (if crypto-adjacent) |

#### 02 Atlas — Market Sizing & Opportunity
| Field | Type | Description |
|-------|------|-------------|
| tam / sam / som | `string` | e.g. "$12.4B" / "$3.2B" / "$800M" |
| marketSizingRationale | `string` | 2-3 sentences explaining the math |
| topRegions | `[RegionEntry, RegionEntry, RegionEntry]` | Top 3 regions with reasoning |
| launchRegion | `string` | Best single region to launch |
| customerSegments | `CustomerSegment[]` | 3 tiers: early adopters, early majority, late majority |
| tailwinds | `[string, string, string]` | 3 macro trends helping |
| headwinds | `[string, string, string]` | 3 macro risks |
| opportunityScore | `number` (0-100) | Overall opportunity verdict |

#### 03 Forge — Technical Blueprint
| Field | Type | Description |
|-------|------|-------------|
| techStack | `TechStackEntry[]` | 5 layers: frontend, backend, db, ai, hosting |
| mvpFeatures | `MvpFeature[]` | Name, user story, complexity, estimate days |
| cutList | `string[]` | What explicitly NOT to build in v1 |
| architecture | `{ modules, dataFlow, apiEndpoints }` | Full architecture spec |
| buildRoadmap | `RoadmapPhase[]` | 4 phases summing to ~12 weeks |
| buildabilityScore | `number` (0-100) | How buildable is this? |
| repoUrl / zipUrl | `string \| null` | Real GitHub repo or downloadable .zip scaffold |

#### 04 Deck — Pitch Deck
| Field | Type | Description |
|-------|------|-------------|
| startupName | `string` | AI-generated brand name |
| oneLiner | `string` | <18 word pitch |
| elevatorPitch | `string` | 30-second pitch |
| theme | `DeckTheme` | Dynamic palette + fonts per idea |
| slides | `Slide[]` | 10 slides: section, title, content[], speakerNotes, imageUrl |
| pptxUrl | `string` | Real downloadable .pptx file |

#### 05 Connect — Investor Outreach
| Field | Type | Description |
|-------|------|-------------|
| topVCs | `ConnectInvestor[]` | 6-10 matched VCs with compatibility score + personalized draft emails |
| investorReadinessScore | `number` (0-100) | 5-dimension breakdown |
| accelerators | `AcceleratorRec[]` | 3 recommended accelerators |
| fundraisingStrategy | `FundraisingStrategy` | Amount, valuation range, timeline, notes |

---

## Features (30 total)

### Core Pipeline (5)
1. **Scout** — market intelligence from Serper + Google Trends + validated sources
2. **Atlas** — TAM/SAM/SOM + regions + customer segments + tailwinds/headwinds
3. **Forge** — tech blueprint + real GitHub repo or .zip scaffold with full code structure
4. **Deck** — 10-slide pitch deck with dynamic theme + real Pexels photos + .pptx download
5. **Connect** — 10 matched VCs + personalized cold emails + fundraising strategy

### Moat Features (9)
6. **Real Email Delivery** — SendGrid sends actual cold emails with tracking pixel
7. **VC Engagement Scoring** — open/click/bounce webhook events re-rank investor list in real time (15s polling)
8. **Solana On-Chain Signals** — DeFi Llama TVL + Solana RPC stats for crypto-adjacent ideas
9. **Platform Collision Score** — cross-references idea against Product Hunt (90d), YC directory (5,000+), and internal AgentConnect DB
10. **Founder DNA** — persistent profile (skills, risk, location, network, hours/week, priors, industry) that personalizes every agent. Strength meter grows with each session.
11. **Co-Founder Matching** — complementary skill vectors + adjacent-idea bonus + each match shows "currently building: [idea]"
12. **Auto-Pivot** — fires when Atlas opportunityScore < 50. Returns 5 ranked pivot directions with new ICP, core feature, and market size estimate.
13. **Weekly Validation Refresh** — re-runs Scout + Atlas for all saved reports, diffs scores, broadcasts deltas. Manual trigger via `/api/reports/:id/refresh`.
14. **Per-Agent Regeneration** — `POST /reports/:id/regenerate { agent: 'scout' }` re-runs a single agent using existing upstream outputs.

### AI Tools (10)
15. **A/B Headline Tester** — 5 one-liner variations scored on clarity, investor appeal, memorability
16. **Revenue Model Generator** — 5 monetization strategies (SaaS, marketplace, usage, freemium, enterprise) with MRR projections at 100/1k/10k users
17. **Competitor Deep Dive** — pick any competitor from Scout → Serper-powered teardown of pricing, weaknesses, customer complaints, positioning advice
18. **Due Diligence Checklist** — stage-specific investor checklist across legal, financial, product, market, team categories
19. **30-Day Sprint Planner** — week-by-week execution plan with tasks, time estimates, and how-to guides
20. **Co-Founder Pitch Simulator** — AI roleplays a skeptical co-founder asking 5 hard questions. Voice-enabled (Web Speech API mic per answer). Scores each answer + gives overall verdict.
21. **Voice Pitch Coach** — record up to 60s of spoken pitch via Web Speech API. AI scores clarity (1-10), confidence (1-10), structure (1-10) with line-by-line feedback. ElevenLabs TTS generates audio playback of feedback.
22. **Live Market Pulse** — Serper-powered signal detector for new competitor funding, launches, and market shifts since last check
23. **Cohort Benchmarking** — percentile rank against all AgentConnect reports. Shows avg score, top decile, and an insight sentence.
24. **Warm Intro Mapper** — generates plausible warm intro paths per VC using founder DNA (e.g. "You → ex-Google colleague → portfolio founder → Partner at Sequoia"). Color-coded by strength.

### Infrastructure (6)
25. **Source Validator** — domain allowlist/blocklist + topical overlap + trust score (0-100). Filters Serper results before they reach Scout's prompt.
26. **Fuzzy Cache** — Jaccard token-set similarity (≥0.85) matches similar ideas to skip redundant OpenAI calls
27. **ErrorBoundary** — React error boundary on the Report page surfaces render errors in-UI instead of black screen
28. **SendGrid Webhook** — `POST /api/sendgrid/webhook` processes delivered/open/click/bounce events and broadcasts via WebSocket
29. **Notion Export** — creates a structured Notion page with all 5 agent outputs (blocks batched in 100s)
30. **PDF Export** — two professional PDFs via pdfkit: Validation Report (8 pages, all agents) + Market Research (4 pages, Scout + Atlas)

---

## Report Page Layout

```
┌────────────────────────────────────────┐
│ HEADER — idea + validation score       │
├────────────────────────────────────────┤
│ QUICK STATS — 6 glassmorphic cards     │
│ (validation, opportunity, collision,   │
│  readiness, buildability, demand)      │
├───┬────────────────────────────────────┤
│01 │ SCOUT — market article + signals   │
│   │ · collision panel (PH/YC/internal) │
│   │ · Solana on-chain (if web3)        │
├───┼────────────────────────────────────┤
│02 │ ATLAS — TAM/SAM/SOM bars           │
│   │ · radar chart (6 dimensions)       │
│   │ · tailwinds vs headwinds bars      │
│   │ · region ranking (gold/silver/brz) │
│   │ · customer segment cards           │
├───┼────────────────────────────────────┤
│!! │ PIVOT (auto, if score < 50)        │
├───┼────────────────────────────────────┤
│03 │ DECK — slides + dynamic theme      │
├───┼────────────────────────────────────┤
│04 │ FORGE — tech stack + scaffold      │
├───┼────────────────────────────────────┤
│05 │ CONNECT — VC list + send buttons   │
├───┼────────────────────────────────────┤
│06 │ EXPORT — PDF downloads             │
├───┼────────────────────────────────────┤
│07 │ TOOLS — AI feature hub (10 cards)  │
└───┴────────────────────────────────────┘
```

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero + CTA |
| `/login` | Login | Email + password |
| `/signup` | Signup | Email + password + name |
| `/dashboard` | Dashboard | All reports + widgets + DNA radar |
| `/validate` | Validate | Idea input form |
| `/report/:id` | Report | RunningView → DashboardView (full report) |
| `/dna` | DNA Profile | Edit founder profile (skills, risk, location, etc.) |
| `/network` | Network | Co-founder matches |
| `/investors/:reportId` | Investors | Tracking dashboard |
| `/timeline/:reportId` | Timeline | 12-week fundraising roadmap |
| `/launchkit/:reportId` | Launch Kit | Domain suggestions + landing page HTML |

---

## API Endpoints (40+)

### Auth (public)
- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — get JWT

### Public
- `GET /health` — server health
- `GET /api/track/:token/open` — email open tracking pixel (1x1 GIF)
- `POST /api/sendgrid/webhook` — SendGrid event receiver

### Reports (auth required)
- `POST /api/reports/generate` — start pipeline
- `GET /api/reports/:id` — full report with all agent outputs
- `GET /api/reports/:id/score` — score + history
- `POST /api/reports/:id/regenerate` — re-run one or all agents
- `POST /api/reports/:id/refresh` — manual weekly refresh trigger

### Founder
- `GET /api/founder/profile` — profile data
- `PATCH /api/founder/profile` — update profile
- `GET /api/founder/validations` — list reports

### DNA
- `GET /api/dna` — DNA + strength score
- `PUT /api/dna` — update DNA fields

### Investors
- `POST /api/investors/match` — get VC list from report
- `POST /api/investors/outreach` — send real email via SendGrid
- `GET /api/investors/tracking/:reportId` — raw tracking data
- `GET /api/investors/ranked/:reportId` — VCs re-ranked by engagement

### Features (AI tools)
- `POST /api/features/ab-headlines` — 5 scored pitch variations
- `POST /api/features/revenue-models` — 5 monetization strategies
- `POST /api/features/competitor-deepdive` — full competitor teardown
- `POST /api/features/due-diligence` — investor checklist
- `POST /api/features/sprint-plan` — 30-day execution plan
- `POST /api/features/cofounder-sim/start` — start roleplay
- `POST /api/features/cofounder-sim/score` — score answers
- `POST /api/features/voice-coach` — score spoken pitch + TTS feedback
- `POST /api/features/warm-intro` — warm intro path mapping

### Pulse
- `POST /api/pulse/market-pulse` — detect market changes
- `GET /api/pulse/benchmarks/:reportId` — cohort percentile

### Export
- `GET /api/export/validation-report/:reportId` — 8-page PDF
- `GET /api/export/market-research/:reportId` — 4-page PDF
- `POST /api/export/slides` — pitch deck URL
- `POST /api/export/notion` — Notion page URL
- `POST /api/export/github` — GitHub repo URL

### Other
- `GET /api/network/matches` — co-founder matches
- `GET /api/community/benchmarks` — community avg/top scores
- `POST /api/pivot/generate` — manual pivot generation
- `POST /api/simulator/start` — investor stress test questions
- `POST /api/simulator/score` — score stress test answers
- `POST /api/timeline/generate` — 12-week fundraising roadmap
- `POST /api/launchkit/generate` — domains + landing page + waitlist

---

## Environment Variables

```env
# Server
PORT=4000
JWT_SECRET=<random-string>
FRONTEND_URL=http://localhost:5173

# AI
OPENAI_API_KEY=<required>

# Search
SERPER_API_KEY=<required for Scout>

# Images
PEXELS_API_KEY=<required for Deck slide photos>

# Email
SENDGRID_API_KEY=<required for real outreach>
SENDGRID_FROM_EMAIL=<verified sender>
SENDGRID_FROM_NAME=<display name>

# GitHub
GITHUB_TOKEN=<classic PAT with repo scope>

# Product Hunt
PRODUCT_HUNT_DEV_TOKEN=<developer token>

# Voice
ELEVENLABS_API_KEY=<optional — TTS feedback>

# Notion
NOTION_API_KEY=<optional>
NOTION_TEMPLATE_PAGE_ID=<optional>

# Database (optional — falls back to in-memory)
SUPABASE_URL=<optional>
SUPABASE_SERVICE_ROLE_KEY=<optional>

# Cron
WEEKLY_REFRESH=off|on
WEEKLY_REFRESH_MS=<override default 7 days>
```

---

## What Makes This Unreplicable

1. **Real email delivery** — SendGrid sends, tracks opens/clicks, re-ranks VCs live
2. **Real GitHub repos** — actual codebase under your account, not a mockup
3. **Live blockchain data** — Solana RPC + DeFi Llama, no other validation tool does this
4. **Persistent founder DNA** — every agent personalizes to your profile across sessions
5. **Cross-user collision** — your idea is checked against every other founder's idea on the platform
6. **Dynamic VC re-ranking** — engagement scoring from real webhook events, not static lists
7. **Voice-enabled pitch practice** — Web Speech API + ElevenLabs TTS, not text-only
8. **Platform network effects** — co-founder matching and cohort benchmarking improve with every new user
9. **Weekly living reports** — scores update as the market moves, not a frozen snapshot
10. **30+ real integrations** — not a wrapper around one LLM call; a system of systems
