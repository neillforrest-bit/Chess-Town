// Natural-language move descriptions: "knight to the kingside", "pawn two squares up",
// "queen along the diagonal, attacking the king". Returns null when the move is not legal
// in the given position - every caller treats null as "do not show this suggestion",
// which is the integrity gate against impossible advice.
import { Chess } from 'chess.js';

const PIECE_NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// BUILD 165: exact squares, never vague regions ("knight to the kingside" was a banned broken phrase).
function regionOf(square: string): string {
  return square;
}

export function describeMove(fenBefore: string, moveUciOrSan: string): string | null {
  if (!fenBefore || !moveUciOrSan) return null;
  { const plain = plainMoveNoun(fenBefore, moveUciOrSan); if (plain) return plain; }
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
      else if (openFile) base = `${name} down the open ${mv.to[0]}-file on ${mv.to}`;
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

/* WWCD clarity (batch 87) refined (BUILD 95, his steering): no SAN, no square
   coordinates - piece names and board regions only, phrased like a coach talking
   ("knight to the kingside: develops the knight toward the action"). */
// Two descriptors of the same move can arrive in different formats (SAN "e4"
// vs Stockfish UCI "e2e4" - the engine's pv/bestmove lines are always UCI).
// Compare them as moves, not strings, or "you played the best move" reads as
// "you should have played the move you just played".
export function sameMove(fenBefore: string, a: string | null | undefined, b: string | null | undefined): boolean {
  if (!fenBefore || !a || !b) return false;
  if (a === b) return true;
  try {
    const chess = new Chess(fenBefore);
    const legal = chess.moves({ verbose: true }) as any[];
    const toUci = (m: string) => {
      const mv = legal.find((x) => x.san === m)
        || legal.find((x) => `${x.from}${x.to}${x.promotion || ''}` === m)
        || legal.find((x) => x.lan === m);
      return mv ? `${mv.from}${mv.to}${mv.promotion || ''}` : m;
    };
    return toUci(a) === toUci(b);
  } catch {
    return false;
  }
}

export function explainEngineChoice(fenBefore: string, bestMove: string): string | null {
  if (!fenBefore || !bestMove) return null;
  { const plain = plainSuggestion(fenBefore, bestMove); if (plain) return plain; }
  try {
    const chess = new Chess(fenBefore);
    const legal = chess.moves({ verbose: true }) as any[];
    const mv = legal.find((m) => m.san === bestMove)
      || legal.find((m) => `${m.from}${m.to}${m.promotion || ''}` === bestMove)
      || legal.find((m) => m.lan === bestMove);
    if (!mv) return null;
    const pieceName = PIECE_NAMES[mv.piece] || 'piece';
    const san: string = mv.san || bestMove;
    const flags: string = mv.flags || '';
    const enemy = mv.color === 'w' ? 'b' : 'w';
    const wasAttacked = chess.isAttacked(mv.from, enemy);
    const after = new Chess(fenBefore);
    after.move(san);
    const purposes: string[] = [];
    if (flags.includes('k') || flags.includes('q')) purposes.push('tucks the king safe and brings the rook into the game');
    if (mv.captured) purposes.push(`wins the ${PIECE_NAMES[mv.captured] || 'piece'}`);
    if (san.includes('#')) purposes.push('and it is checkmate on the spot');
    else if (san.includes('+')) purposes.push('gives check - their reply is forced');
    if (mv.promotion) purposes.push('promotes the pawn to a brand-new queen');
    if (!purposes.length && mv.piece !== 'k' && wasAttacked) purposes.push(`gets the ${pieceName} out of danger`);
    const homeRank = mv.color === 'w' ? '1' : '8';
    if (!purposes.length && (mv.piece === 'n' || mv.piece === 'b') && mv.from[1] === homeRank) purposes.push(`develops the ${pieceName} toward the action`);
    if (!purposes.length && mv.piece === 'p' && (mv.to[0] === 'd' || mv.to[0] === 'e') && (mv.to[1] === '4' || mv.to[1] === '5')) purposes.push(`plants the ${mv.to[0] === 'e' ? "king's" : "queen's"} pawn in the centre`);
    if (!purposes.length && (mv.piece === 'r' || mv.piece === 'q') && mv.from[0] !== mv.to[0] && isOpenFile(after, mv.to.charCodeAt(0) - 97)) purposes.push(`seizes the open ${mv.to[0]}-file on ${mv.to}`);
    if (!purposes.length && mv.piece === 'r' && ((mv.color === 'w' && mv.to[1] === '7') || (mv.color === 'b' && mv.to[1] === '2'))) purposes.push('plants the rook on the seventh rank - horrible for their pawns');
    if (!purposes.length && mv.piece === 'k') purposes.push('activates the king, which matters as the board empties');
    if (!purposes.length) purposes.push('keeps every piece guarded and the pressure on');
    const isCastle = flags.includes('k') || flags.includes('q');
    const motion = isCastle
      ? 'castle to safety'
      : mv.piece === 'p'
        ? mv.captured
          ? `pawn takes the ${PIECE_NAMES[mv.captured] || 'piece'}`
          : mv.promotion
            ? 'push a pawn all the way to a brand-new queen'
            : `pawn push on ${regionOf(mv.to)}`
        : mv.captured
          ? `${pieceName} takes the ${PIECE_NAMES[mv.captured] || 'piece'}`
          : `${pieceName} to ${regionOf(mv.to)}`;
    return `${motion}: ${purposes.join(' and ')}`;
  } catch {
    return null;
  }
}



const PAWN_ROLE: Record<string, string> = { a: "queen's rook's pawn", b: "queen's knight's pawn", c: "queen's bishop's pawn", d: "queen's pawn", e: "king's pawn", f: "king's bishop's pawn", g: "king's knight's pawn", h: "king's rook's pawn" };
/** "king's pawn", "king's knight", "queen": a name a new player knows, from the piece standing on `sq` in `fen`. */
export function roleOf(fen: string, sq: string): string {
  try {
    const c = new Chess(fen);
    const p = c.get(sq as any) as any;
    if (!p) return 'piece';
    let same = 0; let sameSide = 0;
    const kingSide = (f: string) => f >= 'e';
    for (const row of c.board()) for (const x of row as any[]) {
      if (x && x.type === p.type && x.color === p.color) { same += 1; if (p.type !== 'p' && kingSide(x.square[0]) === kingSide(sq[0])) sameSide += 1; if (p.type === 'p' && x.square[0] === sq[0]) sameSide += 1; }
    }
    if (p.type === 'p') return sameSide > 1 ? `pawn on ${sq}` : PAWN_ROLE[sq[0]];
    const name = PIECE_NAMES[p.type];
    if (same <= 1 || p.type === 'q' || p.type === 'k') return name;
    return sameSide > 1 ? `${name} on ${sq}` : `${kingSide(sq[0]) ? "king's" : "queen's"} ${name}`;
  } catch { return 'piece'; }
}

// Batch 173: plain-English move talk for new players. Piece + from-square + to-square + the why. No SAN.
function findMove(fenBefore: string, m: string): any | null {
  try {
    const legal = new Chess(fenBefore).moves({ verbose: true }) as any[];
    return legal.find((x) => x.san === m) || legal.find((x) => `${x.from}${x.to}${x.promotion || ''}` === m) || legal.find((x) => x.lan === m) || null;
  } catch { return null; }
}

/** "the knight from d3 to c5" - reads after "You played" / "my pick was". */
export function plainMoveNoun(fenBefore: string, m: string): string | null {
  const mv = findMove(fenBefore, m);
  if (!mv) return null;
  const flags: string = mv.flags || '';
  if (flags.includes('k')) return 'castling kingside';
  if (flags.includes('q') && mv.piece === 'k') return 'castling queenside';
  const name = roleOf(fenBefore, mv.from);
  const tail = mv.captured ? `, taking the ${PIECE_NAMES[mv.captured]}` : '';
  const san: string = mv.san || '';
  const sfx = san.includes('#') ? ' - checkmate' : san.includes('+') ? ', giving check' : '';
  if (mv.promotion) return `the ${name} from ${mv.from} to ${mv.to}, promoting to a ${PIECE_NAMES[mv.promotion]}${sfx}`;
  return `the ${name.includes(' on ') ? PIECE_NAMES[mv.piece] : name} from ${mv.from} to ${mv.to}${tail}${sfx}`;
}

/** The "why" as a clause that follows "to ...": e.g. "put pressure on the queen and protect your pawn". */
export function plainWhy(fenBefore: string, m: string): string {
  const mv = findMove(fenBefore, m);
  if (!mv) return 'keep your pieces safe';
  try {
    const flags: string = mv.flags || '';
    const enemy = mv.color === 'w' ? 'b' : 'w';
    const before = new Chess(fenBefore);
    const after = new Chess(fenBefore);
    after.move(mv.san);
    const san: string = mv.san || '';
    const name = PIECE_NAMES[mv.piece];
    const why: string[] = [];
    if (san.includes('#')) return 'checkmate the king - game over';
    if (flags.includes('k') || flags.includes('q')) return 'tuck your king away safely and wake up your rook';
    if (mv.captured) why.push(`win their ${PIECE_NAMES[mv.captured]}`);
    if (mv.promotion) why.push('turn your pawn into a new queen');
    if (san.includes('+')) why.push('check the king so they have to answer');
    if (before.isAttacked(mv.from, enemy) && mv.piece !== 'k' && !mv.captured) why.push(`save your ${name}, which was under attack`);
    // what the moved piece now attacks (valuable enemy pieces), via a null-move style probe
    const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    const pressured: string[] = [];
    try {
      const probe = new Chess(after.fen().replace(/ (w|b) /, ` ${mv.color} `).replace(/ [-a-h1-8]+ \d+ \d+$/, ' - 0 1'));
      const hits = (probe.moves({ verbose: true }) as any[]).filter((x) => x.from === mv.to && x.captured && x.captured !== 'k');
      for (const h of hits) if (val[h.captured] >= 3 || val[h.captured] > val[mv.piece]) { const rr = roleOf(after.fen(), h.to); const label = `their ${rr.includes(' on ') ? rr : `${rr} (${h.to})`}`; if (!pressured.includes(label)) pressured.push(label); }
    } catch { /* ignore */ }
    if (!mv.captured && pressured.length) why.push(`put pressure on ${pressured.slice(0, 2).join(' and ')}`);
    // protects a friendly pawn/piece?
    try {
      const probe2 = new Chess(after.fen().replace(/ (w|b) /, ` ${mv.color} `).replace(/ [-a-h1-8]+ \d+ \d+$/, ' - 0 1'));
      const guarded: string[] = [];
      for (const row of after.board()) for (const sq of row as any[]) {
        if (!sq || sq.color !== mv.color || sq.square === mv.to || sq.type === 'k') continue;
        if (before.isAttacked(sq.square, enemy) && !after.isAttacked(sq.square, enemy)) { const rr = roleOf(after.fen(), sq.square); guarded.push(`your ${rr.includes(' on ') ? rr : `${rr} (${sq.square})`}`); }
      }
      void probe2;
      if (guarded.length) why.push(`protect ${guarded.slice(0, 2).join(' and ')}`);
    } catch { /* ignore */ }
    if (!why.length) {
      const homeRank = mv.color === 'w' ? '1' : '8';
      if ((mv.piece === 'n' || mv.piece === 'b') && mv.from[1] === homeRank) why.push(`bring your ${name} into the game`);
      else if (mv.piece === 'p' && 'de'.includes(mv.to[0]) && '45'.includes(mv.to[1])) why.push('grab space in the centre');
      else if ((mv.piece === 'r' || mv.piece === 'q') && isOpenFile(after, mv.to.charCodeAt(0) - 97)) why.push(`use the open ${mv.to[0]}-file`);
      else if (mv.piece === 'k') why.push('make your king more useful now the board is emptier');
      else {
        // quiet move: say something concrete about the piece's new reach
        let reach = 0, reachBefore = 0;
        try {
          const flip = (c: Chess) => new Chess(c.fen().replace(/ (w|b) /, ` ${mv.color} `).replace(/ [-a-h1-8]+ \d+ \d+$/, ' - 0 1'));
          reach = (flip(after).moves({ verbose: true }) as any[]).filter((x) => x.from === mv.to).length;
          reachBefore = (flip(before).moves({ verbose: true }) as any[]).filter((x) => x.from === mv.from).length;
        } catch { /* ignore */ }
        const home = mv.color === 'w' ? '1' : '8';
        if (mv.piece === 'p' && mv.from[1] === (mv.color === 'w' ? '2' : '7') && 'bcdefg'.includes(mv.from[0])) why.push('open a path for the pieces behind it');
        else if (mv.piece === 'p') why.push(mv.from[0] === mv.to[0] ? 'gain space and free up your pieces' : 'change the pawn structure and open a line');
        else if (reach > reachBefore + 1) why.push(`give your ${name} more room and more options`);
        else if (mv.from[1] === home) why.push(`get your ${name} off the back rank`);
        else why.push(`reposition your ${name} to a more useful square`);
      }
    }
    return why.slice(0, 3).join(' and ');
  } catch { return 'keep your pieces safe'; }
}

/** Imperative suggestion: "move the knight on d3 to c5 to put pressure on the queen". */
export function plainSuggestion(fenBefore: string, m: string): string | null {
  const mv = findMove(fenBefore, m);
  if (!mv) return null;
  const flags: string = mv.flags || '';
  const why = plainWhy(fenBefore, m);
  if (flags.includes('k')) return `castle kingside to ${why}`;
  if (flags.includes('q') && mv.piece === 'k') return `castle queenside to ${why}`;
  const mine = roleOf(fenBefore, mv.from);
  if (mv.captured && !mv.promotion) return `take their ${roleOf(fenBefore, mv.to === mv.from ? mv.from : (mv.flags.includes('e') ? mv.to[0] + mv.from[1] : mv.to))} with your ${mine} ${mine.includes(' on ') ? `(taking on ${mv.to})` : `(${mv.from} takes ${mv.to})`} to ${why}`;
  return `move your ${mine} to ${mv.to}${mine.includes(' on ') ? '' : ` (from ${mv.from})`} to ${why}`;
}
