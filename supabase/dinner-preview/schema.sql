-- Apply ONLY to Game Town Invites PREVIEW chsatuxnkfstvsqhzqru.
-- Additive isolated table. No changes to any existing table, policy or room.
create table public.dinner_faceoff_preview_v1 (
 code text primary key check(code ~ '^[A-F0-9]{12}$'),
 host_hash text not null,guest_hash text,invite_hash text not null,
 creator_hash text not null,
 state jsonb not null check(octet_length(state::text)<32768),
 actions jsonb not null default '[]',
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.dinner_faceoff_preview_v1 enable row level security;
revoke all on public.dinner_faceoff_preview_v1 from public,anon,authenticated;
