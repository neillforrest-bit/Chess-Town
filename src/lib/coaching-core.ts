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

