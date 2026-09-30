-- 001_listing_freshness_agent.sql
-- Listing Freshness Agent (v1) for saunasinireland.com
-- All tables are service-role only (RLS on, no policies). Nothing here is read by the public app.

-- 1. Registry: a mirror of LOCATIONS in src/features/location/data/locations.ts.
--    locations.ts stays the source of truth for the app in v1; the agent reads this mirror.
create table if not exists public.agent_listing_registry (
  location_id     text primary key,          -- = Location.id (same value booking_clicks.location_id uses)
  sauna_name      text not null,
  sauna_url       text not null,
  place_name      text not null,             -- = Location.name
  county          text,
  country         text,
  lat             double precision,
  lon             double precision,
  active          boolean not null default true,
  last_checked_at timestamptz,
  updated_at      timestamptz not null default now()
);

-- 2. One row per invocation of the agent.
create table if not exists public.agent_runs (
  id               uuid primary key default gen_random_uuid(),
  agent            text not null default 'listing-freshness',
  mode             text not null default 'live' check (mode in ('live','eval')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null default 'running'
                   check (status in ('running','completed','failed','budget_exceeded','time_exceeded')),
  listings_checked int not null default 0,
  llm_calls        int not null default 0,
  input_tokens     int not null default 0,
  output_tokens    int not null default 0,
  web_searches     int not null default 0,
  model            text,
  prompt_version   text,
  summary          jsonb,
  error            text
);

-- 3. Full trace: every precheck, model call, tool call, tool result and finding.
create table if not exists public.agent_run_steps (
  id          bigserial primary key,
  run_id      uuid not null references public.agent_runs(id) on delete cascade,
  location_id text,
  step_no     int not null,
  kind        text not null check (kind in ('precheck','llm_call','tool_call','tool_result','finding','error')),
  name        text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists agent_run_steps_run_idx on public.agent_run_steps(run_id);

-- 4. What the agent observed each time it checked a listing (history for diffing).
create table if not exists public.listing_snapshots (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references public.agent_runs(id) on delete set null,
  location_id text not null references public.agent_listing_registry(location_id),
  checked_at  timestamptz not null default now(),
  http_status int,
  final_url   text,
  url_kind    text check (url_kind in ('website','booking_platform','social','unknown')),
  used_llm    boolean not null default false,
  verdict     text not null,
  confidence  numeric(3,2),
  evidence    jsonb
);
create index if not exists listing_snapshots_loc_idx on public.listing_snapshots(location_id, checked_at desc);

-- 5. The approval queue. The agent only ever writes here. Mike approves/rejects.
create table if not exists public.listing_update_proposals (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references public.agent_runs(id) on delete set null,
  location_id    text not null references public.agent_listing_registry(location_id),
  created_at     timestamptz not null default now(),
  verdict        text not null,
  field          text not null check (field in ('saunaUrl','saunaName','name','active','none')),
  current_value  text,
  proposed_value text,
  confidence     numeric(3,2) not null,
  rationale      text not null,
  evidence_urls  text[] not null default '{}',
  status         text not null default 'pending'
                 check (status in ('pending','approved','rejected','applied','superseded')),
  reviewed_at    timestamptz,
  review_note    text
);
create unique index if not exists one_pending_proposal_per_field
  on public.listing_update_proposals(location_id, field) where status = 'pending';

-- 6. Eval set: known listings with a known-correct verdict. Only confirmed rows are used.
create table if not exists public.agent_eval_cases (
  location_id      text primary key references public.agent_listing_registry(location_id),
  expected_verdict text not null,
  notes            text,
  confirmed        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Review helper: newest pending proposals first, with click volume for prioritising.
create or replace view public.listing_review_queue as
select p.id, p.created_at, p.location_id, r.sauna_name, r.place_name, p.verdict, p.field,
       p.current_value, p.proposed_value, p.confidence, p.rationale, p.evidence_urls,
       coalesce(c.clicks_90d, 0) as clicks_90d
from public.listing_update_proposals p
join public.agent_listing_registry r using (location_id)
left join (
  select location_id, count(*) as clicks_90d
  from public.booking_clicks
  where created_at > now() - interval '90 days'
  group by location_id
) c using (location_id)
where p.status = 'pending'
order by clicks_90d desc, p.confidence desc, p.created_at desc;

-- Lock everything down: service role only.
alter table public.agent_listing_registry   enable row level security;
alter table public.agent_runs               enable row level security;
alter table public.agent_run_steps          enable row level security;
alter table public.listing_snapshots        enable row level security;
alter table public.listing_update_proposals enable row level security;
alter table public.agent_eval_cases         enable row level security;
revoke all on public.listing_review_queue from anon, authenticated;
