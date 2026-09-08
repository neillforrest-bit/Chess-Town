'use client';

import NeonChessboard from '@/components/NeonChessboard';
import ChessGameBoardShell from '@/components/ChessGameBoardShell';

export default function GameplayPage() {
  return <ChessGameBoardShell
    commentary="Your board is live. Start with the center, develop cleanly, and do not make me explain why your queen is out on move two."
    opponentLabel="CHESTER"
    opponentStatus="PRACTICE BOARD"
    helpText="Start by contesting the center, developing a knight or bishop, and keeping your king safe. Ask Chester for a concrete plan when the position gets unclear."
    chatContext="Gameplay board from the starting position."
  >
    <NeonChessboard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" label="Chessboard" />
  </ChessGameBoardShell>;
}
