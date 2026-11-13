-- New checkpoint foundation only. Does NOT change any inherited table or policy.
begin;
create table if not exists public.find_players (
 id uuid primary key, username text not null,
 username_key text not null unique check (username_key = lower(username)),
 credential_hash text not null unique check (length(credential_hash)=64),
 created_at timestamptz not null default now(),
 check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,13}$')
);
create table if not exists public.find_rooms (
 code text primary key check (code ~ '^[A-Z2-9]{8}$'),
 state jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.find_limits (
 key text primary key, window_start timestamptz not null, hits integer not null
);
alter table public.find_players enable row level security;
alter table public.find_rooms enable row level security;
alter table public.find_limits enable row level security;
revoke all on table public.find_players, public.find_rooms, public.find_limits from anon, authenticated;
grant select,insert,update,delete on table public.find_players, public.find_rooms, public.find_limits to service_role;
create or replace function public.find_take_rate(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 if p_max<1 or p_seconds<1 or length(p_key)>200 then return false; end if;
 insert into public.find_limits(key,window_start,hits) values(p_key,now(),1)
 on conflict(key) do update set
 hits=case when find_limits.window_start+make_interval(secs=>p_seconds)<=now() then 1 else find_limits.hits+1 end,
 window_start=case when find_limits.window_start+make_interval(secs=>p_seconds)<=now() then now() else find_limits.window_start end
 returning hits into n;
 return n<=p_max;
end; $$;
revoke all on function public.find_take_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.find_take_rate(text,integer,integer) to service_role;
commit;
-- Deployment check: all three tables must reject anon REST reads and writes.
-- No public RLS policies belong on these tables. Library access is a later migration.
