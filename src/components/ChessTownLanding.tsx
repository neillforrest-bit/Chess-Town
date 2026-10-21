'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getRating, rankFor, getLadder, LADDER_LABELS, WEAKNESS_HOMEWORK, type LadderState } from '@/lib/rating';

import { DOORS } from '@/games/registry';
import { getRoadLevel, ROAD_MAX, bossFor, isBossLevel } from '@/lib/road';

const doors = DOORS.map((d) => ({ ...d, first: d.id === 'play', top: d.id === 'road' }));
const OPENINGS = [
  { name: 'Italian Game', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4', why: 'Quick development and an early eye on f7.' },
  { name: 'Queen\u2019s Gambit', moves: '1.d4 d5 2.c4', why: 'Offer a pawn, take the centre.' },
  { name: 'London System', moves: '1.d4 d5 2.Bf4', why: 'A solid setup you can play against almost anything.' },
  { name: 'Sicilian Defence', moves: '1.e4 c5', why: 'Fight for the centre from the side.' },
  { name: 'Ruy Lopez', moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5', why: 'Pressure the knight that guards e5.' },
  { name: 'French Defence', moves: '1.e4 e6 2.d4 d5', why: 'Solid pawn chain, counter-punch later.' },
  { name: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5', why: 'Rock solid and hard to beat.' },
];
const openingToday = () => OPENINGS[Math.floor(Date.now() / 86400000) % OPENINGS.length];

export default function ChessTownLanding() {
  const [returning, setReturning] = useState(false);
  const [name, setName] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [rank, setRank] = useState<{ name: string; icon: string; points: number } | null>(null);
  const [ladder, setLadder] = useState<LadderState | null>(null);
  const [roadLevel, setRoadLevel] = useState(1);
  const [tip, setTip] = useState('');

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
      setRoadLevel(getRoadLevel());
      if (ladderState.lastFocus) setTip(ladderState.lastFocus);
    } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setLineIndex((index) => index + 1), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = returning
    ? `Welcome back${name ? `, ${name}` : ''}! The whole town lit up when you walked in. Pick a door - any door.`
    : `Well hello there${name ? `, ${name}` : ''}! I’m Chester - knight, jester and mayor of this little town, and I am SO glad you found us. Pick a door below and let’s play.`;
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
        <div className="town-greet__avatar town-greet__avatar--talking town-greet__avatar--wave" aria-hidden="true">♞</div>
        <div className="town-greet__bubble">
          <span>{returning ? 'CHESTER SAYS' : 'CHESTER, MAYOR OF CHESTERVILLE'}</span>
          <p key={lineIndex % chesterLines.length} className="town-greet__line">{bubbleLine}</p>
        </div>
      </div>
      <h1>CHESTER<em>VILLE</em></h1>
      {rank && <Link href="/play-chester?road=1" className="town-rank">{rank.icon} {rank.name} · {rank.points} PTS</Link>}
      {ladder && <Link href="/play-chester" className="town-rank town-rank--ladder">{ladder.grandChester ? '👑 GRAND CHESTER' : `♞ ${LADDER_LABELS[['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][ladder.unlocked]] || 'ROOKIE'} · RUNG ${ladder.unlocked + 1}/4`}</Link>}
    </header>


    {returning
      ? <section className="town-continue" aria-label="Where you left off" style={{ width: 'min(620px,100%)', padding: '0 .8rem', boxSizing: 'border-box', margin: '0 0 .5rem', position: 'relative', zIndex: 2 }}>
          <div style={{ border: '1.5px solid rgba(255,184,0,.4)', borderRadius: 12, padding: '.6rem .8rem', background: 'rgba(10,8,14,.94)', display: 'grid', gap: '.35rem', fontSize: '.85rem', lineHeight: 1.35 }}>
            <b style={{ color: '#ffb800', letterSpacing: '.08em', fontSize: '.72rem' }}>WHERE YOU LEFT OFF</b>
            <span>👑 Road to Joseph: level {roadLevel} of {ROAD_MAX}{isBossLevel(roadLevel) ? ` - boss fight vs ${bossFor(roadLevel)?.name}` : ''}.</span>
            {tip ? <span>💡 Chester&rsquo;s tip you&rsquo;re working on: {tip}</span> : <span>💡 No tip yet. Play a game and Chester will give you one.</span>}
            <span>♟ Today&rsquo;s opening: <b>{openingToday().name}</b> ({openingToday().moves}). {openingToday().why} <Link href="/play-chester" style={{ color: '#4ade80' }}>Try it</Link></span>
          </div>
        </section>
      : <section aria-label="Welcome" style={{ width: 'min(620px,100%)', padding: '0 .8rem', boxSizing: 'border-box', margin: '0 0 .5rem', position: 'relative', zIndex: 2, fontSize: '.85rem', lineHeight: 1.4 }}>
          <div style={{ border: '1.5px solid rgba(74,222,128,.4)', borderRadius: 12, padding: '.6rem .8rem', background: 'rgba(10,8,14,.94)' }}>
            <b style={{ color: '#4ade80', letterSpacing: '.08em', fontSize: '.72rem' }}>NEW HERE?</b><br />Start with <b>PLAY CHESTER</b>. Pick a game, Chester coaches you in plain words. When you are ready, the <b>ROAD TO JOSEPH</b> is the long adventure.
          </div>
        </section>}

    <nav className="town-doors" aria-label="Chesterville destinations">
      {doors.map((door) => <Link href={door.href} key={door.title} className={`town-door ${door.first ? 'town-door--first' : ''} ${(door as { top?: boolean }).top ? 'town-door--top' : ''}`} style={{ '--card-accent': door.accent } as React.CSSProperties}>
        <i aria-hidden="true">{door.icon}</i>
        <div><b>{door.title}</b><span>{door.copy}</span></div>
        <em>→</em>
      </Link>)}
    </nav>

    <style>{`@media (max-height:700px){.town-night--doors .town-greet{display:none}.town-night--doors .town-door span{display:none}.town-night--doors .town-door{padding:.45rem .8rem}}`}</style>
    <div className="town-live"><i /> THE TOWN IS OPEN - FREE TO PLAY</div>
  </main>;
}
