// BUILD 124 - THE PLAYER FILE. One versioned, account-ready record of how you actually play.
// Local today (key below); the shape is plain JSON so it can be lifted into an account later.
// Grading here is CLUB-CALIBRATED on purpose: only swings a club player should see get flagged,
// so the learning is rich, not a wall of red.
import { Chess } from 'chess.js';
import { fenBeforePly } from './move-words';

export type Phase = 'opening' | 'middlegame' | 'endgame';
export type Flag = { ply: number; san: string; loss: number; phase: Phase; piece: string; capture: boolean; fenBefore: string | null; tier: 'mistake' | 'blunder' };
export type GameRecord = {
  id: string; date: string; level: string; result: 'win' | 'loss' | 'draw'; myMoves: number;
  strip: Array<{ ply: number; t: 0 | 1 | 2 | 3; ph?: Phase }>; // 0 fine, 1 slip (80-149), 2 mistake (150-299), 3 blunder (300+)
  flags: Flag[]; pgn: string;
};
export type PlayerFile = { v: 1; games: GameRecord[] };

const KEY = 'ct-player-file-v1';
const CAP = 40;
export const SLIP = 80, MISTAKE = 150, BLUNDER = 300;

export function loadPlayerFile(): PlayerFile {
  try { const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null'); if (raw && raw.v === 1 && Array.isArray(raw.games)) return raw as PlayerFile; } catch { /* private browsing */ }
  return { v: 1, games: [] };
}
function save(file: PlayerFile) { try { window.localStorage.setItem(KEY, JSON.stringify({ v: 1, games: file.games.slice(0, CAP) })); } catch { /* quota */ } }

function phaseOf(ply: number, fen: string | null): Phase {
  if (ply <= 20) return 'opening';
  if (!fen) return 'middlegame';
  const pieces = (fen.split(' ')[0].match(/[a-zA-Z]/g) || []).filter((c) => !/[pPkK]/.test(c)).length;
  return pieces <= 6 ? 'endgame' : 'middlegame';
}

export function buildGameRecord(input: { level: string; result: 'win' | 'loss' | 'draw'; pgn: string; gradeHistory: Array<{ move: string; player: string; ply: number; centipawnLoss: number | null }>; date?: string }): GameRecord | null {
  const mine = input.gradeHistory.filter((g) => g.player === 'You' && g.centipawnLoss != null);
  if (mine.length < 4) return null; // too short to learn from
  const strip: GameRecord['strip'] = [];
  const flags: Flag[] = [];
  const fens = new Map<number, string>();
  try { const c = new Chess(); let n = 0; for (const tok of input.pgn.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))) { fens.set(n + 1, c.fen()); if (!c.move(tok)) break; n += 1; } } catch { /* partial is fine */ }
  for (const g of mine) {
    const loss = Math.max(0, g.centipawnLoss || 0);
    const t = loss >= BLUNDER ? 3 : loss >= MISTAKE ? 2 : loss >= SLIP ? 1 : 0;
    strip.push({ ply: g.ply, t, ph: phaseOf(g.ply, fens.get(g.ply) || null) });
    if (t >= 2) {
      const fenBefore = fens.get(g.ply) || null;
      let piece = 'pawn'; let capture = false;
      try { if (fenBefore) { const mv = new Chess(fenBefore).move(g.move); const names: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }; piece = names[mv.piece] || 'pawn'; capture = Boolean(mv.captured); } } catch { /* keep defaults */ }
      flags.push({ ply: g.ply, san: g.move, loss, phase: phaseOf(g.ply, fenBefore), piece, capture, fenBefore, tier: t === 3 ? 'blunder' : 'mistake' });
    }
  }
  return { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, date: input.date || new Date().toISOString().slice(0, 10), level: input.level, result: input.result, myMoves: mine.length, strip, flags, pgn: input.pgn };
}

export function recordGameToFile(rec: GameRecord | null): PlayerFile {
  const file = loadPlayerFile();
  if (!rec) return file;
  if (file.games.some((g) => g.pgn === rec.pgn)) return file; // same game reported twice
  file.games.unshift(rec);
  save(file);
  return file;
}

export type Analysis = {
  games: number; wins: number; flagged: number; perGame: number;
  byPhase: Array<{ phase: Phase; moves: number; flags: number; rate: number }>;
  worstPhase: Phase | null; topPiece: { piece: string; n: number } | null;
  trend: 'better' | 'worse' | 'steady' | 'new'; headline: string; lesson: string;
};
const PHASE_LESSON: Record<Phase, string> = {
  opening: 'Your early moves are where games slip. Before move ten, bring each knight and bishop out once, and castle. Nothing fancy.',
  middlegame: 'The middle of the game is where you drop material. Before every move, ask: what does this leave undefended, and what can they now take?',
  endgame: 'Late in the game the slips get expensive. Slow down: with few pieces left, one careless move decides it.',
};

export function analyse(file: PlayerFile): Analysis {
  const games = file.games;
  const phases: Phase[] = ['opening', 'middlegame', 'endgame'];
  const moveCount: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const flagCount: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const pieces: Record<string, number> = {};
  for (const g of games) {
    for (const s of g.strip) moveCount[s.ph || (s.ply <= 20 ? 'opening' : 'middlegame')] += 1;
    for (const f of g.flags) { flagCount[f.phase] += 1; pieces[f.piece] = (pieces[f.piece] || 0) + 1; }
  }
  const byPhase = phases.map((phase) => ({ phase, moves: moveCount[phase], flags: flagCount[phase], rate: moveCount[phase] ? flagCount[phase] / moveCount[phase] : 0 }));
  const flagged = games.reduce((n, g) => n + g.flags.length, 0);
  const worst = flagged ? [...byPhase].sort((a, b) => b.rate - a.rate)[0] : null;
  const topEntry = Object.entries(pieces).sort((a, b) => b[1] - a[1])[0];
  let trend: Analysis['trend'] = 'new';
  if (games.length >= 4) {
    const recent = games.slice(0, 2).reduce((n, g) => n + g.flags.length, 0) / 2;
    const before = games.slice(2, 6).reduce((n, g) => n + g.flags.length, 0) / Math.min(4, games.length - 2);
    trend = recent < before - 0.5 ? 'better' : recent > before + 0.5 ? 'worse' : 'steady';
  }
  const perGame = games.length ? flagged / games.length : 0;
  const headline = !games.length ? 'No games yet.' : !flagged ? 'No big slips in your last games. That is rare.' : worst && worst.rate > 0 ? `Most of your big slips come in the ${worst.phase === 'middlegame' ? 'middle of the game' : worst.phase}.` : 'A few big slips, spread out.';
  return { games: games.length, wins: games.filter((g) => g.result === 'win').length, flagged, perGame, byPhase, worstPhase: worst ? worst.phase : null, topPiece: topEntry ? { piece: topEntry[0], n: topEntry[1] } : null, trend, headline, lesson: worst ? PHASE_LESSON[worst.phase] : 'Keep playing. Chester is learning how you play.' };
}

/** A clearly-labelled sample game, for the empty state and demos. Never saved. */
export function sampleFile(): PlayerFile {
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 Nb4 9. O-O c6 10. d4 Kd7 11. dxe5 Be6 12. Qf7+ Be7 13. Bxd5 Qxd5 14. Qxe7+ Kc8 15. Qxe6+ Qxe6 16. Re1 Rd8 17. Rxe6 g6 18. Rxc6+ bxc6 19. Bg5 Rd7 20. Bxe7 1-0';
  const flags: Flag[] = [{ ply: 12, san: 'Nxd5', loss: 420, phase: 'opening', piece: 'knight', capture: true, fenBefore: fenBeforePly(pgn, 12), tier: 'blunder' }, { ply: 28, san: 'Be6', loss: 210, phase: 'middlegame', piece: 'bishop', capture: false, fenBefore: fenBeforePly(pgn, 28), tier: 'mistake' }];
  const strip = Array.from({ length: 18 }, (_, i) => ({ ply: i * 2 + 1, t: (i === 5 ? 3 : i === 13 ? 2 : i === 3 || i === 9 ? 1 : 0) as 0 | 1 | 2 | 3 }));
  return { v: 1, games: [{ id: 'sample', date: new Date().toISOString().slice(0, 10), level: 'SAMPLE', result: 'loss', myMoves: 18, strip, flags, pgn }] };
}
