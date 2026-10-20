// TACTIC RADAR (BUILD 163): chess.js geometry + existing Stockfish facts -> specific,
// speakable coaching. Zero AI spend: pure client-side analysis, no API calls.
import { Chess } from 'chess.js';

const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';

type Sq = string; // 'e4'
const allSquares = (): Sq[] => { const out: Sq[] = []; for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) out.push(FILES[f] + r); return out; };

export type HangingPiece = { piece: string; square: Sq; value: number; attackers: number; defenders: number };

/** Pieces of `color` that are attacked and not adequately defended, most valuable first. */
export function hangingPieces(chess: Chess, color: 'w' | 'b'): HangingPiece[] {
  const opp = color === 'w' ? 'b' : 'w';
  const out: HangingPiece[] = [];
  for (const sq of allSquares()) {
    const p = chess.get(sq as never);
    if (!p || p.color !== color || p.type === 'k') continue;
    const attacked = chess.isAttacked(sq as never, opp);
    if (!attacked) continue;
    // defenders: own attacks on the square, minus the piece itself (its presence doesn't defend it)
    const defended = chess.isAttacked(sq as never, color);
    if (!defended) out.push({ piece: NAMES[p.type], square: sq, value: VALUE[p.type], attackers: 1, defenders: 0 });
  }
  return out.sort((a, b) => b.value - a.value);
}

/** After this move, which enemy pieces does the moved piece attack from its new square? */
function attackedFrom(chess: Chess, square: Sq, byColor: 'w' | 'b'): { piece: string; square: Sq; value: number }[] {
  const enemy = byColor === 'w' ? 'b' : 'w';
  const out: { piece: string; square: Sq; value: number }[] = [];
  for (const sq of allSquares()) {
    const p = chess.get(sq as never);
    if (!p || p.color !== enemy || p.type === 'k') continue;
    if (chess.isAttacked(sq as never, byColor)) out.push({ piece: NAMES[p.type], square: sq, value: VALUE[p.type] });
  }
  return out.sort((a, b) => b.value - a.value);
}

export type Radar = {
  hanging: HangingPiece[];          // player's pieces now hanging (after their move)
  missedFork: string | null;        // "Nxe5 - the knight forks queen and rook"
  missedMate: string | null;        // "mate in 2"
  betterWas: string | null;         // plain phrase for the engine's choice
  wonCapture: string | null;        // "won the bishop on c4" if best move took material
};

function phrase(fen: string, san: string): { san: string; from: string; to: string; piece: string } | null {
  try { const c = new Chess(fen); const m = c.move(san); return m ? { san: m.san, from: m.from, to: m.to, piece: NAMES[m.piece] } : null; } catch { return null; }
}

/**
 * One call per user move: everything specific Chester can say about it.
 * bestSan/mateIn come from the Stockfish telemetry the engine already computes.
 */
export function radarForUserMove(fenBefore: string, fenAfter: string, bestSan: string | null, playedSan: string, mateInForPlayer: number | null): Radar {
  const radar: Radar = { hanging: [], missedFork: null, missedMate: null, betterWas: null, wonCapture: null };
  try { radar.hanging = hangingPieces(new Chess(fenAfter), new Chess(fenAfter).turn() === 'w' ? 'b' : 'w'); } catch { /* bad fen */ }
  if (!bestSan || bestSan === playedSan) return radar; // played the engine pick: nothing missed
  const best = phrase(fenBefore, bestSan);
  if (!best) return radar;
  if (mateInForPlayer && mateInForPlayer > 0) radar.missedMate = `mate in ${mateInForPlayer}`;
  try {
    const c = new Chess(fenBefore); const m = c.move(bestSan);
    if (c.isCheckmate()) radar.missedMate = radar.missedMate || 'mate in one';
    const hits = attackedFrom(c, m.to, m.color);
    if (m.captured && VALUE[m.captured] >= 3) radar.wonCapture = `taking the ${NAMES[m.captured]} on ${m.to}`;
    const big = hits.filter((h) => h.value >= 3 && h.square !== m.to);
    if (big.length >= 2) radar.missedFork = `${best.san} - the ${best.piece} hits ${big[0].piece} on ${big[0].square} AND ${big[1].piece} on ${big[1].square}`;
  } catch { /* keep quiet */ }
  radar.betterWas = best.san;
  return radar;
}

/** Chester-voiced one-liners from a radar result. Dry, specific, one breath. */
export function radarLines(r: Radar, playedSan: string, weakMove = false): string[] {
  const lines: string[] = [];
  if (r.missedMate) lines.push(`You had ${r.missedMate} here. The board was begging and you looked away.`);
  if (r.missedFork) lines.push(`The move was ${r.missedFork}. That is how games are won.`);
  if (!r.missedMate && !r.missedFork && r.wonCapture && r.betterWas) lines.push(`${r.betterWas} was the move - ${r.wonCapture}, free of charge.`);
  const h = r.hanging[0];
  if (h) lines.push(`Housekeeping: your ${h.piece} on ${h.square} is hanging. Nothing defends it.`);
  if (!lines.length && weakMove && r.betterWas && r.betterWas !== playedSan) lines.push(`The engine preferred ${r.betterWas}. Worth a look.`);
  return lines.slice(0, 2);
}

// ---- END-OF-GAME DEBRIEF (local, rule-based - the dead LLM path stays as garnish) ----
export type DebriefMove = { player: string; move: string; ply: number; grade: string | null; centipawnLoss: number | null };
const phaseOf = (ply: number) => (ply <= 12 ? 'Opening' : ply <= 30 ? 'Middlegame' : 'Endgame');
const phaseWord = (avg: number) => (avg < 40 ? 'sharp' : avg < 100 ? 'solid' : avg < 200 ? 'leaky' : 'expensive');

export function buildLocalDebrief(grades: DebriefMove[], phrases: Map<number, string>, tally: { hanging: number; missed: number }): { review: string; scouting: string[] } {
  const mine = grades.filter((g) => g.player === 'You');
  const phases: Record<string, number[]> = { Opening: [], Middlegame: [], Endgame: [] };
  for (const g of mine) phases[phaseOf(g.ply)].push(g.centipawnLoss ?? 0);
  const phaseLine = (Object.keys(phases) as (keyof typeof phases)[]).filter((k) => phases[k].length)
    .map((k) => { const avg = phases[k].reduce((a, b) => a + b, 0) / phases[k].length; return `${k}: ${phaseWord(avg)} (${(avg / 100).toFixed(1)} pawns given a move)`; }).join(' · ');
  const swings = [...mine].filter((g) => (g.centipawnLoss ?? 0) >= 100).sort((a, b) => (b.centipawnLoss ?? 0) - (a.centipawnLoss ?? 0)).slice(0, 2);
  const worst = phases.Middlegame.length && (phases.Middlegame.reduce((a, b) => a + b, 0) / phases.Middlegame.length) > (phases.Opening.reduce((a, b) => a + b, 0) / Math.max(1, phases.Opening.length)) ? 'middlegame' : 'opening';
  const swingText = swings.length
    ? swings.map((g) => `move ${Math.ceil(g.ply / 2)}: ${phrases.get(g.ply) || g.move} gave away ${((g.centipawnLoss ?? 0) / 100).toFixed(1)} pawns`).join('; ') + '.'
    : 'no single move gave the game away - the squeeze was gradual.';
  const themes: string[] = [];
  if (tally.hanging) themes.push(`you left pieces undefended ${tally.hanging} time${tally.hanging === 1 ? '' : 's'}`);
  if (tally.missed) themes.push(`${tally.missed} winning tactic${tally.missed === 1 ? '' : 's'} went begging`);
  const themeText = themes.length ? `The pattern that cost you: ${themes.join(', ')}.` : 'No recurring leak showed up - the mistakes were one-offs.';
  const drill = tally.hanging >= tally.missed
    ? 'Before every move ask one question: which of my pieces is loose? That single habit erases most of what happened here.'
    : 'When a piece lands en prise, stop and check every capture twice - the winning tactic was on the board today.';
  const review = `Let's talk about ${swings.length ? swingText : 'the shape of this one - ' + swingText} ${phaseLine ? `Phase by phase: ${phaseLine}.` : ''} ${themeText} ${drill}`;
  const scouting = [
    phaseLine ? `Form: ${phaseLine}.` : 'Form: not enough moves to grade the phases.',
    `Recurring weakness: ${themes.length ? themes.join('; ') : 'none repeated itself'}.`,
    `One adjustment: ${drill}`,
  ];
  return { review, scouting };
}
