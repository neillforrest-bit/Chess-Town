/* Shared coaching core: mode-agnostic chess-teaching services. Rookie/Play Chester is the
   first configuration; other modes (play-a-friend, Road to Chester, arcade) consume the
   same detector instead of growing their own copies. Owner direction, batch 42. */
import { Chess } from 'chess.js';

// ROOKIE teaching lens: which opening principle did this move serve or break?
// Runs only for BEGINNER games - it exists to teach, never to punish.
export type OpeningPrinciple = {
  key: 'centre' | 'development' | 'king-safety' | 'repeat-move' | 'early-queen' | 'edge-pawn' | 'exposed-piece';
  followed: boolean;
};

export function detectOpeningPrinciple(fenBeforeMove: string, move: any, gameHistory: any[]): OpeningPrinciple | null {
  try {
    const fullmove = Number(fenBeforeMove.split(/\s+/)[5]) || 1;
    if (fullmove > 10) return null; // opening window only
    // NOTE: new Chess(fen).history() is always empty - the caller must pass the live game's
    // verbose history (including the just-played move, which we drop here).
    const history = gameHistory.slice(0, -1).filter((m) => m.color === move.color);
    const isCastle = move.flags.includes('k') || move.flags.includes('q');
    if (isCastle) return { key: 'king-safety', followed: true };
    // Same piece moved twice while other pieces still sleep (approximation by arrival square).
    if (['n', 'b', 'r', 'q'].includes(move.piece) && history.some((m) => m.to === move.from && m.piece === move.piece)) {
      return { key: 'repeat-move', followed: false };
    }
    // Early queen sortie: first queen move within the first six moves.
    if (move.piece === 'q' && fullmove <= 6) return { key: 'early-queen', followed: false };
    // Minor piece leaving its home square for the first time = development.
    const homes: Record<string, string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };
    if ((move.piece === 'n' || move.piece === 'b') && (homes[move.color] || []).includes(move.from)) {
      // ...unless it develops straight onto a square where it hangs for nothing.
      const after = new Chess(fenBeforeMove);
      after.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const hanger = (after.moves({ verbose: true }) as any[]).find((m) => m.to === move.to && m.captured);
      if (hanger) {
        const reply = new Chess(after.fen());
        reply.move({ from: hanger.from, to: hanger.to, promotion: 'q' });
        const recapture = (reply.moves({ verbose: true }) as any[]).some((m) => m.to === move.to && m.captured);
        if (!recapture) return { key: 'exposed-piece', followed: false };
      }
      return { key: 'development', followed: true };
    }
    // Pawn claiming the centre.
    if (move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) return { key: 'centre', followed: true };
    // Edge pawn shuffle that neither captures nor fights for the centre.
    if (move.piece === 'p' && !move.captured && ['a3', 'h3', 'a4', 'h4', 'a6', 'h6', 'a5', 'h5'].includes(move.to)) {
      return { key: 'edge-pawn', followed: false };
    }
    return null;
  } catch {
    return null;
  }
}


/* Planned-exchange recognition: the feedback gap behind "the grader sees material lost,
   not the plan". When the engine's own script shows the opponent taking a piece and the
   player winning bigger material straight back, the move was a winning exchange, not a
   leak - and the coaching must say so. */
export type PlannedExchange = {
  lostPiece: string; // piece the opponent is scripted to win, in words
  wonPiece: string; // piece the player is scripted to win back, in words
  net: number; // material profit in pawn units
};

const EXCHANGE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const EXCHANGE_NAMES: Record<string, string> = { p: 'a pawn', n: 'a knight', b: 'a bishop', r: 'a rook', q: 'the queen' };

export function detectPlannedExchange(fenAfter: string, continuation: string[] | null | undefined, playerColor: 'w' | 'b'): PlannedExchange | null {
  try {
    if (!continuation || continuation.length < 2) return null;
    const board = new Chess(fenAfter);
    const first = board.move({ from: continuation[0].slice(0, 2), to: continuation[0].slice(2, 4), promotion: continuation[0][4] || 'q' });
    if (!first || !first.captured) return null; // opponent's script does not win material
    const second = board.move({ from: continuation[1].slice(0, 2), to: continuation[1].slice(2, 4), promotion: continuation[1][4] || 'q' });
    if (!second || !second.captured) return null; // no scripted recapture
    const lost = EXCHANGE_VALUES[first.captured] || 0;
    const won = EXCHANGE_VALUES[second.captured] || 0;
    if (won - lost < 2) return null; // only clear profits count as a plan worth naming
    return { lostPiece: EXCHANGE_NAMES[first.captured] || 'a piece', wonPiece: EXCHANGE_NAMES[second.captured] || 'a piece', net: won - lost };
  } catch {
    return null;
  }
}

/* Trap recognition (the real shape of his queen/rook example): the player's move creates a
   poisoned bait - the opponent CAN win a piece on the spot, but only with a more valuable
   attacker that gets recaptured straight back. The honest engine never plays the bait-taking
   line, so a PV-based check misses it; what matters is that the player's move CREATED the
   trap. Only tags nets of 2+ pawns and only when the trap is new (not already on the board). */
export type TrapInfo = PlannedExchange & { baitSquare: string; attackerFrom: string };

export function detectTraps(fen: string): TrapInfo[] {
  // NOTE: the fen must have the OPPONENT to move - captures are enumerated for the side
  // to move. Callers flip the turn field when they need the other side. Returns EVERY
  // poisoned bait, highest net first: a position can hold several (a pre-existing pawn
  // bait must not mask the rook trap the player's move just set - the batch-43 live miss).
  try {
    const board = new Chess(fen);
    const replies = board.moves({ verbose: true }) as any[];
    const traps: TrapInfo[] = [];
    for (const capture of replies) {
      if (!capture.captured) continue;
      const attacker = EXCHANGE_VALUES[capture.piece] || 0;
      const bait = EXCHANGE_VALUES[capture.captured] || 0;
      const net = attacker - bait;
      if (net < 2) continue; // they must win real material on the spot for the bait to tempt
      const after = new Chess(board.fen());
      after.move({ from: capture.from, to: capture.to, promotion: capture.promotion || 'q' });
      const recapture = (after.moves({ verbose: true }) as any[]).some((m) => m.to === capture.to && m.captured);
      if (!recapture) continue;
      traps.push({
        lostPiece: EXCHANGE_NAMES[capture.captured] || 'a piece',
        wonPiece: EXCHANGE_NAMES[capture.piece] || 'a piece',
        net, baitSquare: capture.to, attackerFrom: capture.from,
      });
    }
    return traps.sort((a, b) => b.net - a.net);
  } catch {
    return [];
  }
}

export function detectTrapSet(fen: string, playerColor: 'w' | 'b'): PlannedExchange | null {
  void playerColor;
  return detectTraps(fen)[0] || null;
}

// Material reality check (moved into the shared core, batch 43): winning a rook/queen must
// dominate the grade whatever shallow search or engine noise says (floor), and a free-piece
// grab must never mint the crown (ceiling - owner calibration: hoovering a hanging queen is
// a good spot, not a TOP DOG moment). Only ever touches rook/queen captures.
const GRADE_RANK: Record<string, number> = { BLUNDER: 0, MISTAKE: 1, INACCURACY: 2, GOOD: 3, GREAT: 4, BEST: 5, BRILLIANT: 6 };
export function applyMaterialReality(fenBeforeMove: string, move: any, label: string): string {
  try {
    if (!move?.captured) return label;
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const capturedValue = values[move.captured] || 0;
    if (capturedValue < 5) return label; // minors and pawns keep normal grading
    const board = new Chess(fenBeforeMove);
    board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    const moverValue = move.promotion ? 9 : (values[move.piece] || 0);
    // A recapture exists only if the opponent has a legal capture landing on the moved piece's square.
    const replies = board.moves({ verbose: true });
    // No replies at all means the move ended the game (mate/stalemate) - never a "hanging grab".
    const gameEnder = replies.length === 0;
    const recaptured = replies.some((candidate: any) => candidate.to === move.to && Boolean(candidate.captured));
    const net = capturedValue - (recaptured ? moverValue : 0);
    // Floor: big material wins grade well - but never TOP DOG (owner calibration, batch 43).
    let floor: string | null = null;
    if (net >= 6) floor = 'BEST'; // queen for a minor or better, a rout
    else if (net >= 3) floor = 'GREAT'; // clear material profit
    if (floor && (GRADE_RANK[floor] || 0) > (GRADE_RANK[label] || 0)) return floor;
    // Ceiling: a free-piece grab (opponent cannot recapture our piece) is an obvious find,
    // so it caps the crown even when it was the engine's only-strong-move first choice.
    // Defended-piece captures keep their BRILLIANT - winning a defended piece takes a real idea.
    if (label === 'BRILLIANT' && !recaptured && !gameEnder && capturedValue >= 3) return 'BEST';
    return label;
  } catch {
    return label;
  }
}
