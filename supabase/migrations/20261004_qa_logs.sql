create table if not exists public.qa_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  match_id text,
  move_number integer,
  current_fen text not null,
  stockfish_cpl integer,
  tactic_flagged text,
  gemini_output text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd double precision,
  created_at timestamptz not null default now()
);
alter table public.qa_logs enable row level security;
drop policy if exists "qa_logs_select_own" on public.qa_logs;
drop policy if exists "qa_logs_insert_own" on public.qa_logs;
create policy "qa_logs_select_own" on public.qa_logs for select to authenticated using (auth.uid() = player_id);
create policy "qa_logs_insert_own" on public.qa_logs for insert to authenticated with check (auth.uid() = player_id);
create index if not exists qa_logs_created_at_idx on public.qa_logs (created_at desc);
