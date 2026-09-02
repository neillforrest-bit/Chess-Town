'use client';

import NeonChessboard from '@/components/NeonChessboard';
import { ChesterTeleprompter } from '@/components/ChesterUI';

export default function GameplayPage() {
  return <main className="gameplay-page h-[100dvh] w-full overflow-hidden" aria-label="Chess Town gameplay">
    <section className="gameplay-layout flex flex-row w-full items-center justify-between p-2">
      <div className="gameplay-board w-[55vw] max-w-[300px] aspect-square">
        <NeonChessboard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" label="Chessboard" />
      </div>
      <aside className="gameplay-commentary" aria-label="Chester commentary">
        <ChesterTeleprompter text="Your board is live. Start with the center, develop cleanly, and do not make me explain why your queen is out on move two." isThinking={false} isMobile />
      </aside>
    </section>
  </main>;
}