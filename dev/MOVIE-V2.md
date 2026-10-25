# Movie Time V2 - build ledger (branch instinct/movie-v2-wip, deploys to movie-night preview)

## Slice 1 (tonight): trust-first invariant
- hr state { wilds, sealed }; strict defaults: wilds=false, sealed=true.
- Strict: rollWildcard only ever rolls Blind Bet (no entrants); bustDone never swaps in an unchosen replacement (path is currently unreachable - bustIntent retired - gated defensively).
- Opt-in (hr.wilds=true): GENRE SWAP / Resurrection / bust replacements fire WITH ceremony log lines.
- Probe: dev/probes/probe-invariant.js (15/15 PASS) - strict vs opt-in across 400 seeded rolls, swap origin/ceremony, bust both modes, bracket construction all-player-picked incl. veto-trimmed edge.
- Repro commands: npx tsc -p dev/probes/tsconfig.probe.json (outDir /tmp/mvout), sed @/ path prefixes to relative in /tmp/mvout/{lib,utils}, node /tmp/mvout/probe-invariant.js.

## Next (morning slice): Cold Open (Act I) + Orson's Reveal (finale) + House Rules lobby UI (hr intent already in reducer).

## Hidden Doors (user idea 02:03, phonemsg-01M5RCR6EP4E3SP3KJFNH78VH2) - NEXT SLICE, NOT IN SLICE 1
Design rule (main-endorsed): door 1 = keep the known matchup, door 2 = mystery. The reveal is an OFFER, not an automatic replacement; players can reject; nothing enters the bracket without explicit acceptance. Natural home: replaces GENRE SWAP's automatic swap when hr.wilds is on - swap becomes a two-stage offer (doors) then accept/keep. Deferred from slice 1 to protect the 06:00 handoff: the consent flow deserves the full two-stage treatment, and the strict default already closes the trust hole.

## Open test debt for morning: fcall/fsettle score matrix (missing/invalid/equal -> void/push), sealed/unsealed + per-card reveal, Cold Open beat->intent mapping, solo-bot fcall.
