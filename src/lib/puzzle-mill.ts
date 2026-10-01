// BUILD 122 - PUZZLE MILL. Every mistake or blunder Chester catches in YOUR games is banked
// here as a puzzle: the position just before you went wrong, find the move you missed.
// Local-only, deterministic, GBP 0. Moves compare through sameMove (engine UCI vs SAN trap).
import { Chess } from 'chess.js';
import { sameMove, explainEngineChoice } from './move-words';

export type MillPuzzle = {
  id: string; fen: string; best: string; played: string; grade: string; loss: number;
  phrase: string | null; date: string; solved: number; misses: number; lastSolved: string | null;
};
const KEY = 'ct-puzzle-mill-v1';
const CAP = 80;

export function loadMill(): MillPuzzle[] {
  try { const raw = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(raw) ? raw as MillPuzzle[] : []; } catch { return []; }
}
function saveMill(list: MillPuzzle[]) { try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch { /* private browsing */ } }

/** Bank a graded move. Returns true when a new puzzle was added. */
export function recordMillMistake(input: { fenBefore?: string | null; bestMove?: string | null; move?: string | null; classification?: string | null; evalDelta?: number | null; bestMovePhrase?: string | null; provisional?: boolean }): boolean {
  const grade = (input.classification || '').toUpperCase();
  if (input.provisional || !/^(MISTAKE|BLUNDER)$/.test(grade)) return false;
  if (!input.fenBefore || !input.bestMove || !input.move) return false;
  if (sameMove(input.fenBefore, input.move, input.bestMove)) return false;
  try {
    const legal = new Chess(input.fenBefore).moves({ verbose: true }) as Array<{ san: string; from: string; to: string; promotion?: string; lan: string }>;
    const best = legal.find((m) => m.san === input.bestMove || `${m.from}${m.to}${m.promotion || ''}` === input.bestMove || m.lan === input.bestMove);
    if (!best) return false;
    const list = loadMill();
    // A position only ever banks once, however many times you repeat the mistake.
    if (list.some((p) => p.fen === input.fenBefore)) return false;
    list.unshift({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, fen: input.fenBefore, best: `${best.from}${best.to}${best.promotion || ''}`,
      played: input.move, grade, loss: Math.abs(Math.round(input.evalDelta || 0)), phrase: input.bestMovePhrase || null,
      date: new Date().toISOString().slice(0, 10), solved: 0, misses: 0, lastSolved: null,
    });
    saveMill(list);
    return true;
  } catch { return false; }
}

export function markMill(id: string, ok: boolean): MillPuzzle[] {
  const list = loadMill().map((p) => p.id !== id ? p : ok ? { ...p, solved: p.solved + 1, lastSolved: new Date().toISOString().slice(0, 10) } : { ...p, misses: p.misses + 1 });
  saveMill(list);
  return list;
}

/** Today's queue: never-solved first, then the most missed, then oldest-solved. Max n. */
export function todaysQueue(list: MillPuzzle[], n = 5): MillPuzzle[] {
  return [...list].sort((a, b) => (a.solved === 0 ? 0 : 1) - (b.solved === 0 ? 0 : 1) || b.misses - a.misses || (a.lastSolved || '').localeCompare(b.lastSolved || '') || b.loss - a.loss).slice(0, n);
}

export function millFromTo(fen: string, uci: string): { from: string; to: string } | null {
  return uci.length >= 4 ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null;
}

export function millCorrect(p: MillPuzzle, from: string, to: string, promotion?: string): boolean {
  return sameMove(p.fen, `${from}${to}${promotion || ''}`, p.best) || sameMove(p.fen, `${from}${to}`, p.best.slice(0, 4));
}

export function millWhy(p: MillPuzzle): string {
  const raw = explainEngineChoice(p.fen, p.best) || p.phrase || 'That move was simply stronger here.';
  // Tidy joins from the shared explainer ("and and", ": and it is").
  return raw.replace(/\band and\b/g, 'and').replace(/: and /g, ': ').replace(/^./, (c) => c.toUpperCase());
}
