// Natural-language move descriptions: "knight to the kingside", "pawn two squares up",
// "queen along the diagonal, attacking the king". Returns null when the move is not legal
// in the given position - every caller treats null as "do not show this suggestion",
// which is the integrity gate against impossible advice.
import { Chess } from 'chess.js';

const PIECE_NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function regionOf(square: string): string {
  // File-based geography: a-c queenside, d-e centre, f-h kingside. Reads true
  // on the back ranks too (a rook landing on d1 is centralising, not kingside).
  const file = square.charCodeAt(0) - 97;
  if (file <= 2) return 'the queenside';
  if (file <= 4) return 'the centre';
  return 'the kingside';
}

export function describeMove(fenBefore: string, moveUciOrSan: string): string | null {
  if (!fenBefore || !moveUciOrSan) return null;
  try {
    const chess = new Chess(fenBefore);
    const legal = chess.moves({ verbose: true }) as any[];
    let mv: any = null;
    try { mv = chess.move(moveUciOrSan); } catch { mv = null; }
    if (!mv) {
      try { mv = chess.move(moveUciOrSan.length > 4 ? { from: moveUciOrSan.slice(0, 2), to: moveUciOrSan.slice(2, 4), promotion: moveUciOrSan[4] } : { from: moveUciOrSan.slice(0, 2), to: moveUciOrSan.slice(2, 4) }); } catch { mv = null; }
    }
    if (!mv) return null;
    // Two same-type pieces that could both reach the destination must never
    // phrase identically - name the origin region instead ("rook from the
    // queenside to the kingside"), or "the other rook" inside one region.
    const rivals = legal.filter((other) => other.piece === mv.piece && other.to === mv.to && other.from !== mv.from);
    const originNote = rivals.length
      ? rivals.every((other) => regionOf(other.from) !== regionOf(mv.from))
        ? ` from ${regionOf(mv.from)}`
        : 'OTHER'
      : null;
    let base: string;
    const flags: string = mv.flags || '';
    const isCastle = flags.includes('k') || (flags.includes('q') && mv.piece === 'k' && Math.abs(mv.from.charCodeAt(0) - mv.to.charCodeAt(0)) === 2);
    if (isCastle) {
      base = 'castle to safety';
    } else if (mv.piece === 'p') {
      if (mv.promotion) base = 'promote a pawn to a brand-new queen';
      else if (mv.captured) base = `pawn takes the ${PIECE_NAMES[mv.captured] || 'piece'}`;
      else if (Math.abs(Number(mv.to[1]) - Number(mv.from[1])) === 2) base = 'pawn two squares up';
      else base = 'pawn one square up';
    } else if (mv.captured) {
      base = `${PIECE_NAMES[mv.piece]} takes the ${PIECE_NAMES[mv.captured] || 'piece'}`;
    } else if (mv.piece === 'r' || mv.piece === 'q') {
      // Rook/queen landmarks: back rank, seventh rank, open files - words that
      // teach AND keep two different moves from ever reading the same.
      const name = PIECE_NAMES[mv.piece];
      const toRank = Number(mv.to[1]);
      const enemyBackRank = (mv.color === 'w' && toRank === 8) || (mv.color === 'b' && toRank === 1);
      const seventhRank = (mv.color === 'w' && toRank === 7) || (mv.color === 'b' && toRank === 2);
      const diagonal = Math.abs(mv.from.charCodeAt(0) - mv.to.charCodeAt(0)) === Math.abs(Number(mv.from[1]) - Number(mv.to[1]));
      const openFile = mv.from[0] !== mv.to[0] && !diagonal ? false : isOpenFile(chess, mv.to.charCodeAt(0) - 97);
      if (enemyBackRank) base = `${name} to the enemy back rank`;
      else if (seventhRank) base = `${name} to the seventh rank`;
      else if (mv.piece === 'q' && diagonal) base = `queen along the diagonal to ${regionOf(mv.to)}`;
      else if (openFile) base = `${name} down the open ${regionOf(mv.to).replace('the ', '')} file`;
      else base = `${name} to ${regionOf(mv.to)}`;
    } else if (mv.piece === 'n') {
      base = `knight to ${regionOf(mv.to)}`;
    } else if (mv.piece === 'b') {
      base = `bishop along the diagonal to ${regionOf(mv.to)}`;
    } else {
      base = `king to ${regionOf(mv.to)}`;
    }
    if (originNote === 'OTHER') base = `the other ${PIECE_NAMES[mv.piece]} to ${regionOf(mv.to)}`;
    else if (originNote) base = `${PIECE_NAMES[mv.piece]}${originNote} to ${regionOf(mv.to)}`;
    const san: string = mv.san || '';
    const suffix = san.includes('#') ? ' - checkmate' : san.includes('+') ? ', attacking the king' : '';
    return `${base}${suffix}`;
  } catch {
    return null;
  }
}

function isOpenFile(chess: Chess, file: number): boolean {
  for (let rank = 1; rank <= 8; rank += 1) {
    const square = `${String.fromCharCode(97 + file)}${rank}`;
    const piece = (chess as any).get(square);
    if (piece && piece.type === 'p') return false;
  }
  return true;
}

// Replay a PGN and return the position just before the given ply (1-based,
// every half-move). Used by RETRY THE MISTAKE to reload the scene of the crime.
export function fenBeforePly(pgn: string, targetPly: number): string | null {
  if (!pgn || targetPly < 1) return null;
  try {
    const chess = new Chess();
    let ply = 0;
    const body = pgn.replace(/\[[^\]]*\]/g, ' ');
    for (const token of body.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))) {
      if (ply + 1 === targetPly) return chess.fen();
      if (!chess.move(token)) break;
      ply += 1;
    }
    return null;
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
    const body = pgn.replace(/\[[^\]]*\]/g, ' ');
    for (const token of body.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))) {
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
