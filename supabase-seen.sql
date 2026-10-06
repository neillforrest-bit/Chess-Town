-- CineSync Variety Engine step 1: couple memory of seen titles. Run once in the Supabase SQL editor.
create table if not exists public.cinesync_seen (
  couple text not null,
  kind text not null default 'movie',
  seen_ids integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (couple, kind)
);
alter table public.cinesync_seen enable row level security;  -- no anon policy: only the server (service role) can read or write
create or replace function public.cinesync_seen_add(c text, k text, ids integer[]) returns void
language plpgsql security definer as $$
begin
  insert into public.cinesync_seen as t (couple, kind, seen_ids) values (c, k, ids)
  on conflict (couple, kind) do update set
    seen_ids = (select coalesce(array_agg(x order by o), '{}') from (
      select x, min(o) as o from unnest(t.seen_ids || excluded.seen_ids) with ordinality as u(x, o) group by x) q),
    updated_at = now();
end $$;
revoke all on function public.cinesync_seen_add(text, text, integer[]) from public, anon, authenticated;
