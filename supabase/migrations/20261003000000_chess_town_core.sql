-- Chess-Town core schema: profiles, games, player_dossier.
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to read top to bottom.

-- 1. PROFILES (one row per auth user; owner column is `id`) ---------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  blunder_threshold double precision not null default -1.5, -- pawns; Chester's freeze sensitivity, auto-calibrated later
  created_at timestamptz not null default now()
);

-- 2. GAMES (owner column is `player_id`) ------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  pgn text not null,
  accuracy double precision,
  effort_letter_grade text,
  verdict_title text,
  created_at timestamptz not null default now()
);
create index games_player_created_idx on public.games (player_id, created_at desc);

-- 3. PLAYER_DOSSIER (recurring leaks; owner column is `player_id`) -----------------------
create table public.player_dossier (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  tactic_missed text not null,              -- e.g. FORK, PIN, BACK-RANK
  frequency integer not null default 1 check (frequency >= 1),
  last_seen_move_number integer,            -- ply of the latest offense, for the Redemption Drill
  updated_at timestamptz not null default now(),
  unique (player_id, tactic_missed)         -- one row per leak per player, so frequency can increment
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_dossier_touch_updated_at
before update on public.player_dossier
for each row execute function public.touch_updated_at();

-- 3b. ATOMIC "BUMP" FOR THE DOSSIER ------------------------------------------------------
-- supabase-js .upsert() can only overwrite a column, it cannot say "frequency = frequency + 1".
-- This function does the insert-or-increment in one atomic statement. It is SECURITY INVOKER,
-- so RLS still applies and a user can only ever touch their own rows.
create or replace function public.bump_dossier(p_tactic text, p_move_number integer)
returns public.player_dossier
language sql
security invoker
set search_path = ''
as $$
  insert into public.player_dossier as d (player_id, tactic_missed, frequency, last_seen_move_number)
  values ((select auth.uid()), upper(btrim(p_tactic)), 1, p_move_number)
  on conflict (player_id, tactic_missed) do update
    set frequency = d.frequency + 1,
        last_seen_move_number = excluded.last_seen_move_number
  returning d.*;
$$;
revoke all on function public.bump_dossier(text, integer) from public, anon;
grant execute on function public.bump_dossier(text, integer) to authenticated;

-- 4. AUTO-CREATE A PROFILE ON SIGN-UP ----------------------------------------------------
-- security definer: runs with the function owner's rights, because the new user has no session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. ROW LEVEL SECURITY: authenticated users read/insert/update ONLY their own rows -------
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.player_dossier enable row level security;

-- profiles: owner column is id
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- games: owner column is player_id
create policy "games_select_own" on public.games
  for select to authenticated using (player_id = (select auth.uid()));
create policy "games_insert_own" on public.games
  for insert to authenticated with check (player_id = (select auth.uid()));
create policy "games_update_own" on public.games
  for update to authenticated using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));

-- player_dossier: owner column is player_id
create policy "dossier_select_own" on public.player_dossier
  for select to authenticated using (player_id = (select auth.uid()));
create policy "dossier_insert_own" on public.player_dossier
  for insert to authenticated with check (player_id = (select auth.uid()));
create policy "dossier_update_own" on public.player_dossier
  for update to authenticated using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));
-- No delete policies on purpose (spec asks for select/insert/update only).
