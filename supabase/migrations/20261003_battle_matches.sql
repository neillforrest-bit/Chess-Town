-- Battle Mode: durable copy of each match's synced state so a reload survives cleared storage.
create table if not exists public.battle_matches (
  match_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.battle_matches enable row level security;
-- Matches are addressed by an unguessable 8-char id in the invite link; anon may read/write a row by id.
drop policy if exists "battle_matches_select" on public.battle_matches;
drop policy if exists "battle_matches_insert" on public.battle_matches;
drop policy if exists "battle_matches_update" on public.battle_matches;
create policy "battle_matches_select" on public.battle_matches for select to anon, authenticated using (true);
create policy "battle_matches_insert" on public.battle_matches for insert to anon, authenticated with check (true);
create policy "battle_matches_update" on public.battle_matches for update to anon, authenticated using (true) with check (true);
