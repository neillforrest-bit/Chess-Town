'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getChessdleState, todaysChessdle } from '@/lib/chessdle';

const arcadeGames = [
  { href: '/chessdle', title: 'CHESSDLE', icon: '🟩', copy: 'One mate-in-1 a day, shared with the whole world. Keep the streak alive, flex the emoji grid.' },
  { href: '/pawn-wars', title: 'PAWN WARS', icon: '⚔️', copy: 'Eight pawns, one king, total war. Queen a pawn first or wipe the enemy out.' },
  { href: '/mate-sprint', title: 'MATE SPRINT', icon: '⏱️', copy: 'Sixty seconds. Every position is mate in one. How many can you find?' },
];

const townOptions = [
  { href: '/play-chester', icon: '♞', title: "CHESTER'S DOJO", copy: 'A guided game where Chester reads every move with you. The fastest fun way to actually get better.', accent: '#4ade80' },
  { href: '/arena', icon: '♜', title: 'THE ARENA', copy: 'Rivalries, daily battles and the lights that turn one good move into local legend.', accent: '#ff4eb1' },
  { href: '/training', icon: '♝', title: 'LESSON HALL', copy: 'Nine focused drills - openings, king safety, endgames - each one a real game with live coaching.', accent: '#b8a2ff' },
  { href: '/arena?friend=1', icon: '⚔️', title: 'CHALLENGE A FRIEND', copy: 'Send a link, they get a board. Chester commentates both sides and is only slightly biased.', accent: '#ffd84d' },
  { href: '/daily-challenge', icon: '☀️', title: 'DAILY CHALLENGE', copy: 'One town puzzle a day. Solve it, bank the streak, compare notes tomorrow.', accent: '#22d3ee' },
  { href: '/boss-map', icon: '👑', title: 'BOSS MAP', copy: 'Climb one rival at a time. At the top sits Joseph - unbeaten, smug, waiting.', accent: '#ff8c00' },
];

const howItWorks = [
  { icon: '🎮', title: 'PLAY SOMETHING FUN', copy: 'A guided game, a mini-game, today’s challenge - every visit starts with a game, not a lecture.' },
  { icon: '♞', title: 'CHESTER COACHES LIVE', copy: 'Real Stockfish analysis translated into plain English while you play. You learn without noticing.' },
  { icon: '👑', title: 'CLIMB TOWARD THE BOSS', copy: 'Every win moves you up the boss map. At the top, Joseph is waiting. Beat him and the town is yours.' },
];

export default function ChessTownLanding() {
  const [returning, setReturning] = useState(false);
  const [name, setName] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [chessdle, setChessdle] = useState<{ number: number; streak: number } | null>(null);

  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem('chess-town-visited')));
      window.localStorage.setItem('chess-town-visited', '1');
      const profileName = getProfile().username;
      if (profileName && profileName !== 'Challenger') setName(profileName);
      const today = todaysChessdle();
      const state = getChessdleState(today.day);
      setChessdle({ number: today.number, streak: state.streak });
    } catch { /* private browsing: first-visit welcome is fine */ }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLineIndex((index) => index + 1), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = returning
    ? `Welcome back${name ? `, ${name}` : ''}. Joseph is still unbeaten, still smug, still at the top of the boss map. Go take something from him.`
    : 'Evening. I’m Chester - knight, coach and mayor of this town. Welcome to Chesterville: play guided games with me, beat the daily mini-games, and climb the boss map to Joseph at the top. Nobody has beaten him. Yet.';
  const chesterLines = [
    greeting,
    'Chesterville in one line: every game here teaches you something without feeling like homework. I commentate, you play, you get better.',
    'One good move a day beats an hour of homework. Today’s Chessdle is waiting - the whole world gets the same one.',
    'Town tip: the player who counts what changed after every move beats the player who memorises openings.',
    'Joseph checked the leaderboard twice while you were gone. He pretends he doesn’t. He does.',
    'Bring a friend to the arena. I commentate both sides and I am only slightly biased.',
    'Blunders are just lessons wearing a false moustache. I grade them, you learn, we both move on.',
  ];
  const bubbleLine = chesterLines[lineIndex % chesterLines.length];

  return <main className="town-night">
    <div className="town-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <div className="town-moon" aria-hidden="true">♘</div>

    <header className="town-masthead">
      <div className="town-greet" role="note" aria-label="Chester greets you">
        <div className="town-greet__avatar" aria-hidden="true">♞</div>
        <div className="town-greet__bubble">
          <span>{returning ? 'CHESTER SAYS' : 'CHESTER, MAYOR OF CHESTERVILLE'}</span>
          <p key={lineIndex % chesterLines.length} className="town-greet__line">{bubbleLine}</p>
        </div>
      </div>
      <span className="town-masthead__kicker">WELCOME TO</span>
      <h1>CHESTER<em>VILLE</em></h1>
      <p className="town-tagline">A neon chess town where every game comes with a coach: guided games in the dojo, mini-games in the arcade, and a boss map with Joseph at the top.</p>
      <div className="town-cta">
        <Link href="/play-chester" className="town-cta__play">▶ PLAY WITH CHESTER</Link>
        <Link href="/arena?friend=1" className="town-cta__friend">⚔ CHALLENGE A FRIEND</Link>
      </div>
      <div className="town-live"><i /> THE TOWN IS OPEN - FREE TO PLAY</div>
    </header>

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
    </section>

    <section className="town-grid" aria-label="Everywhere you can go in Chesterville">
      <div className="town-grid__head">
        <span>THE WHOLE TOWN</span>
        <h2>PICK YOUR ADVENTURE</h2>
      </div>
      <div className="town-grid__row">
        {townOptions.map((option) => <Link href={option.href} key={option.title} className="town-card" style={{ '--card-accent': option.accent } as React.CSSProperties}>
          <i aria-hidden="true">{option.icon}</i>
          <b>{option.title}</b>
          <p>{option.copy}</p>
        </Link>)}
      </div>
    </section>

    <section className="town-boss" aria-label="The Big Boss">
      <div className="town-boss__crown" aria-hidden="true">♚</div>
      <div className="town-boss__card">
        <span>THE BIG BOSS OF CHESTERVILLE</span>
        <h2>JOSEPH IS WAITING<span className="town-boss__dots">…</span></h2>
        <p>Climb the boss map one rival at a time. Win games, take districts, earn your shot at the top of the hill - where Joseph sits, undefeated, pretending not to check the leaderboard.</p>
        <div className="town-boss__actions">
          <Link href="/boss-map">SEE THE BOSS MAP →</Link>
          <Link href="/arena?friend=1">WARM UP VS A FRIEND</Link>
        </div>
      </div>
    </section>

    <section className="town-how" aria-label="How Chesterville works">
      {howItWorks.map((step) => <div key={step.title}><b><i>{step.icon}</i>{step.title}</b><p>{step.copy}</p></div>)}
    </section>

    <footer className="town-footer">
      <p><b>Tonight in town:</b> the dojo lights are on, the arcade is loud, and Joseph just checked the leaderboard again.</p>
      <nav><Link href="/chessdle">Chessdle</Link><Link href="/daily-challenge">Daily challenge</Link><Link href="/boss-map">Boss map</Link><Link href="/meet-chester">Meet Chester</Link></nav>
    </footer>
  </main>;
}
