'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getRating, rankFor, getLadder, LADDER_LABELS, WEAKNESS_HOMEWORK, type LadderState } from '@/lib/rating';

const doors = [
  { href: '/play-chester', icon: '♞', title: 'PLAY WITH CHESTER', copy: 'Guided games, instant grades, WHY lessons. The front door.', accent: '#4ade80', first: true },
  { href: '/arena?friend=1', icon: '⚔️', title: 'CHALLENGE A FRIEND', copy: 'One tap sends the herald. They get a board, you get glory.', accent: '#ffd84d' },
  { href: '/arcade', icon: '🕹️', title: "CHESTER'S ARCADE", copy: 'Chessdle, Pawn Wars, Mate Sprint. Fast and loud.', accent: '#ff4eb1' },
  { href: '/training', icon: '♝', title: 'LESSON HALL', copy: 'Nine coached drills. Pick a difficulty, learn by playing.', accent: '#b8a2ff' },
  { href: '/trivia-brawl', icon: '🍻', title: 'PUB TRIVIA BRAWL', copy: 'Trivia with teeth - solo vs me, or a friend by link.', accent: '#22d3ee' },
  { href: '/daily-challenge', icon: '☀️', title: 'DAILY CHALLENGE', copy: 'One town puzzle a day. Bank the streak.', accent: '#4ade80' },
  { href: '/boss-map', icon: '👑', title: 'THE ROAD TO JOSEPH', copy: 'Clear the map, beat the bosses, dethrone the Big Boss.', accent: '#ff8c00' },
];

export default function ChessTownLanding() {
  const [returning, setReturning] = useState(false);
  const [name, setName] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [rank, setRank] = useState<{ name: string; icon: string; points: number } | null>(null);
  const [ladder, setLadder] = useState<LadderState | null>(null);

  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem('chess-town-visited')));
      window.localStorage.setItem('chess-town-visited', '1');
      const profileName = getProfile().username;
      if (profileName && profileName !== 'Challenger') setName(profileName);
      const rating = getRating();
      if (rating.points > 0) { const r = rankFor(rating.points); setRank({ name: r.name, icon: r.icon, points: rating.points }); }
      const ladderState = getLadder();
      if (ladderState.updatedAt) setLadder(ladderState);
    } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLineIndex((index) => index + 1), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = returning
    ? `Back for more${name ? `, ${name}` : ''}? Joseph is still unbeaten and still smug. Pick a door.`
    : 'Evening. I’m Chester - knight, coach and mayor of Chesterville. Pick a door: I grade the moves, roast the blunders and remember everything.';
  const ladderLines: string[] = [];
  if (ladder) {
    const currentLabel = ladder.grandChester ? 'GRAND CHESTER' : LADDER_LABELS[['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][ladder.unlocked]] || 'ROOKIE';
    if (ladder.grandChester) ladderLines.push('GRAND CHESTER walks the town. NIGHTMARE beaten, crown collected. Joseph is next, and he knows it.');
    else if (ladder.unlocked > 0) ladderLines.push(`${currentLabel} unlocked. The ladder remembers every rung - ${ladder.unlocked + 1} of 4 and climbing.`);
    if (ladder.lastResult === 'win' && ladder.lastLevel) ladderLines.push(`Still thinking about that win at ${LADDER_LABELS[ladder.lastLevel] || 'ROOKIE'}. ${ladder.lastGrade ? `Graded ${ladder.lastGrade}. ` : ''}The ladder noticed.`);
    if (ladder.lastResult === 'loss' && ladder.lastLevel) ladderLines.push(`That last one at ${LADDER_LABELS[ladder.lastLevel] || 'ROOKIE'} stung - good. Sting is tuition. Run it back when you are ready.`);
    if (ladder.lastFocus) ladderLines.push(`Your homework from the last scorecard: ${ladder.lastFocus}`);
    if (ladder.lastWeakness && WEAKNESS_HOMEWORK[ladder.lastWeakness]) ladderLines.push(`Where to practise that: ${WEAKNESS_HOMEWORK[ladder.lastWeakness].text}.`);
  }
  const chesterLines = [
    greeting,
    ...ladderLines,
    'New here? PLAY WITH CHESTER is the front door. Live coaching, in words, never homework.',
    'Challenge a friend: one tap and my herald rides out. They get a board, you get glory.',
    'Chessdle lives in the arcade - one puzzle a day, the same one for the whole town.',
    'One good move a day beats an hour of homework.',
    'Joseph checked the leaderboard twice while you were gone. He pretends he doesn’t. He does.',
  ];
  const bubbleLine = chesterLines[lineIndex % chesterLines.length];

  return <main className="town-night town-night--doors">
    <div className="town-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <div className="town-moon" aria-hidden="true">♘</div>

    <header className="town-masthead town-masthead--compact">
      <div className="town-greet" role="note" aria-label="Chester greets you">
        <div className="town-greet__avatar town-greet__avatar--talking" aria-hidden="true">♞</div>
        <div className="town-greet__bubble">
          <span>{returning ? 'CHESTER SAYS' : 'CHESTER, MAYOR OF CHESTERVILLE'}</span>
          <p key={lineIndex % chesterLines.length} className="town-greet__line">{bubbleLine}</p>
        </div>
      </div>
      <h1>CHESTER<em>VILLE</em></h1>
      {rank && <Link href="/boss-map" className="town-rank">{rank.icon} {rank.name} · {rank.points} PTS</Link>}
      {ladder && <Link href="/play-chester" className="town-rank town-rank--ladder">{ladder.grandChester ? '👑 GRAND CHESTER' : `♞ ${LADDER_LABELS[['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][ladder.unlocked]] || 'ROOKIE'} · RUNG ${ladder.unlocked + 1}/4`}</Link>}
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
