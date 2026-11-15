-- Dedicated preview-only project. Never apply to the existing Chess-town project.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.preview_invites_v1 (
 game text not null check (game in ('haywire','logic','trivia-duel','trivia-party','checkers','chess','movies')),
 room_id text not null check (room_id ~ '^[A-Za-z0-9-]{6,64}$'),
 host_hash text not null,
 host_name text not null check (length(host_name) between 1 and 32),
 snapshot jsonb not null default '{}'::jsonb check (octet_length(snapshot::text)<=262144),
 revision bigint not null default 0,
 phase text not null default 'waiting' check (phase in ('waiting','playing','finished')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 host_seen_at timestamptz not null default now(),
 primary key(game,room_id)
);
alter table public.preview_invites_v1 enable row level security;
revoke all on public.preview_invites_v1 from anon,authenticated;
create table if not exists public.preview_invite_seats_v1 (
 game text not null, room_id text not null, seat_hash text not null,
 display_name text not null check (length(display_name) between 1 and 32),
 created_at timestamptz not null default now(),
 primary key(game,room_id,seat_hash),
 foreign key(game,room_id) references public.preview_invites_v1(game,room_id) on delete cascade
);
alter table public.preview_invite_seats_v1 enable row level security;
revoke all on public.preview_invite_seats_v1 from anon,authenticated;

create or replace function public.preview_invite_create_v1(p_game text,p_room text,p_secret text,p_name text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.preview_invites_v1;
begin
 if p_secret is null or p_secret !~ '^[a-f0-9]{64}$' then raise exception 'Invalid host recovery key'; end if;
 perform pg_advisory_xact_lock(47249201);
 delete from public.preview_invites_v1 where expires_at<=now();
 if (select count(*) from public.preview_invites_v1)>=200 and not exists(select 1 from public.preview_invites_v1 where game=p_game and room_id=p_room) then raise exception 'Preview invite capacity reached. Try again later.'; end if;
 insert into public.preview_invites_v1(game,room_id,host_hash,host_name,snapshot)
 values(p_game,p_room,encode(extensions.digest(p_secret,'sha256'),'hex'),left(trim(p_name),32),p_snapshot)
 on conflict do nothing;
 select * into r from public.preview_invites_v1 where game=p_game and room_id=p_room;
 if r.host_hash<>encode(extensions.digest(p_secret,'sha256'),'hex') then raise exception 'This room already has a host'; end if;
 if r.expires_at<=now() then raise exception 'Invite expired'; end if;
 return jsonb_build_object('game',r.game,'roomId',r.room_id,'revision',r.revision,'expiresAt',r.expires_at);
end $$;

create or replace function public.preview_invite_summary_v1(p_game text,p_room text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.preview_invites_v1;
begin
 select * into r from public.preview_invites_v1 where game=p_game and room_id=p_room;
 if not found then return jsonb_build_object('status','not-found'); end if;
 if r.expires_at<=now() then return jsonb_build_object('status','expired'); end if;
 return jsonb_build_object('status','active','game',r.game,'roomId',r.room_id,'hostName',r.host_name,'phase',r.phase,'expiresAt',r.expires_at,'hostSeenAt',r.host_seen_at,'waitingCount',(select count(*) from public.preview_invite_seats_v1 where game=p_game and room_id=p_room));
end $$;

create or replace function public.preview_invite_wait_v1(p_game text,p_room text,p_secret text,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.preview_invites_v1; h text; total integer; cap integer;
begin
 if p_secret is null or p_secret !~ '^[a-f0-9]{64}$' then raise exception 'Invalid guest recovery key'; end if;
 if p_name is null or length(trim(p_name))<1 then raise exception 'Enter your name'; end if;
 select * into r from public.preview_invites_v1 where game=p_game and room_id=p_room for update;
 if not found then raise exception 'Invite not found'; end if;
 if r.expires_at<=now() then raise exception 'Invite expired'; end if;
 h=encode(extensions.digest(p_secret,'sha256'),'hex');
 if exists(select 1 from public.preview_invite_seats_v1 where game=p_game and room_id=p_room and seat_hash=h) then
  update public.preview_invite_seats_v1 set display_name=left(trim(p_name),32) where game=p_game and room_id=p_room and seat_hash=h;
 else
  if r.phase<>'waiting' then raise exception 'This game has already started'; end if;
  select count(*) into total from public.preview_invite_seats_v1 where game=p_game and room_id=p_room;
  cap=case when p_game='logic' then 5 when p_game='trivia-party' then 4 else 1 end;
  if total>=cap then raise exception 'All guest places are taken'; end if;
  insert into public.preview_invite_seats_v1(game,room_id,seat_hash,display_name) values(p_game,p_room,h,left(trim(p_name),32));
 end if;
 return public.preview_invite_summary_v1(p_game,p_room);
end $$;

create or replace function public.preview_invite_host_v1(p_game text,p_room text,p_secret text,p_expected bigint default null,p_snapshot jsonb default null,p_phase text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.preview_invites_v1;
begin
 select * into r from public.preview_invites_v1 where game=p_game and room_id=p_room for update;
 if not found or r.host_hash<>encode(extensions.digest(coalesce(p_secret,''),'sha256'),'hex') then raise exception 'Host recovery key not accepted'; end if;
 if r.expires_at<=now() then raise exception 'Invite expired'; end if;
 if p_snapshot is not null then
  if p_expected is null or p_expected<>r.revision then return jsonb_build_object('status','conflict','revision',r.revision); end if;
  update public.preview_invites_v1 set snapshot=p_snapshot,revision=revision+1,phase=coalesce(p_phase,phase),host_seen_at=now() where game=p_game and room_id=p_room returning * into r;
 end if;
 return jsonb_build_object('status','saved','revision',r.revision,'snapshot',r.snapshot,'expiresAt',r.expires_at,'waitingGuests',coalesce((select jsonb_agg(jsonb_build_object('name',display_name,'joinedAt',created_at)) from public.preview_invite_seats_v1 where game=p_game and room_id=p_room),'[]'::jsonb));
end $$;

create or replace function public.preview_invite_delete_v1(p_game text,p_room text,p_secret text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 delete from public.preview_invites_v1 where game=p_game and room_id=p_room and host_hash=encode(extensions.digest(coalesce(p_secret,''),'sha256'),'hex');
 return found;
end $$;

revoke all on function public.preview_invite_create_v1(text,text,text,text,jsonb),public.preview_invite_summary_v1(text,text),public.preview_invite_wait_v1(text,text,text,text),public.preview_invite_host_v1(text,text,text,bigint,jsonb,text),public.preview_invite_delete_v1(text,text,text) from public;
grant execute on function public.preview_invite_create_v1(text,text,text,text,jsonb),public.preview_invite_summary_v1(text,text),public.preview_invite_wait_v1(text,text,text,text),public.preview_invite_host_v1(text,text,text,bigint,jsonb,text),public.preview_invite_delete_v1(text,text,text) to anon,authenticated;
