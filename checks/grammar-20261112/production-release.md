# Production release scope

User approved going live at02:19, reiterated02:22, requested remote1v1 invite at02:23 (12 November2026).

Candidate is based on live main commit b41b9c77a93860e1feaf353f189e06e5b86e752d. Only trivia route, quiz components/data, quiz-only TURN configuration endpoint and styles brought from the tested preview. Original home, arena, movie, chess, layout, shared Chester component, package files and dependencies unchanged. Quiz gets a local copy of its Chester display, not a change to shared chess UI. Existing trivia-commentary route left unchanged; no paid commentary tests.

CSS retains original production file, appending only selectors gated on body:has(.trivia-brawl-page,.trivia-party), apart from self-hosted quiz font declarations and trivia-specific animation names. No Good Together front-door promotion.

Rollback: current production deployment https://vercel.com/neillo/chess-town/CrC1Z3rKizT4xYkwJz6c5UkY5nus, original source b41b9c7. Production dashboard Instant Rollback can restore it. Production release happens after candidate preview verification. No main merge.

Spend before release: Hobby. Usage page Build Minutes0s,aggregate CPU26h12m; no attributable currency meter. No paid builder,model,image or commentary calls initiated. Local network tests intercept commentary.

Two independent browser contexts tested host/guest1v1: generated invite includes match,role,topic=grammar,difficulty=hard; guest receives authoritative settings, same question, answers and scoring settle on both. Not a two-device cross-network certificate.
