'use client';

import type { ReactNode } from 'react';
import { CapturedPieceJail, type CapturedPiece } from '@/components/CapturedPieceJails';
import { ChessGameTools, ChesterTeleprompter } from '@/components/ChesterUI';

type ChessGameBoardShellProps = {
  children: ReactNode;
  boardHeader?: ReactNode;
  footer?: ReactNode;
  capturedPieces?: CapturedPiece[];
  commentary: string;
  isThinking?: boolean;
  helpText: string;
  chatContext: string;
  opponentLabel: string;
  opponentStatus: string;
};

export default function ChessGameBoardShell({
  children,
  boardHeader,
  footer,
  capturedPieces = [],
  commentary,
  isThinking = false,
  helpText,
  chatContext,
  opponentLabel,
  opponentStatus,
}: ChessGameBoardShellProps) {
  return <main className="play-chester-page chess-game-page" aria-label="Chess game">
    <header className="play-chester-opponent"><span>OPPONENT</span><b>{opponentLabel}</b><small>{opponentStatus}</small></header>
    <section className="play-chester-board-stack">
      <CapturedPieceJail capturedPieces={capturedPieces} color="b" label="OPPONENT CAPTURED" />
      {boardHeader}
      <div className="play-chester-board aspect-square">{children}</div>
      <CapturedPieceJail capturedPieces={capturedPieces} color="w" label="YOU CAPTURED" />
      <ChesterTeleprompter text={commentary} isThinking={isThinking} isMobile />
      <ChessGameTools helpText={helpText} context={chatContext} />
      {footer}
    </section>
  </main>;
}
