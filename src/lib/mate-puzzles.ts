// Mate-in-1 puzzle bank for Chessdle and Mate Sprint.
// Every entry is machine-verified to have EXACTLY ONE mate-in-1 (see generation
// notes in git history). Deterministic and offline: solutions are checked with
// chess.js at runtime, so no engine or network is needed.
export type MatePuzzle = { fen: string; solution: string; piece: 'q' | 'r' | 'b' | 'n' | 'p' };

export const MATE_PUZZLES: MatePuzzle[] = [
  { fen: '8/6R1/Q6n/6p1/5p1B/3K3P/8/2k5 w - - 0 1', solution: 'a6a1', piece: 'q' },
  { fen: '2b3k1/r3R3/5Qp1/p2p4/P7/RBPpPPK1/1P1B4/6N1 w - - 0 1', solution: 'f6g7', piece: 'q' },
  { fen: '8/b5P1/r7/1k1K1p2/5Q1P/3N4/8/8 w - - 0 1', solution: 'f4b4', piece: 'q' },
  { fen: 'R2Bkr1r/2Q1n3/1n2pppb/6p1/3P4/2P1P2P/2KB2P1/1NN2B1R w - - 0 1', solution: 'c7e7', piece: 'q' },
  { fen: '5k2/1b2bp2/4Q3/rpn1P1Nn/p1p5/R3P2P/3N1PP1/2BK1R2 w - - 0 1', solution: 'e6f7', piece: 'q' },
  { fen: '1Q4Q1/3k4/8/7P/5K2/8/8/8 w - - 0 1', solution: 'g8e8', piece: 'q' },
  { fen: 'Q7/2pp3p/5kr1/Pp4p1/4RP2/1n1K2p1/3n4/2b3R1 w - - 0 1', solution: 'a8f8', piece: 'q' },
  { fen: 'r3n1rk/8/q5pb/pPPp1N2/b2P2KP/P5N1/7R/2Q1RB2 w - - 0 1', solution: 'c1h6', piece: 'q' },
  { fen: '1r3b1r/2N3kp/3Q3N/1RpPp1P1/2P1R1b1/4P2p/3K4/4n3 w - - 0 1', solution: 'd6f6', piece: 'q' },
  { fen: 'b2k2n1/n2pp3/q2P4/2pQ4/rp2r1p1/P1PB3P/5KP1/RN4NR w - - 0 1', solution: 'd5g8', piece: 'q' },
  { fen: '7R/8/b6n/8/8/5K1k/8/8 w - - 0 1', solution: 'h8h6', piece: 'r' },
  { fen: '8/8/7N/8/8/2K5/7R/2k5 w - - 0 1', solution: 'h2h1', piece: 'r' },
  { fen: '8/5P2/6R1/7k/p4KN1/8/8/8 w - - 0 1', solution: 'g6h6', piece: 'r' },
  { fen: '8/8/k1KBP3/8/8/8/8/3R4 w - - 0 1', solution: 'd1a1', piece: 'r' },
  { fen: '8/5R1r/P7/p1p1K2k/5PRp/R6P/1n3r2/5nN1 w - - 0 1', solution: 'f7h7', piece: 'r' },
  { fen: 'R1r5/5K1k/8/n3R3/8/8/8/1q6 w - - 0 1', solution: 'e5h5', piece: 'r' },
  { fen: '5R2/7k/1K3P1p/p6P/P6r/B7/8/3R4 w - - 0 1', solution: 'd1d7', piece: 'r' },
  { fen: '8/8/8/7p/7P/1KR5/8/k7 w - - 0 1', solution: 'c3c1', piece: 'r' },
  { fen: '4rk2/4N1R1/3B4/1Pp2p1p/PQ1N4/R4p1K/2Pr4/8 w - - 0 1', solution: 'd4e6', piece: 'n' },
  { fen: '6rk/6pp/4K3/6N1/8/8/8/8 w - - 0 1', solution: 'g5f7', piece: 'n' },
  { fen: 'kr6/rp6/8/2K5/N7/8/8/8 w - - 0 1', solution: 'a4b6', piece: 'n' },
  { fen: '8/8/8/N7/8/2K5/rp6/kr6 w - - 0 1', solution: 'a5b3', piece: 'n' },
  { fen: '3rkb2/3prp2/8/5N2/2K5/8/8/8 w - - 0 1', solution: 'f5d6', piece: 'n' },
  { fen: 'k7/8/NKp5/8/B7/8/8/8 w - - 0 1', solution: 'a4c6', piece: 'b' },
  { fen: '5B1k/5Kp1/8/6N1/8/8/8/8 w - - 0 1', solution: 'f8g7', piece: 'b' },
  { fen: 'k1B5/1p6/NK6/8/8/8/8/8 w - - 0 1', solution: 'c8b7', piece: 'b' },
  { fen: '5B1k/4N1r1/5K2/6N1/8/8/8/8 w - - 0 1', solution: 'f8g7', piece: 'b' },
  { fen: 'k1B5/1b6/NK6/8/8/8/8/8 w - - 0 1', solution: 'c8b7', piece: 'b' },
  { fen: '6bk/7p/5KP1/8/8/8/8/8 w - - 0 1', solution: 'g6g7', piece: 'p' },
  { fen: 'kb6/p7/1PK5/8/8/8/8/8 w - - 0 1', solution: 'b6b7', piece: 'p' },
  { fen: '6bk/6np/5P2/8/8/8/4K3/6R1 w - - 0 1', solution: 'f6g7', piece: 'p' },
];
