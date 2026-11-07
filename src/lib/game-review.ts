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
  terminal?: 'mate' | 'draw';
};

export type ReviewedGame = {
  gameUrl: string;
  analyzedAt: number;
  meta: Omit<CcGame, 'pgn'>;
  engineLabel: string;            // e.g. "Stockfish 18, depth-12 grading" - shown with every number
  plies: ReviewedPly[];
};

const STORE_KEY = 'ct-game-review-v1';
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
        ply: m.ply, san: m.san, mover: m.mover, isUser: m.mover === game.userColor,
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
      ply: m.ply, san: m.san, mover: m.mover, isUser: m.mover === game.userColor,
      fenBefore: m.fenBefore, fenAfter: m.fenAfter, clkSec: m.clkSec,
      classification: t.classification, evalDelta: t.evalDelta,
      bestMoveSan: t.bestMoveSan ? uciToSan(m.fenBefore, t.bestMoveSan) : null,
      continuation: uciLineToSans(m.fenAfter, t.continuation ?? []),
      whiteCpAfter: t.centipawns == null ? null : t.centipawns * moverSign,
      mateInAfter: t.mateIn ?? null,
      provisional: t.provisional,
      terminal: terminalDraw ? 'draw' : undefined,
    });
    onProgress(i + 1, moves.length);
  }
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

export function classCounts(review: ReviewedGame): { label: string; n: number }[] {
  const user = review.plies.filter((p) => p.isUser);
  const measured = (c: EngineTelemetry['classification']) =>
    c === 'BRILLIANT' || c === 'BEST' ? 'BEST' : c === 'GREAT' ? 'GOOD' : c === 'INACCURACY' ? 'SLIP' : c;
  const order = ['BEST', 'GOOD', 'SLIP', 'MISTAKE', 'BLUNDER'];
  return order.map((label) => ({ label, n: user.filter((p) => measured(p.classification) === label).length }));
}
