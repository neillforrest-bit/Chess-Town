'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getRating, rankFor } from '@/lib/rating';

const doors = [
  { href: '/play-chester', icon: '♞', title: 'PLAY WITH CHESTER', copy: 'A guided game: instant move grades, WHY lessons, live coaching.', accent: '#4ade80', first: true },
  { href: '/arcade', icon: '🕹️', title: "CHESTER'S ARCADE", copy: 'Three mini-games: Chessdle, Pawn Wars, Mate Sprint.', accent: '#ff4eb1' },
  { href: '/training', icon: '♝', title: 'LESSON HALL', copy: 'Nine coached drills - pick a difficulty, learn by playing.', accent: '#b8a2ff' },
  { href: '/arena', icon: '♜', title: 'THE ARENA', copy: 'Rivalries, daily battles and the big lights.', accent: '#22d3ee' },
  { href: '/arena?friend=1', icon: '⚔️', title: 'CHALLENGE A FRIEND', copy: 'Send a link, they get a board. Chester commentates both sides.', accent: '#ffd84d' },
  { href: '/daily-challenge', icon: '☀️', title: 'DAILY CHALLENGE', copy: 'One town puzzle a day. Solve it, bank the streak.', accent: '#4ade80' },
  { href: '/boss-map', icon: '👑', title: 'THE ROAD TO JOSEPH', copy: 'Mario-style world map: clear areas, beat mini-bosses, dethrone the Big Boss.', accent: '#ff8c00' },
];

export default function ChessTownLanding() {
  const [returning, setReturning] = useState(false);
  const [name, setName] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [rank, setRank] = useState<{ name: string; icon: string; points: number } | null>(null);

  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem('chess-town-visited')));
      window.localStorage.setItem('chess-town-visited', '1');
      const profileName = getProfile().username;
      if (profileName && profileName !== 'Challenger') setName(profileName);
      const rating = getRating();
      if (rating.points > 0) { const r = rankFor(rating.points); setRank({ name: r.name, icon: r.icon, points: rating.points }); }
    } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLineIndex((index) => index + 1), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = returning
    ? `Welcome back${name ? `, ${name}` : ''}. Joseph is still unbeaten, still smug, still at the top of the road. Go take something from him.`
    : 'Evening. I’m Chester - knight, coach and mayor of this town. Welcome to Chesterville: play guided games with me, beat the arcade, climb the road to Joseph. Nobody has beaten him. Yet.';
  const chesterLines = [
    greeting,
    'Chesterville in one line: every game here teaches you something without feeling like homework.',
    'One good move a day beats an hour of homework. Today’s Chessdle is waiting in the arcade.',
    'Town tip: the player who counts what changed after every move beats the player who memorises openings.',
    'Joseph checked the leaderboard twice while you were gone. He pretends he doesn’t. He does.',
    'Blunders are just lessons wearing a false moustache. I grade them, you learn, we both move on.',
  ];
  const bubbleLine = chesterLines[lineIndex % chesterLines.length];

  return <main className="town-night town-night--doors">
    <div className="town-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <div className="town-moon" aria-hidden="true">♘</div>

    <header className="town-masthead town-masthead--compact">
      <div className="town-greet" role="note" aria-label="Chester greets you">
        <div className="town-greet__avatar" aria-hidden="true">♞</div>
        <div className="town-greet__bubble">
          <span>{returning ? 'CHESTER SAYS' : 'CHESTER, MAYOR OF CHESTERVILLE'}</span>
          <p key={lineIndex % chesterLines.length} className="town-greet__line">{bubbleLine}</p>
        </div>
      </div>
      <h1>CHESTER<em>VILLE</em></h1>
      {rank && <Link href="/boss-map" className="town-rank">{rank.icon} {rank.name} · {rank.points} PTS</Link>}
    </header>

    <nav className="town-doors" aria-label="Chesterville destinations">
      {doors.map((door) => <Link href={door.href} key={door.title} className={`town-door ${door.first ? 'town-door--first' : ''}`} style={{ '--card-accent': door.accent } as React.CSSProperties}>
        <i aria-hidden="true">{door.icon}</i>
        <div><b>{door.title}</b><span>{door.copy}</span></div>
        <em>→</em>
      </Link>)}
    </nav>

    <div className="town-live"><i /> THE TOWN IS OPEN - FREE TO PLAY</div>
  </main>;
}
