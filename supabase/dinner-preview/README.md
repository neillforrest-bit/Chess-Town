# Dinner Face-off Preview storage

This isolated additive table is in the separate Game Town Invites PREVIEW project only (`chsatuxnkfstvsqhzqru`). No production database, existing tables, rooms or policies were changed. SQL is recorded in `schema.sql`; `rollback.sql` drops only this table, without CASCADE.

The server refuses database connection URLs for another project. Only branch-specific Vercel Preview environment `DINNER_PREVIEW_DATABASE_URL` supplies its credential. No database credential enters client bundles. TLS validates the Supabase CA. Browser credentials are random private seats, stored locally and hashed on the server; names are display-only. RLS and table grants deny public, anon and authenticated access.

Limits: 100 active rooms globally, 10 per source IP, 24-hour expiry, 32KB state, 128 action receipts. Both phones poll at five seconds only while visible and playing, with ETag responses; polling stops on a result/closed screen. This is a small Preview, not a production-scale load test. Two phones can issue up to 24 GETs/minute while actively playing. There are no LLM or paid-provider calls. Quota exhaustion can interrupt a game; no plan upgrade is enabled.

Flow tested via independent browser contexts and server requests: private seats, third-seat refusal, duplicate names, concurrent picks/votes, hidden choices, idempotent action receipts, split/revote, complete bracket, both-confirm final, rejected-all fresh deals, exhausted catalogue restart, stale final rejection and saved-seat reload. Reconnect replays a locally journaled uncertain action before reading state. No cross-device account recovery; clearing storage loses the private seat.

Decision ideas only. No real restaurant data, ordering, booking, full recipes or allergy-safety claim. Small fixed catalogue.
