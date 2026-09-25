import Link from 'next/link';
import type { VerdictCard } from '@/lib/verdict';

// Public, no-login view of a shared verdict card - the viral loop's landing page.

const RESULT_LINE: Record<VerdictCard['r'], string> = {
  won: '🏆 VICTORY',
  lost: '💀 DEFEAT',
  drew: '🤝 DRAW',
};

export default function VerdictCardView({ card }: { card: VerdictCard | null }) {
  if (!card) {
    return <main className="verdict-page">
      <section className="verdict-card">
        <span className="verdict-card__kicker">CHESS-TOWN · CHESTER’S REPORT CARD</span>
        <h1 className="verdict-card__headline">This verdict link is incomplete.</h1>
        <p className="verdict-card__body">Ask your friend to share their report card again - or go earn one of your own.</p>
        <Link className="verdict-card__cta" href="/play-chester">⚔️ PLAY CHESTER - IT’S FREE</Link>
      </section>
    </main>;
  }
  return <main className="verdict-page">
    <section className="verdict-card">
      <span className="verdict-card__kicker">CHESS-TOWN · CHESTER’S REPORT CARD</span>
      <div className="verdict-card__topline">
        <b className="verdict-card__grade">{card.g}</b>
        <div>
          <span className="verdict-card__score">{card.s}/100</span>
          <span className="verdict-card__meta">{RESULT_LINE[card.r]} vs {card.o}{card.m ? ` · ${Math.ceil(card.m / 2)} moves` : ''}{typeof card.acc === 'number' ? ` · ${card.acc}% accuracy` : ''}</span>
        </div>
      </div>
      <h1 className="verdict-card__headline">“{card.h}”</h1>
      <div className="verdict-card__section"><b>⚡ THE TURNING POINT</b><p>{card.tp}</p></div>
      <div className="verdict-card__section"><b>🎪 THE FUNNIEST MOMENT</b><p>{card.fm}</p></div>
      <div className="verdict-card__section"><b>🎯 THE LESSON</b><p>{card.l}</p></div>
      <Link className="verdict-card__cta" href="/play-chester">THINK YOU CAN DO BETTER?<small>⚔️ Play Chester free - no sign-up</small></Link>
      <span className="verdict-card__footer">Graded by Stockfish. Voiced by Chester. Doubted by no one.</span>
    </section>
  </main>;
}
