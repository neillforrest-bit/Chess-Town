import { Chess } from 'chess.js';
import { scorecard, type ReviewedGame, type ScorecardEntry } from './game-review';
const names: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
/** Entertainment picks grounded in legal board events and noncontradictory engine reads.
 * No large one-node swing is treated as proof of brilliance. */
export function reviewHighlights(review: ReviewedGame) {
  const sc = scorecard(review);
  const stable = sc.filter((e) => e.ply.isUser && !e.unstable && !e.ply.provisional && !e.ply.terminal && e.ply.mateInAfter == null);
  const following = (e: ScorecardEntry): number[] => {
    const next = sc.slice(e.ply.ply, e.ply.ply + 2);
    if (next.length !== 2 || next.some((n) => n.unstable || n.userPct == null)) return [];
    return next.map((n) => n.userPct!);
  };
  let top: { san: string; ply: number; reason: string; rank: number } | null = null;
  let back: { san: string; ply: number; loss: number; best: string | null } | null = null;
  for (const e of stable) {
    const ahead = following(e);
    if (ahead.length !== 2 || e.userPct == null) continue;
    if (e.ply.evalDelta != null && e.ply.evalDelta <= 30 && ahead.every((p) => p >= e.userPct! - 10)) {
      try {
        const c = new Chess(e.ply.fenBefore), m = c.move(e.ply.san);
        const rank = m.promotion ? 10 : m.captured ? (values[m.captured] ?? 0) : m.san.includes('+') ? 0.5 : 0;
        const reason = m.promotion ? `A pawn becomes a ${names[m.promotion]}.` : m.captured ? `Your ${names[m.piece]} captures their ${names[m.captured]}.` : 'Check, with the engine backing the move.';
        if (rank > 0 && (!top || rank > top.rank)) top = { san: m.san, ply: e.ply.ply, reason, rank };
      } catch { /* invalid board event is not a highlight */ }
    }
    if (e.delta != null && e.delta < 0 && e.ply.evalDelta != null && e.ply.evalDelta >= 100
      && ahead.every((p) => p <= e.userPct! - e.delta! * 0.5)
      && e.ply.bestMoveSan && (!back || e.ply.evalDelta > back.loss)) {
      try { const c = new Chess(e.ply.fenBefore); c.move(e.ply.bestMoveSan); back = { san: e.ply.san, ply: e.ply.ply, loss: e.ply.evalDelta, best: e.ply.bestMoveSan }; } catch { /* no illegal suggestions */ }
    }
  }
  const fixables = review.plies.filter((p) => p.isUser && p.bestMoveSan && !p.provisional && (p.classification === 'MISTAKE' || p.classification === 'BLUNDER'))
    .sort((a, b) => (b.evalDelta ?? 0) - (a.evalDelta ?? 0)).slice(0, 3).map((p) => ({ ply: p, stable: !sc[p.ply - 1]?.unstable }));
  return { top, back, fixables, anyStable: stable.length > 0 };
}
