'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getChessdleState, todaysChessdle } from '@/lib/chessdle';

const destinations = [
  {
    eyebrow: 'LEARN WITH CHESTER',
    title: "CHESTER'S DOJO",
    copy: 'A guided game where Chester reads every move with you. The fastest fun way to actually get better.',
    href: '/play-chester',
    action: 'ENTER THE DOJO',
    icon: '♞',
    className: 'town-building--dojo',
  },
  {
    eyebrow: 'THE TOWN HALL',
    title: 'TOWN HALL',
    copy: 'Rivalries, daily battles, mini-games and the lights that turn one good move into local legend.',
    href: '/arena',
    action: 'STEP INTO THE LIGHTS',
    icon: '♜',
    className: 'town-building--arena',
  },
  {
    eyebrow: 'BUILD YOUR GAME',
    title: 'LESSON HALL',
    copy: 'Sharp tactics and focused missions that quietly turn you into the player your friends fear.',
    href: '/training',
    action: 'START A LESSON',
    icon: '♝',
    className: 'town-building--lessons',
  },
];

const miniGames = [
  { href: '/chessdle', title: 'CHESSDLE', copy: 'One mate-in-1 a day, shared with the whole world. Keep the streak alive, flex the emoji grid.' },
  { href: '/pawn-wars', title: 'PAWN WARS', copy: 'Eight pawns, one king, total war. Queen a pawn first or wipe the enemy out.' },
  { href: '/mate-sprint', title: 'MATE SPRINT', copy: 'Sixty seconds. Every position is mate in one. How many can you find?' },
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
    : 'Evening. I’m Chester - knight, coach and mayor of Chess Town. Play a game in my dojo, challenge a friend in the town hall, and climb the boss map. At the top sits Joseph, the Big Boss. Nobody has beaten him. Yet.';
  const chesterLines = [
    greeting,
    'One good move a day beats an hour of homework. Today’s Chessdle is waiting - the whole world gets the same one.',
    'Town tip: the player who counts what changed after every move beats the player who memorises openings.',
    'Joseph checked the leaderboard twice while you were gone. He pretends he doesn’t. He does.',
    'Bring a friend to the town hall. I commentate both sides and I am only slightly biased.',
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
          <span>{returning ? 'CHESTER SAYS' : 'CHESTER, MAYOR OF CHESS TOWN'}</span>
          <p key={lineIndex % chesterLines.length} className="town-greet__line">{bubbleLine}</p>
        </div>
      </div>
      <span className="town-masthead__kicker">WELCOME TO</span>
      <h1>CHESS <em>TOWN</em></h1>
      <div className="town-cta">
        <Link href="/play-chester" className="town-cta__play">▶ PLAY WITH CHESTER</Link>
        <Link href="/arena?friend=1" className="town-cta__friend">⚔ CHALLENGE A FRIEND</Link>
      </div>
      <div className="town-live"><i /> THE TOWN IS OPEN - FREE TO PLAY</div>
    </header>

    <section className="town-boss" aria-label="The Big Boss">
      <div className="town-boss__crown" aria-hidden="true">♚</div>
      <div className="town-boss__card">
        <span>THE BIG BOSS OF CHESS TOWN</span>
        <h2>JOSEPH IS WAITING<span className="town-boss__dots">…</span></h2>
        <p>Climb the boss map one rival at a time. Win games, take districts, earn your shot at the top of the hill - where Joseph sits, undefeated, pretending not to check the leaderboard.</p>
        <div className="town-boss__actions">
          <Link href="/boss-map">SEE THE BOSS MAP →</Link>
          <Link href="/arena?friend=1">WARM UP VS A FRIEND</Link>
        </div>
      </div>
    </section>

    <section className="town-street" id="town-street" aria-label="Choose a Chess Town destination">
      <div className="town-street__glow" aria-hidden="true" />
      {destinations.map((destination) => <Link href={destination.href} key={destination.title} className={`town-building ${destination.className}`}>
        <div className="town-building__roof" aria-hidden="true" />
        <div className="town-building__sign"><span>{destination.eyebrow}</span><b>{destination.title}</b></div>
        <div className="town-building__windows" aria-hidden="true"><i /><i /><i /></div>
        <div className="town-building__door" aria-hidden="true"><span>{destination.icon}</span></div>
        <p>{destination.copy}</p>
        <strong>{destination.action} <i>→</i></strong>
      </Link>)}
    </section>

    <section className="town-minis" aria-label="Mini games">
      {miniGames.map((game) => {
        const isChessdle = game.href === '/chessdle';
        const title = isChessdle && chessdle ? `CHESSDLE #${chessdle.number}` : game.title;
        const copy = isChessdle && chessdle
          ? chessdle.streak > 0
            ? `Today’s mate-in-1 is live. Your streak: ${chessdle.streak} - keep it breathing.`
            : 'Today’s mate-in-1 is live - same puzzle for the whole world. Start your streak.'
          : game.copy;
        return <Link href={game.href} key={game.title}><b>{title}</b><span>{copy}</span></Link>;
      })}
    </section>

    <section className="town-how" aria-label="How Chess Town works">
      {howItWorks.map((step) => <div key={step.title}><b><i>{step.icon}</i>{step.title}</b><p>{step.copy}</p></div>)}
    </section>

    <footer className="town-footer">
      <p><b>Tonight in town:</b> the dojo lights are on, the arena is loud, and Joseph just checked the leaderboard again.</p>
      <nav><Link href="/chessdle">Chessdle</Link><Link href="/daily-challenge">Daily challenge</Link><Link href="/boss-map">Boss map</Link><Link href="/meet-chester">Meet Chester</Link></nav>
    </footer>
  </main>;
}
