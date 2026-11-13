# Checkpoint-one working state, 13 November 2026 16:36 GMT

Branch instinct/find-our-film-20261113. Preview only. Nothing pushed/deployed. Existing public previews and production untouched.

Implemented locally: isolated /find flow; strict both-player genre/exclusion and actor matching; both-ready gate; wheel with veto each; 12-card 6/4/2 target with honest smaller pools; full cards in browse/nomination/acceptance/showdown/confirm; saved Want retention; up to 3 nominations each; mutual-only showdown without random disagreement; final both consent; local remembered seat/back guard; server-owned unique username with random hashed credential; new private table migration; durable request limits; conditional GET and paused hidden/done polling; paid Orson POST hard 403 on this branch.

Live checks: inherited cinesync_rooms has anon ALL USING true WITH CHECK true. Do not change it without separate owner approval. New find_* tables have NOT been created. Server credential and TMDB key exist in Vercel Preview; values not retrieved. SQL editor corrupted two input attempts; neither was run. Supabase/Vercel browser leases released and outcomes reported.

Build and fixture tests pass, but no live DB/API test exists. API mocks cover server-owned username, both identity and seat tokens, occupied guest, direct rename refusal, CAS retry, 304, invite metadata only, rate refusal, no paid network. UI mocks cover two sessions through final mutual confirm. Phone screenshots inspected at 320/375/390. Every selection phase is full card. Fixture scores are not live and must never be represented as actual source data. Real-catalogue card pixel tests still use mocked OMDb scores. Actual iPhone Safari back gesture is unverified.

Open before release:
- Apply find-foundation.sql safely using normal UI, verify new tables' anon REST reads and writes are denied. Never fall back to anon server client.
- Verify live TMDB metadata and actor exact-resolution path. New room pool is fail-closed to live verified details only. Existing catalogue can contain stale/unreleased films; it must not be fallback.
- Improve actor coverage fairness when candidate cap is reached; current actor-film union may let one actor crowd out another. Label no/ambiguous actor match honestly.
- Reconcile curated mood labels with actual human-tag evidence; current lanes are explicitly genre-backed, not a guarantee of warm/tense tone.
- Complete username/local-storage failures, guest onboarding, retries, slow-network and resume/back tests including two actual deployed browser contexts.
- Test details/reviews/awards missing metadata; inspect genuine live scores and posters on all selection rounds. No claim of individual critic reviews.
- All phone screens should avoid scrolling. Brief page2 genre/actor and exclusions may need another staged page at 320, not tiny text or clipped controls.
- Live budget/rate guard and server hard-zero-model test before any sharing. Other old routes inherited; audit side effects before using them.
- Commit/push one cohesive batch only after QA. New build has no usable link yet.

Held: community library, watched ratings, email recovery, Game Town-wide landing, Discover treasure hunt. Snack Time Backlot source read-only at /tmp/snack-readonly-20261113, published revision filerevision-01M5YZ786VFZZBJ0WZFW70HY1R. No Snack changes allowed. Actual Backlot sorts Up next by priority, Watched by own review; viewer-local collection.v1, not shared DB. Reuse later, no clone build now.

Spend: zero paid model calls. Spreadsheet Usage & Spend Monitor row204 records today's local session, provider cost delta not measured. Approved GBP5 ceiling / GBP1 QA remains unused.
