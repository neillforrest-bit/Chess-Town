# Durable invites, preview build work

## State

BUILD233 (`c710796`) is deployed and verified. It repairs HAYWIRE and Logic heartbeat warnings and retries the guest seating handshake. This document describes unfinished next work, not live functionality.

A separate Supabase Free project, `Game Town Invites PREVIEW`, has been created in Europe. Its observed dashboard is https://supabase.com/dashboard/project/chsatuxnkfstvsqhzqru . The isolated schema is applied there and live HTTPS security tests pass. It is not wired into any game yet. The existing Chess-town project and its policies are unchanged. The preview project's initial branch is called `main PRODUCTION` by Supabase, but it is a separate preview-only project, not the live game database.

`supabase/preview-invites/schema.sql` must be applied only to that dedicated preview project, never by the production migration pipeline. It is deliberately outside `supabase/migrations`.

## Contract

- New invitations last seven days from creation, with an explicit date in the UI. No silent lifetime extension.
- The shared guest URL contains a random room identifier, never the private host recovery key.
- Host and guest recovery keys are separate 256-bit browser-local capabilities. The database stores their hashes. The host key is not derived from `host=1` in a URL.
- A guest can register and wait while the host is away. This does not start a game or mark the host online.
- The host can close the tab and recover the saved game later in the same browser. Cross-device host recovery is not claimed.
- Private host snapshots, including quiz answers, are never returned by the guest summary API.
- Private snapshots use compare-and-swap revisions. A stale host tab stops rather than replacing a newer game.
- Direct anonymous table reads and writes are denied. Narrow RPCs are the only client access.
- Hard preview bounds: 200 active rooms, 256KB maximum snapshot each, guest count limited to each game's seats. Expired records are removed when a new invite is created. No paid plan or production database dependency.
- Invite storage failure is a visible failure, never a claim that an invite was saved. Existing user rooms remain legacy until a deliberate supported migration exists.

## Verification completed locally

`checks/invites/storage.sql` passes against PostgreSQL14 with pgcrypto, running as the anonymous API role: direct-table denial; hidden snapshot exclusion; wrong-host rejection; guest seat deduplication; guest cap; stale revision conflict; six-day delayed join and host-away snapshot recovery; expiry rejection. The local database survives restart with the saved snapshot intact. Tests roll back or explicitly delete their QA data.

`checks/invites/client.cjs` passes: separate host/guest identities, same-browser return, frozen snapshots, serialized revisions, conflict stop, explicit missing-config/offline errors. Full app build passes with the new, currently unused client module.

The same security contract also passes on the dedicated live preview database over HTTPS with its public API key: raw table denial, private snapshot protection, wrong-host rejection, guest deduplication and revision conflict. The exact QA room was deleted and then read absent. These are not deployed end-to-end game tests. No adapter is complete.

## Adapter inventory

| Mode | Existing state and transport | Needed work |
| --- | --- | --- |
| HAYWIRE | Host realtime channel; sessionStorage machine and seat | Durable bootstrap before connect; host snapshot writer; local recovery authority and stable seat; waiting guest UI; reconnect after host return; active-round timer pause policy |
| Logic & Riddles | Host realtime; tab checkpoint with answers and lantern removals | Restore full checkpoint before opening transport; private snapshots; stable host/guest seat; waiting roster; no premature guest room acceptance |
| Trivia duel, Grammar | PeerJS host; `trivia:<id>` tab checkpoint; action IDs | Bootstrap before peer registration; preserve seen action IDs; delayed guest waiting and retry; restore question/flash clock semantics |
| Trivia Party | PeerJS host; party checkpoint includes seat tokens and seen action IDs | Same bootstrap; preserve token-to-seat map and action ledger; roster reconciliation; five-seat cap |
| Checkers Battle | PeerJS; tab board checkpoint; host encoded in URL | Host capability separate from URL role; restore board and move history before advertising host; guest waiting; move/rejoin tests |
| Live Chess Battle | Realtime; browser state plus inherited `battle_matches` row | Read adapter and ownership review first; do not widen inherited table policies; preserve seat identity, clocks and move revision; seven-day invite wrapper |
| Find Our Film / Cup | Separate movie preview and secured server-backed rooms | Inspect existing lifetime and membership semantics; adapt invitation wrapper without changing existing room policies or the parked reveal work |
| Original Movie Night | Separate server-backed `cinesync_rooms` | Existing policies are explicitly out of scope; add wrapper/recovery without policy changes, or report the missing safe path |
| Solo and pass-and-play | No shared-room invite | Ordinary app/game links, not fake multiplayer rooms |

All shared-link parsers need to accept each supported canonical route, strip host-only role parameters from guest links, and preserve the full room identifier. In particular the existing hub parser has no HAYWIRE route yet.

## Remaining verification gate

For every invite-based mode: create host; close host; guest opens the same link after a real wait and a simulated six-day-old creation; guest waits without an incorrect network warning; host returns in a fresh tab of the same browser; saved roster/state and authority restore; both join and play; retry does not duplicate seats or replay actions; wrong host and extra guest are rejected; expiry and unavailable storage are clear; inspect 320/390/430 actual pixels. Separate native iOS Safari test remains needed; phone-shaped Chromium is not native Safari.

Only then report that mode live and tested. Complete all modes before claiming the user's all-game request is done.

## Queued HAYWIRE expansion

After invite durability: clearer interactive explanation of crossed controls; longer selectable rounds; a prominent remaining-time display and 3-2-1 start; a level ladder with varied solvable wiring, a quiet teaching mode and a quick duet mode; a standalone shell using the same invite/recovery contract. Do not change the existing game's engine and invite backend together without separate regression gates. Physical phone strikes, stakes, anti-cheat and unsupported team modes are not part of the current prototype.

## Adapter checkpoint at 12:57, not deployed

Uncommitted HAYWIRE/Logic integration plus `durable-game-session.ts`, `durable-haywire.ts`, `preview-invite-store.ts`. Build passes. Preview store config is the new project's public API key and is hostname-gated away from production. New room links have `durable=1`; legacy rooms keep old handling.

`/tmp/haywire234-durable.py` passed actual live isolated-storage host-close → guest wait17s → new host tab same-browser recovery → both Ready/start → active round recovery. Screenshots `/downloads/invite234/hay-guest-wait-320.png`, `hay-host-return-390.png`. This is local app QA, not a deployed preview claim. HAYWIRE round recovery reconstructs remaining timer from the latest saved snapshot.

`/tmp/logic234-durable.py` passed host-close, guest17s waiting, host-new-tab recovery and deliberately dropped guest hello, then failed immediate reload after host Ready: remote save had not landed before reload, so readiness disappeared. This must be fixed before deployment. Add a revision-aware local write-ahead checkpoint or an explicit saved-state gate, while preserving CAS safety across multiple host tabs. Do not simply add sleep to the test or call that fixed. Check HAYWIRE for the same last-save race.

Two exact leftover QA records from failed runs were inspected and deleted (HAYWIRE ec7a5736-eb7e-4b81-a6d5-b10099845859, Logic7666d61fac954afe); dedicated preview table read back empty at12:57. Temporary database password file removed. No browser leases or server processes remain. Live deployed unified preview is still233/c710796; no adapter has been deployed. The tests use the existing public realtime project for transport, new isolated project for invite storage. Do not change existing policies.

## BUILD234 two-game stage, 13:09

HAYWIRE and Logic now use the isolated storage on new `durable=1` links. Same-browser host/seat recovery and host-away guest waiting pass against the actual preview database, including QA creation/expiry shifted to six-day-old invites before joining. Immediate Ready then reload passes in both games without a sleep. The synchronous write-ahead journal reconciles by remote revision and private writer/sequence lineage; queued save, lost acknowledgement, foreign host writer and cleanup unit checks pass. Stale competing writes stop on CAS conflict.

Logic presence now disables Ready until the current host connection is open, rather than trusting a stale rendered roster after host refresh. Its lobby is a compact phone stage; name/difficulty are in a menu and six seats paginate two at a time. 320/390/430 host/wait captures and320 six-seat pixels inspected. Hub parser preserves durable links and understands HAYWIRE.

This is only the HAYWIRE/Logic deployment stage. Trivia, Checkers, Chess and film adapters remain open. No native Safari claim. Local engine/client/build regression checks pass. Dedicated QA records were deleted and count read zero before aged tests; those tests also delete their exact records.

## BUILD236 Trivia/Grammar stage

New Trivia duel (including Grammar/sport focus) invites use durableGameSession and an isolated trivia-duel realtime namespace. Existing non-durable PeerJS links are unchanged. Private full room, seen action IDs and the stable guest seat are saved. Public snapshots are monotonic, rejoin is idempotent, periodic5s active-game resync repairs missed broadcasts, the seating retry budget remains bounded. No paid commentary is enabled on this path.

Local actual-service tests pass for mixed and Grammar: six-day-aged creation/expiry,host closed,guest17s wait,new host tab same guest link,category lock followed immediately by reload,both-answer reveal,both host/guest close and reopen new tabs preserving saved reveal/seats. Mixed320/390/430 and Grammar390 host/320 guest inspected. Short-height header/roster layout corrected after pixels exposed overlap/clipping,then retested. Build and client/channel regressions pass. Exact failed-run QA IDs inspected and deleted, never user rooms. Still not all-game complete: Party,Checkers,Chess,film remain.

## BUILD237 Party Table stage

Party Table uses durable host recovery, stable private guest identities, full snapshots, action IDs and monotonic view ordering. Ready sends name/categories/readiness as a single atomic action, so unordered packets cannot silently lock the default name or omit picks. Host returns accept newer monotonic snapshots even if guest remains open. Active deadlines retain elapsed time. All existing non-durable Party links use their original code.

Five-seat limits tested against isolated storage. A host removal persists a revocation before releasing its backend reservation; removed seats cannot reclaim that slot after reload. Host-only preview_party_release_v1 and RLS-denied preview_party_revoked_v1 are confined to the new Free preview project. No production schema/policy touched. Tests: five seats, sixth refused, removed guest rejected after reload, replacement joins, all five answer, paged reveal. Raw anonymous access to all three isolated tables denied; wrong-host release rejected.

Actual-service local tests: six-day-old creation/expiry, 17s guest wait with host away, host fresh-tab same URL return, guest stays open across a second host return, atomic mixed picks/Grammar Ready then immediate host reload, names preserved, both answers/reveal, both new-tab saved-seat/reveal restore. 320/390/430 pixels inspected. Result card overflow found in five-player320 reveal was fixed and rerun. Native Safari remains unverified. Exact failed-run QA records explicitly inspected/deleted; invite/revocation counts zero before deploy. No paid commentary.

Party is the next deployment stage, not completion of all-game work. Checkers, live Chess, movie variants and the queued HAYWIRE expansion remain.

## BUILD238 Checkers stage

New Checkers battles create a saved invite before showing a copy link. Existing non-durable duplex links, Chester solo and pass-and-play keep the legacy engine/surface. Private local capabilities decide Red host vs Black guest, never host=1 in the URL. Dedicated saved-checkers realtime namespace. Host validates full legal move paths,turn,gameId,ply and action ID; guest waits for confirmed board. Both Ready is required. Snapshot carries forced jump result,crowns,quiet count,repetition positions,last move,log,stable seat and both-player rematch votes. No unilateral active reset. Writer failure is persistent and halts host play until reload recovery.

Local actual isolated-service tests: six-day-old invite;17s guest waiting with host closed;host returns in new tab;Ready immediate reload;real a3-b4 then immediate reload;b6-a5 reply;host away while guest stays open;both new-tab same-link restored board/seat;next move;extra guest/host=1 refused. QA host-capability crown fixture verifies game-over and mutual rematch seat preservation. Simulated save503 blocks further play,remains visible across live callbacks,and reload journal restores exact fourth ply. Expired invite explicitly refused,no new board.320/390/430 pixels inspected,crown and lobby320 included. Native Safari not verified.

Engine checks cover readiness,wrong-turn/illegal/stale/duplicate rejection,forced complete multi-jump,crowning/win,both rematch votes,40-move quiet draw and threefold repetition. Solo/pass-and-play regressions pass locally. Existing deployed237 legacy non-durable game was played on both boards successfully (local legacy initially lacked Metered runtime environment,not a code regression). Repeat legacy real-move regression after238 deploy. No production schema/policy changes or paid API calls. All exact QA rooms deleted,count0 before push.
