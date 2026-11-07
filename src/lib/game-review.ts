// GAME REVIEW (stage A) - whole-game analysis of an imported Chess.com game with the same
// Stockfish client Chester uses, stored locally. Separate identity from ct-player-file-v1:
// these are the player's online games, not "You vs Chester" dojo games.
// Framing rule (applies to every consumer of these numbers): an eval loss is what ONE engine
// (Stockfish 18, EXPERT preset, depth-capped grading search) measured in that position. It is
// NOT proof of why a human went wrong - the commentary layer interprets patterns, the engine
// layer measures lines. Keep the two visibly separate in copy.
import { Chess } from 'chess.js';
import type { StockfishClient, EngineTelemetry } from './stockfish';
import type { CcGame, ParsedMove } from './chesscom';

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
/** Engine telemetry hands back PV moves as UCI despite the *San field name; convert via chess.js. */
function uciToSan(fen: string, uci: string): string | null {
  if (!UCI_RE.test(uci)) return uci; // already SAN or odd - keep as-is
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv ? mv.san : null;
  } catch { return null; }
}
function uciLineToSans(fen: string, ucis: string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of ucis.slice(0, 6)) {
      if (!UCI_RE.test(u)) break;
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });
      if (!mv) break;
      out.push(mv.san);
    }
  } catch { /* keep what converted */ }
  return out;
}

export type ReviewedPly = {
  ply: number;
  san: string;
  uci: string;
  mover: 'w' | 'b';
  isUser: boolean;
  fenBefore: string;
  fenAfter: string;
  clkSec: number | null;
  classification: EngineTelemetry['classification'];
  evalDelta: number | null;       // centipawns, mover-relative loss from the grading search
  bestMoveSan: string | null;
  continuation: string[];         // engine's top continuation after the played move
  /** White-absolute centipawns AFTER this move (null when mate). For the trajectory strip. */
  whiteCpAfter: number | null;
  mateInAfter: number | null;
  provisional?: boolean;
  /** chess.js-verified game end delivered BY this move - a fact, not an engine grade. */
  terminal?: 'mate' | 'draw' | 'settled';
};

export type ReviewedGame = {
  gameUrl: string;
  analyzedAt: number;
  meta: Omit<CcGame, 'pgn'>;
  engineLabel: string;            // e.g. "Stockfish 18, depth-12 grading" - shown with every number
  plies: ReviewedPly[];
};

// v1 retained untouched: its mixed-perspective scores require fresh analysis.
const STORE_KEY = 'ct-game-review-v2';
const STORE_CAP = 8;

export function loadReviews(): ReviewedGame[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveReview(review: ReviewedGame) {
  try {
    const rest = loadReviews().filter((r) => r.gameUrl !== review.gameUrl);
    rest.unshift(review);
    localStorage.setItem(STORE_KEY, JSON.stringify(rest.slice(0, STORE_CAP)));
  } catch { /* full storage - analysis still shows, just not kept */ }
}

/** Analyze every ply of both sides (turning points need the opponent's grades too).
 *  The client has its own sequential queue; we still await one at a time so progress is real. */
export async function analyzeGame(
  engine: StockfishClient,
  game: CcGame,
  moves: ParsedMove[],
  onProgress: (done: number, total: number) => void,
): Promise<ReviewedGame> {
  const plies: ReviewedPly[] = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const after = new Chess(m.fenAfter);
    if (after.isCheckmate()) {
      // Delivering mate is chess.js-verifiable fact, not an engine estimate: never grade it,
      // never mark it unconfirmed, never send it through a capped search.
      plies.push({
        ply: m.ply, san: m.san, uci: m.uci, mover: m.mover, isUser: m.mover === game.userColor,
        fenBefore: m.fenBefore, fenAfter: m.fenAfter, clkSec: m.clkSec,
        classification: 'BEST', evalDelta: 0, bestMoveSan: m.san, continuation: [],
        whiteCpAfter: null, mateInAfter: 0, terminal: 'mate',
      });
      onProgress(i + 1, moves.length);
      continue;
    }
    const terminalDraw = after.isStalemate() || after.isDraw();
    const t = await engine.evaluateMove({
      fenBefore: m.fenBefore, fenAfter: m.fenAfter, san: m.san, uci: m.uci,
      playerColor: m.mover, difficulty: 'EXPERT',
    });
    const moverSign = m.mover === 'w' ? 1 : -1;
    plies.push({
      ply: m.ply, san: m.san, uci: m.uci, mover: m.mover, isUser: m.mover === game.userColor,
      fenBefore: m.fenBefore, fenAfter: m.fenAfter, clkSec: m.clkSec,
      classification: t.classification, evalDelta: t.evalDelta,
      bestMoveSan: t.bestMoveSan ? uciToSan(m.fenBefore, t.bestMoveSan) : null,
      continuation: uciLineToSans(m.fenAfter, t.continuation ?? []),
      whiteCpAfter: t.evaluationAfter,
      // Downstream review copy expects mover-relative mate, unlike the normalized API field.
      mateInAfter: t.evaluationMateAfter == null ? null : t.evaluationMateAfter * moverSign,
      provisional: t.provisional,
      terminal: terminalDraw ? 'draw' : undefined,
    });
    onProgress(i + 1, moves.length);
  }
  // Games that end without a board-terminal position (resignation, timeout, abandonment,
  // or a draw by agreement/repetition that chess.js cannot detect): the last played ply
  // still marks the end. 'settled' = proven decisive result, position not played out.
  const last = plies[plies.length - 1];
  if (last && !last.terminal) last.terminal = game.result === 'draw' ? 'draw' : 'settled';
  return {
    gameUrl: game.url, analyzedAt: Date.now(),
    meta: (() => { const { pgn: _drop, ...rest } = game; void _drop; return rest; })(),
    engineLabel: 'Stockfish 18 - EXPERT grading (depth-capped)', plies,
  };
}

export type TurningPoint = {
  ply: ReviewedPly;
  kind: 'missed' | 'thrown';    // missed = user's big loss; thrown = opponent's gift
  prev: ReviewedPly | null;
};

/** Biggest swings, both directions, capped. "Thrown" positions are where the user should
 *  have punished - often the most instructive moments for a ~500-rated player. */
export function turningPoints(review: ReviewedGame, cap = 5): TurningPoint[] {
  const pts: TurningPoint[] = [];
  for (let i = 0; i < review.plies.length; i++) {
    const p = review.plies[i];
    if (p.evalDelta == null || p.evalDelta < 150) continue;
    pts.push({ ply: p, kind: p.isUser ? 'missed' : 'thrown', prev: i > 0 ? review.plies[i - 1] : null });
  }
  return pts
    .sort((a, b) => (b.ply.evalDelta ?? 0) - (a.ply.evalDelta ?? 0))
    .slice(0, cap)
    .sort((a, b) => a.ply.ply - b.ply.ply);
}

export type ClockReport = {
  avgSecPerMove: number | null;
  avgOpening: number | null; avgMiddle: number | null; avgEndgame: number | null;
  rushedCount: number;      // user moves played in under 10s after move 6
  rushedMistakes: number;   // of those, graded MISTAKE or BLUNDER - pattern evidence, small sample
};

export function clockReport(review: ReviewedGame): ClockReport {
  const none: ClockReport = { avgSecPerMove: null, avgOpening: null, avgMiddle: null, avgEndgame: null, rushedCount: 0, rushedMistakes: 0 };
  // Untimed (daily/correspondence) games carry no meaningful per-move clock - no section.
  if (review.meta.timeClass === 'daily') return none;
  const userPlies = review.plies.filter((p) => p.isUser);
  const withThink: { p: ReviewedPly; think: number }[] = [];
  for (let i = 0; i < review.plies.length; i++) {
    const p = review.plies[i];
    if (!p.isUser || p.clkSec == null) continue;
    // Clock before MY move = opponent's clock after their move (or start of game).
    const prev = i > 0 ? review.plies[i - 1] : null;
    const before = prev?.clkSec ?? null;
    if (before == null) continue;
    withThink.push({ p, think: Math.max(0, before - p.clkSec) });
  }
  const byPhase = (lo: number, hi: number) => {
    const xs = withThink.filter((w) => w.p.ply > lo && w.p.ply <= hi).map((w) => w.think);
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  };
  const rushed = withThink.filter((w) => w.p.ply > 6 && w.think < 10);
  return {
    avgSecPerMove: withThink.length ? Math.round(withThink.reduce((a, w) => a + w.think, 0) / withThink.length) : null,
    avgOpening: byPhase(0, 20), avgMiddle: byPhase(20, 999),
    avgEndgame: null,
    rushedCount: rushed.length,
    rushedMistakes: rushed.filter((w) => w.p.classification === 'MISTAKE' || w.p.classification === 'BLUNDER').length,
  };
}

/** Engine winning-chance estimate from a white-absolute centipawn eval, via the formula
 *  Lichess publishes on https://lichess.org/page/accuracy (fitted to real game data).
 *  Semantics kept honest wherever shown: an engine-standpoint estimate assuming
 *  engine-level play from here; a balanced position reads 50/50 with draws folded in.
 *  NOT an empirical win probability for club players. */
export function whiteWinPct(cp: number | null): number | null {
  if (cp == null) return null;
  const c = Math.max(-1500, Math.min(1500, cp));
  return Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1));
}

export type ScorecardEntry = { ply: ReviewedPly; userPct: number | null; delta: number | null; unstable: boolean };
/** Per-move scorecard from the USER's perspective: winning-chance estimate after each ply
 *  and the shift that move caused. Terminal plies are chess.js-proven facts: delivered mate
 *  reads 100/0, a drawn game reads null (settled, no number). An engine-READ mate (not on
 *  the board) shows no percentage - the UI names it as an engine read instead.
 *  delta compares only with the immediately preceding ply's reading (never an older one).
 *  unstable: the measured loss at THIS node contradicts the node-to-node swing (a big-graded
 *  loss whose mover's reading rose, or a best-graded move whose reading crashed) - a known
 *  capped-depth artifact in sharp positions, so the UI shows a caution instead of a delta. */
export function scorecard(review: ReviewedGame): ScorecardEntry[] {
  const userMover = review.meta.userColor; // 'w' | 'b'
  const out: ScorecardEntry[] = [];
  let prev: number | null = 50;
  let prevWhiteMate: number | null = null;
  for (const p of review.plies) {
    let pct: number | null;
    if (p.terminal === 'mate') pct = p.mover === userMover ? 100 : 0;
    else if (p.terminal === 'draw' || p.terminal === 'settled') pct = null;
    else if (p.mateInAfter != null) pct = null;
    else {
      const w = whiteWinPct(p.whiteCpAfter);
      pct = w == null ? null : userMover === 'w' ? w : 100 - w;
    }
    const delta = pct != null && prev != null ? pct - prev : null;
    let unstable = false;
    if (delta != null && p.evalDelta != null) {
      const moverDelta = p.mover === userMover ? delta : -delta;
      // Directional contradiction at any half-pawn-plus graded loss is never coherent:
      // if the engine says the mover lost ground, the mover's scorecard cannot improve.
      if (p.evalDelta >= 50 && moverDelta > 8) unstable = true;
      if (p.evalDelta <= 30 && moverDelta < -25) unstable = true;
    }
    // Mate reads: convert to white-absolute (stored mover-relative) and flag when the
    // claimed mating side flips between consecutive reads - capped-depth contradiction,
    // so no side gets named for that ply.
    if (!p.terminal && p.mateInAfter != null) {
      const whiteMate = p.mover === 'w' ? p.mateInAfter : -p.mateInAfter;
      if (prevWhiteMate != null && Math.sign(whiteMate) !== Math.sign(prevWhiteMate)) unstable = true;
      prevWhiteMate = whiteMate;
    } else if (p.whiteCpAfter != null) {
      prevWhiteMate = null;
    }
    // Quick-pass-only grades are unconfirmed by design - their numbers are not shown either.
    if (p.provisional && !p.terminal) unstable = true;
    out.push({ ply: p, userPct: pct, delta: unstable ? null : delta, unstable });
    prev = pct;
  }
  // Instability propagates one ply each way FROM THE ORIGINAL FLAGS ONLY (snapshot first):
  // a contradiction between two nodes makes BOTH reads suspect, and a delta measured
  // against a suspect read is itself unreliable. Newly-marked neighbours do not spread it
  // further - one flagged node must not cascade-suppress the rest of the game.
  const seeds = out.map((e) => e.unstable);
  for (let i = 0; i < out.length; i++) {
    if (!seeds[i]) continue;
    if (i > 0 && !out[i - 1].ply.terminal) { out[i - 1] = { ...out[i - 1], unstable: true, delta: null }; }
    if (i < out.length - 1 && !out[i + 1].ply.terminal) { out[i + 1] = { ...out[i + 1], unstable: true, delta: null }; }
  }
  return out;
}

export type PlayerMeasure = { graded: number; avgLossCp: number | null; blunders: number; mistakes: number };
/** Plain measured numbers per player: average engine-read loss (cp) over graded, non-terminal
 *  moves, plus blunder/mistake counts. No conversion to any rating scale. */
export function playerMeasure(review: ReviewedGame, isUser: boolean): PlayerMeasure {
  const mine = review.plies.filter((p) => p.isUser === isUser);
  // Settled (resignation/timeout) final plies are still real played, graded moves: they count.
  const scored = mine.filter((p) => p.evalDelta != null && p.terminal !== 'mate' && p.terminal !== 'draw');
  return {
    graded: scored.length,
    avgLossCp: scored.length ? Math.round(scored.reduce((a, p) => a + (p.evalDelta ?? 0), 0) / scored.length) : null,
    blunders: mine.filter((p) => p.classification === 'BLUNDER').length,
    mistakes: mine.filter((p) => p.classification === 'MISTAKE').length,
  };
}

/** Cheeky closing verdict keyed ONLY to the measured numbers shown beside it. The endpoint
 *  phrases are the user's own requested scale; the middle rungs are flavour keyed to loss
 *  bands, not a quantitative claim. */
export function verdictFor(m: PlayerMeasure): string {
  const cp = m.avgLossCp;
  if (cp == null) return 'not enough measured moves to call it';
  if (cp <= 45 && m.blunders === 0) return 'ok, time to take on the grand masters';
  if (cp <= 75) return 'a tidy scorecard this game';
  if (cp <= 110) return 'a few wobbles in this one';
  if (cp <= 150) return 'some costly choices in this one';
  if (cp <= 200) return 'too many costly choices this game';
  return 'hm is this your first game?';
}

export function classCounts(review: ReviewedGame): { label: string; n: number }[] {
  const user = review.plies.filter((p) => p.isUser);
  const measured = (c: EngineTelemetry['classification']) =>
    c === 'BRILLIANT' || c === 'BEST' ? 'BEST' : c === 'GREAT' ? 'GOOD' : c === 'INACCURACY' ? 'SLIP' : c;
  const order = ['BEST', 'GOOD', 'SLIP', 'MISTAKE', 'BLUNDER'];
  return order.map((label) => ({ label, n: user.filter((p) => measured(p.classification) === label).length }));
}
