'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GAME_OPTIONS } from '@/lib/game-options';
import { ChesterAvatar } from '@/components/ChesterUI';

export default function GamesHub() {
  const [filter, setFilter] = useState<'all' | 'trivia' | 'chess'>('all');
  return <main className="games-hub" aria-labelledby="games-title">
    <div className="games-hub__inner">
      <header className="games-hub__header">
        <ChesterAvatar isThinking={false} trivia size="large" />
        <div><span>CHESS-TOWN · CHESTER&apos;S HOUSE</span><h1 id="games-title">Games to play</h1><p>Pick your game. Take your seat.</p></div>
      </header>
      <div className="games-hub__filters" role="group" aria-label="Show games">
        {(['all', 'trivia', 'chess'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All games' : value === 'trivia' ? 'Pub trivia' : 'Chess'}</button>)}
      </div>
      {(['trivia', 'chess'] as const).filter(family => filter === 'all' || filter === family).map(family => <section className={`games-hub__family games-hub__family--${family}`} key={family} aria-labelledby={`games-${family}`}>
        <header><h2 id={`games-${family}`}>{family === 'trivia' ? "Chester's Pub Trivia" : 'At the chessboard'}</h2><p>{family === 'trivia' ? 'No chess required.' : 'A board, a rival and a plan.'}</p></header>
        <div className="games-hub__grid">{GAME_OPTIONS.filter(game => game.family === family).map(game => <article className="game-choice" key={game.id} data-game={game.id}>
          <span className="game-choice__players">{game.players}</span><h3>{game.title}</h3><p>{game.description}</p>
          <Link href={game.href} aria-label={`${game.action}: ${game.title}`}>{game.action}<span aria-hidden="true">↗</span></Link>
          {game.note && <small>{game.note}</small>}
        </article>)}</div>
      </section>)}
      <footer className="games-hub__footer"><Link href="/profile">Your profile</Link><Link href="/meet-chester">Meet Chester</Link><Link href="/trivia-brawl">Trivia rules & options</Link><p>Invite links still take you straight to your game.</p></footer>
    </div>
  </main>;
}
