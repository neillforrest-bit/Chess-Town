# Next cohesive batch - open items ledger (as of 2026-10-25 00:47)

Deployed live (stable preview, sha 3799816): batch 182 + 182b/c/d - metallic default theme + neon toggle,
in-menu second-arrival rename, turn-aware offline chat fallback, fab/badge bottom-row lift, names via presence,
material tally, top clearance, chat drawer + WHAT SHOULD I DO NEXT chip.

## Carry-in fixes (local only, NOT deployed - parent's call when they ship)
- 182e (930765c): hide global Chester fab while battle chat drawer is open (it overlapped the Send area edge).

## Open issues to inspect/fix next batch
1. STALE ENGINE READ PRESENTED AS CURRENT ADVICE: the offline chat fallback reads bestRef, which belongs to
   the last ANALYSED position. Right after a move lands, before analysis of the new position completes, the
   fallback answers with the PREVIOUS position's best move as if current (observed live: after 2.exd5 with
   black to move, white's client got "exd5 is the move it would play" - the pre-capture read). Fix direction:
   tag bestRef with the FEN/PGN it was computed for and have the fallback say "still reading this position"
   (or use evalRef's prior-pgn logic) when they differ. Do not claim fixed until tested live with a fast ask
   immediately after a move.
2. Real-device emoji rendering untested (headless Chrome shows tofu boxes for chip/button icons).
3. Real-device software keyboard behavior with the chat drawer untested (emulation keeps viewport 390x700).
4. Clock hypothesis from earlier feedback remains open.
5. Live Chester AI route down (provider 402); offline engine fallback serving. Funding verification deferred.
6. Desktop viewport not re-run this round; broader board themes beyond metallic/neon not landed.
