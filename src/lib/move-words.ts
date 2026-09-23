// Natural-language move descriptions: "knight to the kingside", "pawn two squares up",
// "queen along the diagonal, attacking the king". Returns null when the move is not legal
// in the given position - every caller treats null as "do not show this suggestion",
// which is the integrity gate against impossible advice.
import { Chess } from 'chess.js';

const PIECE_NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function regionOf(square: string): string {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  if ((file === 3 || file === 4) && rank >= 3 && rank <= 6) return 'the centre';
  if (file <= 2) return 'the queenside';
  return 'the kingside';
}

export function describeMove(fenBefore: string, moveUciOrSan: string): string | null {
  if (!fenBefore || !moveUciOrSan) return null;
  try {
    const chess = new Chess(fenBefore);
    let mv: any = null;
    try { mv = chess.move(moveUciOrSan); } catch { mv = null; }
    if (!mv) {
      try { mv = chess.move({ from: moveUciOrSan.slice(0, 2), to: moveUciOrSan.slice(2, 4), promotion: moveUciOrSan[4] || 'q' }); } catch { mv = null; }
    }
    if (!mv) return null;
    let base: string;
    const flags: string = mv.flags || '';
    if (flags.includes('k') || flags.includes('q') && mv.piece === 'k' && Math.abs(mv.from.charCodeAt(0) - mv.to.charCodeAt(0)) === 2) {
      base = 'castle to safety';
    } else if (mv.piece === 'p') {
      if (mv.promotion) base = 'promote a pawn to a brand-new queen';
      else if (mv.captured) base = `pawn takes the ${PIECE_NAMES[mv.captured] || 'piece'}`;
      else if (Math.abs(Number(mv.to[1]) - Number(mv.from[1])) === 2) base = 'pawn two squares up';
      else base = 'pawn one square up';
    } else if (mv.captured) {
      base = `${PIECE_NAMES[mv.piece]} takes the ${PIECE_NAMES[mv.captured] || 'piece'}`;
    } else if (mv.piece === 'n') {
      base = `knight to ${regionOf(mv.to)}`;
    } else if (mv.piece === 'b') {
      base = `bishop along the diagonal to ${regionOf(mv.to)}`;
    } else if (mv.piece === 'q') {
      const diagonal = Math.abs(mv.from.charCodeAt(0) - mv.to.charCodeAt(0)) === Math.abs(Number(mv.from[1]) - Number(mv.to[1]));
      base = diagonal ? `queen along the diagonal to ${regionOf(mv.to)}` : `queen to ${regionOf(mv.to)}`;
    } else if (mv.piece === 'r') {
      base = `rook to ${regionOf(mv.to)}`;
    } else {
      base = `king to ${regionOf(mv.to)}`;
    }
    const san: string = mv.san || '';
    const suffix = san.includes('#') ? ' - checkmate' : san.includes('+') ? ', attacking the king' : '';
    return `${base}${suffix}`;
  } catch {
    return null;
  }
}

// Replay a PGN and return natural descriptions keyed by ply (1-based, every half-move).
export function phrasesFromPgn(pgn: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!pgn) return map;
  try {
    const replay = new Chess();
    const check = new Chess();
    let ply = 0;
    for (const token of pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))) {
      const fen = check.fen();
      let mv: any = null;
      try { mv = check.move(token); } catch { mv = null; }
      if (!mv) break;
      ply += 1;
      const phrase = describeMove(fen, mv.san);
      if (phrase) map.set(ply, phrase);
      try { replay.move(token); } catch { /* keep check as source of truth */ }
    }
  } catch { /* partial map is fine */ }
  return map;
}
