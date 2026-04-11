-- AgentConnect schema. Run once in Supabase SQL editor.
-- Matches the in-memory store in /src/db/memory.ts for a drop-in swap.

create extension if not exists "uuid-ossp";

-- ───── founders ────────────────────────────────────────────
create table if not exists founders (
  id              uuid primary key default uuid_generate_v4(),
  email           text unique not null,
  name            text,
  password_hash   text,
  skills          text[]   default '{}',
  risk_tolerance  text     check (risk_tolerance in ('low','medium','high')),
  location        text,
  industry_focus  text,
  network_size    int      default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ───── reports ─────────────────────────────────────────────
create table if not exists reports (
  id               uuid primary key default uuid_generate_v4(),
  founder_id       uuid references founders(id) on delete cascade,
  idea_text        text not null,
  validation_score int  default 0 check (validation_score between 0 and 10),
  status           text default 'pending'
                   check (status in ('pending','running','complete','failed')),
  scout_output     jsonb,
  atlas_output     jsonb,
  forge_output     jsonb,
  deck_output      jsonb,
  connect_output   jsonb,
  deck_url         text,
  notion_url       text,
  github_repo_url  text,
  pdf_report_url   text,
  pitch_deck_url   text,
  investor_sheet_url text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ───── vc_matches ──────────────────────────────────────────
create table if not exists vc_matches (
  id                   uuid primary key default uuid_generate_v4(),
  report_id            uuid references reports(id) on delete cascade,
  vc_name              text,
  firm                 text,
  email                text,
  compatibility_score  int,
  thesis_match         text,
  outreach_sent_at     timestamptz,
  created_at           timestamptz default now()
);

-- ───── email_tracking ──────────────────────────────────────
create table if not exists email_tracking (
  id                    uuid primary key default uuid_generate_v4(),
  vc_match_id           uuid references vc_matches(id) on delete cascade,
  tracking_token        text unique not null default gen_random_uuid()::text,
  opened_at             timestamptz,
  clicked_at            timestamptz,
  time_on_deck_seconds  int default 0,
  forwarded_at          timestamptz,
  created_at            timestamptz default now()
);

-- ───── pivot_suggestions ───────────────────────────────────
create table if not exists pivot_suggestions (
  id               uuid primary key default uuid_generate_v4(),
  report_id        uuid references reports(id) on delete cascade,
  pivot_idea       text not null,
  market_size_est  text,
  competitor_gap   text,
  pitch_angle      text,
  rank             int,
  created_at       timestamptz default now()
);

-- ───── community_data ──────────────────────────────────────
create table if not exists community_data (
  id                     uuid primary key default uuid_generate_v4(),
  category               text not null,
  avg_raise_usd          bigint,
  median_months_to_raise int,
  top_vc_firms           text[] default '{}',
  sample_size            int    default 0,
  updated_at             timestamptz default now()
);

-- ───── founder_matches ─────────────────────────────────────
create table if not exists founder_matches (
  id                  uuid primary key default uuid_generate_v4(),
  founder_a_id        uuid references founders(id),
  founder_b_id        uuid references founders(id),
  compatibility_score int,
  match_reason        text,
  created_at          timestamptz default now()
);

-- ───── score_history ───────────────────────────────────────
create table if not exists score_history (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid references reports(id) on delete cascade,
  score       int not null,
  recorded_at timestamptz default now()
);
