\set ON_ERROR_STOP on
begin;
set role anon;
select public.preview_invite_create_v1('haywire','qa-durable-room',repeat('a',64),'Host QA','{"hiddenAnswer":"not-for-guests","round":2}');
do $$ begin
 if public.preview_invite_summary_v1('haywire','qa-durable-room')->>'status'<>'active' then raise exception 'summary failed'; end if;
 if public.preview_invite_summary_v1('haywire','qa-durable-room') ? 'snapshot' then raise exception 'private snapshot disclosed'; end if;
 begin perform snapshot from public.preview_invites_v1; raise exception 'raw read was allowed'; exception when insufficient_privilege then null; end;
 begin perform public.preview_invite_host_v1('haywire','qa-durable-room',repeat('b',64)); raise exception 'wrong host accepted'; exception when raise_exception then if sqlerrm='wrong host accepted' then raise; end if; end;
 perform public.preview_invite_wait_v1('haywire','qa-durable-room',repeat('c',64),'Guest QA');
 perform public.preview_invite_wait_v1('haywire','qa-durable-room',repeat('c',64),'Guest QA returned');
 if (public.preview_invite_summary_v1('haywire','qa-durable-room')->>'waitingCount')::int<>1 then raise exception 'rejoin duplicated seat'; end if;
 begin perform public.preview_invite_wait_v1('haywire','qa-durable-room',repeat('d',64),'Third'); raise exception 'third seat accepted'; exception when raise_exception then if sqlerrm='third seat accepted' then raise; end if; end;
 if public.preview_invite_host_v1('haywire','qa-durable-room',repeat('a',64))->'snapshot'->>'hiddenAnswer'<>'not-for-guests' then raise exception 'host recovery failed'; end if;
 if public.preview_invite_host_v1('haywire','qa-durable-room',repeat('a',64),0,'{"round":3}','playing')->>'revision'<>'1' then raise exception 'update failed'; end if;
 if public.preview_invite_host_v1('haywire','qa-durable-room',repeat('a',64),0,'{"round":1}','waiting')->>'status'<>'conflict' then raise exception 'stale overwrite allowed'; end if;
 if public.preview_invite_delete_v1('haywire','qa-durable-room',repeat('d',64)) then raise exception 'wrong deletion accepted'; end if;
end $$;
reset role;
update public.preview_invites_v1 set created_at=now()-interval '6 days',host_seen_at=now()-interval '6 days' where room_id='qa-durable-room';
set role anon;
select public.preview_invite_wait_v1('haywire','qa-durable-room',repeat('c',64),'Delayed guest');
do $$ begin
 if public.preview_invite_host_v1('haywire','qa-durable-room',repeat('a',64))->'snapshot'->>'round'<>'3' then raise exception 'host-away recovery failed'; end if;
end $$;
reset role;
update public.preview_invites_v1 set expires_at=now()-interval '1 second' where room_id='qa-durable-room';
set role anon;
do $$ begin
 if public.preview_invite_summary_v1('haywire','qa-durable-room')->>'status'<>'expired' then raise exception 'expiry not surfaced'; end if;
 begin perform public.preview_invite_wait_v1('haywire','qa-durable-room',repeat('c',64),'Too late'); raise exception 'expired join accepted'; exception when raise_exception then if sqlerrm='expired join accepted' then raise; end if; end;
end $$;
reset role;
rollback;
select 'PASS anon denial,private snapshots,wrong host,guest dedup,seat cap,CAS,6-day host-away recovery,expiry' as result;
