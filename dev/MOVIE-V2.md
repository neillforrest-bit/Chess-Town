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

## Slice 1 build log (02:40-02:50 leg)
- ColdOpen.tsx mounted: 5 beats (Star Call type-ahead from catalogue actor index, Spectrum nightly rotation, Trophy or Trash, Swipe Three posters, Orson's Read) -> same sliders/tropes/taste intents; taste fires only after vibe.passed (engine gate), probe-covered.
- Lobby House Rules toggles (host A): WILDCARD ENTRANTS strict-by-default, SEALED SCORES on-by-default -> 'hr' intent.
- Reveal.tsx mounted in final phase when hr.sealed && !revealed: two calls (critics=RT Tomatometer, audiences=IMDb), host (pid A) fetches /api/omdb for both finalists with catalogue backstop, fsettle; skip plainly labelled "for both of us".
- Sealing: Scores gains sealed prop (RT/IMDb -> lock, tap-to-peek per card, local only); draft card, bracket cards, grenade strip, detail sheet sealed until final reveal or phase done; critics line hidden while sealed.
- Envelope results (fin.callLog / skipped note) render above the final pick screen.
- `co?: boolean` on State (undefined === on), carried through reset.
- Verification so far: tsc --noEmit clean, next build clean, 63/63 engine probes green (invariant 15, coldopen 17, reveal 17, coldopen-lib 14).
- NOT yet verified: any live rendering of the new UI (local two-client run next), 820x1000 pass, preview deploy.
- Debt: SoloRoom Scores left unsealed (legacy solo flow); OMDb-vs-catalogue provenance not surfaced in callLog; licence for scores-as-gameplay-input still unverified (product question, not code).

## 2026-10-25 04:14 GMT ruling (main, load-bearing): viewing confirmation + full seal
- "chips win bragging rights; you still choose what to watch": bracket/bids keep their champion
  (s.winner, championship history untouched), but tonight's actual viewing (s.tonight) is set
  ONLY when both players explicitly pick the same finalist on the post-verdict confirm screen.
- Split stays visibly unresolved: both picks shown, champion offered on the table, re-pick allowed.
  No silent force, no autojudge override. Classic pitch result cannot override confirmation either.
- Nuclear veto double-agree (both name titan or both name gem) IS the confirmation -> sets tonight.
  Defused veto keeps the champion and leaves tonight unconfirmed.
- Rematch / new final resets tonight + watch picks.
- Sealed mode seals ALL numeric ratings (RT, IMDb, Metacritic, TMDB) with tap-to-peek in the Scores
  tiles; hitlist/bout tapes/nukepick/draft cards show "sealed" instead of numbers. Synopsis, cast and
  taste fit still explain an unknown film. Do NOT call the mode "fully hidden scores" - peek exists.
- Probes: dev/probes/probe-fwatch.js (15 checks). Full suite 85/85 green at implementation.
