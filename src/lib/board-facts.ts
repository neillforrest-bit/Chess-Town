import { Chess } from 'chess.js';

// BOARD FACTS - the bridge in the Stockfish -> chess.js -> Gemini collaboration.
// Stockfish supplies verdicts and lines; this module walks the actual position and
// states, in plain words, what is loose, attacked, or there for the taking. Gemini
// receives these as pinned facts so the commentary can name real pieces and real
// danger instead of speaking generally. Everything here is derived, never guessed.

const PIECE_WORDS: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Plain-English location: no coordinates may ever reach the player, so facts are
// phrased the way Chester is allowed to say them.
function describeSquare(square: string, color: 'w' | 'b'): string {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const zone = file <= 2 ? 'queenside' : file >= 5 ? 'kingside' : 'centre';
  const backRank = color === 'w' ? rank === 1 : rank === 8;
  const enemyBackRank = color === 'w' ? rank === 8 : rank === 1;
  if (backRank) return `its own back rank on the ${zone}`;
  if (enemyBackRank) return `the enemy back rank on the ${zone}`;
  const deep = color === 'w' ? rank >= 6 : rank <= 3;
  if (zone === 'centre') return deep ? 'the advanced centre' : 'the centre';
  return deep ? `the enemy ${zone}` : `the ${zone}`;
}

export function boardFactsSummary(fen: string): string | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const board = chess.board();
  const stm = chess.turn();
  const enemy = stm === 'w' ? 'b' : 'w';
  const facts: string[] = [];

  if (chess.isCheck()) {
    facts.push(`${stm === 'w' ? 'White' : 'Black'} is in check right now`);
  }

  // Loose pieces: attacked by the enemy and not defended. Kings excluded.
  const loose: { side: string; piece: string; where: string }[] = [];
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue;
      const foe = cell.color === 'w' ? 'b' : 'w';
      const attacked = chess.isAttacked(cell.square, foe);
      const defended = chess.isAttacked(cell.square, cell.color);
      if (attacked && !defended) {
        loose.push({
          side: cell.color === 'w' ? 'White' : 'Black',
          piece: PIECE_WORDS[cell.type],
          where: describeSquare(cell.square, cell.color),
        });
      }
    }
  }
  // Biggest first, at most three - enough to name the real danger without a list dump.
  loose.sort((a, b) => (PIECE_VALUE[b.piece === 'queen' ? 'q' : b.piece[0]] || 0) - (PIECE_VALUE[a.piece === 'queen' ? 'q' : a.piece[0]] || 0));
  for (const item of loose.slice(0, 3)) {
    facts.push(`${item.side}'s ${item.piece} on ${item.where} is under attack with no defender`);
  }

  // Winning captures available to the side to move: trade up, or take something loose.
  const captures: string[] = [];
  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured) continue;
    const gain = PIECE_VALUE[move.captured] - PIECE_VALUE[move.piece];
    const targetDefended = chess.isAttacked(move.to, enemy);
    if (gain > 0 || !targetDefended) {
      captures.push(
        `${move.color === 'w' ? 'White' : 'Black'} can win the enemy ${PIECE_WORDS[move.captured]} with the ${PIECE_WORDS[move.piece]} from ${describeSquare(move.from, move.color)}`,
      );
    }
  }
  if (captures.length) facts.push(captures[0]);

  return facts.length ? facts.join('. ') + '.' : 'No piece is hanging for either side.';
}
