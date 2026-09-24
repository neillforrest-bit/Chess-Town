'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getChessdleState, todaysChessdle } from '@/lib/chessdle';

const arcadeGames = [
  { href: '/chessdle', title: 'CHESSDLE', icon: '🟩', copy: 'One mate-in-1 a day, shared with the whole world. Keep the streak alive, flex the emoji grid.' },
  { href: '/pawn-wars', title: 'PAWN WARS', icon: '⚔️', copy: 'Eight pawns, one king, total war. Queen a pawn first or wipe the enemy out.' },
  { href: '/mate-sprint', title: 'MATE SPRINT', icon: '⏱️', copy: 'Sixty seconds. Every position is mate in one. How many can you find?' },
];

export default function ArcadePage() {
  const [chessdle, setChessdle] = useState<{ number: number; streak: number } | null>(null);
  useEffect(() => {
    try { const today = todaysChessdle(); setChessdle({ number: today.number, streak: getChessdleState(today.day).streak }); } catch { /* private browsing */ }
  }, []);
  return <main className="arcade-page">
    <section className="town-arcade" aria-label="Chester's arcade - mini games">
      <div className="town-arcade__head">
        <span>CHESTER'S ARCADE</span>
        <h2>MINI GAMES, BIG BRAGGING RIGHTS</h2>
        <p>Fast, loud, endlessly replayable. Chester commentates every one.</p>
      </div>
      <div className="town-arcade__row">
        {arcadeGames.map((game) => {
          const isChessdle = game.href === '/chessdle';
          const title = isChessdle && chessdle ? `CHESSDLE #${chessdle.number}` : game.title;
          const copy = isChessdle && chessdle
            ? chessdle.streak > 0
              ? `Today’s mate-in-1 is live. Your streak: ${chessdle.streak} - keep it breathing.`
              : 'Today’s mate-in-1 is live - same puzzle for the whole world. Start your streak.'
            : game.copy;
          return <Link href={game.href} key={game.title} className="town-cabinet">
            <i aria-hidden="true">{game.icon}</i>
            <b>{title}</b>
            <span>{copy}</span>
            <strong>PLAY →</strong>
          </Link>;
        })}
      </div>
      <div className="minigame-links" style={{ marginTop: '1rem' }}><Link href="/">← Back to Chesterville</Link></div>
    </section>
  </main>;
}
