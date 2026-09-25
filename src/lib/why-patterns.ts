// WHY pattern detectors: turn a graded move into ONE named pattern + ONE
// principle, computed from the actual board. Used by buildWhyLesson so the
// popup can say "you left your knight where their bishop takes it for free"
// instead of "the usual cause: moving before checking".
import { Chess } from 'chess.js';

export type WhyPattern = { name: string; line: string; principle: string };

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function squaresOf(chess: Chess, color: 'w' | 'b'): { square: string; type: string }[] {
  const out: { square: string; type: string }[] = [];
  for (const row of (chess as any).board()) {
    for (const cell of row) {
      if (cell && cell.color === color) out.push({ square: cell.square, type: cell.type });
    }
  }
  return out;
}

// Find the most valuable mover-side piece that is attacked and not defended.
function findHanging(chess: Chess, mover: 'w' | 'b'): { square: string; type: string; attacker: string } | null {
  const enemy = mover === 'w' ? 'b' : 'w';
  let best: { square: string; type: string; attacker: string; value: number } | null = null;
  for (const piece of squaresOf(chess, mover)) {
    if (piece.type === 'k') continue;
    const attackers = (chess as any).attackers(piece.square, enemy) as string[];
    if (!attackers.length) continue;
    const defenders = (chess as any).attackers(piece.square, mover) as string[];
    const attackerValue = Math.min(...attackers.map((sq) => PIECE_VALUE[((chess as any).get(sq)?.type) || 'p']));
    const pieceValue = PIECE_VALUE[piece.type] || 0;
    // Truly hanging (no defenders) or losing the exchange to a cheaper attacker.
    const losing = defenders.length === 0 || attackerValue < pieceValue;
    if (!losing) continue;
    const attackerType = (chess as any).get(attackers[0])?.type || 'p';
    if (!best || pieceValue > best.value) best = { square: piece.square, type: piece.type, attacker: attackerType, value: pieceValue };
  }
  return best ? { square: best.square, type: best.type, attacker: best.attacker } : null;
}

export function detectWhyPattern(input: {
  fenBefore?: string | null;
  move?: string | null;
  bestMove?: string | null;
  classification?: string | null;
  movePhrase?: string | null;
}): WhyPattern | null {
  const label = (input.classification || '').toUpperCase();
  if (!label || ['BRILLIANT', 'BEST', 'GREAT', 'GOOD'].includes(label)) return null;
  if (!input.fenBefore || !input.move) return null;
  try {
    const chess = new Chess(input.fenBefore);
    const legalBefore = chess.moves();
    const mover = chess.turn();
    const castlingWasAvailable = legalBefore.some((san) => san === 'O-O' || san === 'O-O-O');
    const played = chess.move(input.move);
    if (!played) return null;

    const best = (input.bestMove || '').trim();

    // 1. Missed mate in one - the biggest teaching moment there is.
    if (best.includes('#')) {
      return {
        name: 'MISSED MATE',
        line: 'There was a checkmate in one on the board - the kind of move that ends the argument on the spot.',
        principle: 'Before settling for a quiet move, run the forcing scan first: checks, captures, threats - in that order.',
      };
    }

    // 2. A piece is now hanging (or losing the exchange) after the move.
    const hanging = findHanging(chess, mover);
    if (hanging && (PIECE_VALUE[hanging.type] || 0) >= 1) {
      const movedItself = played.to === hanging.square;
      return {
        name: 'LOOSE PIECE',
        line: movedItself
          ? `Your ${PIECE_NAME[hanging.type]} walked to a square where their ${PIECE_NAME[hanging.attacker]} simply takes it - nothing of yours guards that square.`
          : `The move abandoned your ${PIECE_NAME[hanging.type]} - their ${PIECE_NAME[hanging.attacker]} can take it and nothing of yours takes back.`,
        principle: 'Before every move, ask the one question: what does this leave undefended? Loose pieces are where games leak.',
      };
    }

    // 3. A free capture was available (the engine's idea was a take).
    if (best.includes('x')) {
      return {
        name: 'MISSED FREE PIECE',
        line: 'There was a capture on the board that won material for nothing - the engine would have taken it without blinking.',
        principle: 'Scan checks, captures, threats in that order before touching a piece. The free points live in the captures.',
      };
    }

    // 4. A forcing check went begging.
    if (best.includes('+')) {
      return {
        name: 'MISSED CHECK',
        line: 'A check was available - the most forcing move in chess, where the opponent\'s reply is chosen for them.',
        principle: 'Checks first, always: a check takes the opponent\'s turn away, and free turns are where plans become wins.',
      };
    }

    // 5. King stayed in the firing line with castling available.
    if (castlingWasAvailable && played.piece !== 'k') {
      return {
        name: 'KING IN THE CENTRE',
        line: 'Your king stayed in the firing line while the castle door was open - the engine wanted it tucked away first.',
        principle: 'Castle inside your first ten moves. A king in the centre is a target wearing a crown.',
      };
    }

    // 6. Back pieces asleep in the opening.
    const minorsHome = squaresOf(chess, mover).filter((p) => {
      if (p.type !== 'n' && p.type !== 'b') return false;
      const homeRank = mover === 'w' ? '1' : '8';
      return p.square.endsWith(homeRank);
    }).length;
    const moveNumber = Math.ceil(((input.fenBefore || '').split(' ')[5] ? Number((input.fenBefore || '').split(' ')[5]) : 1));
    if (moveNumber <= 12 && minorsHome >= 2 && played.piece !== 'n' && played.piece !== 'b' && played.piece !== 'k') {
      return {
        name: 'SLEEPING PIECES',
        line: 'Your back pieces watched another move go by from the bench - too few teammates are actually playing.',
        principle: 'First ten moves: every knight and bishop off the back rank before chasing anything. Soldiers first, plans second.',
      };
    }

    return null;
  } catch {
    return null;
  }
}
