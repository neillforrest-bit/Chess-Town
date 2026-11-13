'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';
import { getRating, rankFor, getLadder, LADDER_LABELS, WEAKNESS_HOMEWORK, type LadderState } from '@/lib/rating';

import { DOORS } from '@/games/registry';
import { getRoadLevel, ROAD_MAX, bossFor, isBossLevel } from '@/lib/road';
import { loadPlayerFile, analyse, type Analysis } from '@/lib/player-file';
import ChesterCompanion from '@/components/ChesterCompanion';

const doors = DOORS.map((d) => ({ ...d, first: d.id === 'play', top: d.id === 'road' }));
doors.splice(1, 0, { id: 'road', title: 'MAIN STREET TO BRENDO', href: '/road/brendo', icon: '♚', accent: '#51d6a0', copy: 'PJ → Rost → Andy → Byron → Brendo. Five opponents, one climb.', first: false, top: false });
const OPENINGS = [
  { name: 'Italian Game', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4', why: 'Quick development and an early eye on f7.' },
  { name: 'Queen’s Gambit', moves: '1.d4 d5 2.c4', why: 'Offer a pawn, take the centre.' },
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
  const [scout, setScout] = useState<Analysis | null>(null);

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
      try { const a = analyse(loadPlayerFile()); if (a.games > 0) setScout(a); } catch { /* no file yet */ }
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

  return <main className="ct-landing">
    <section className="ct-hero" aria-label="Welcome to Chess Town">
      <div className="ct-hero__copy">
        <span className="ct-host-label">I’m Chester. Your host.</span>
        <h1>Chess<br /><em>Town</em></h1>
        <span className="ct-hero__caption">Roads, battles and lessons. One screen at a time.</span>
      </div>
      <div className="ct-hero__character" aria-hidden="true"><ChesterCompanion /></div>
      {(rank || ladder) && <div className="ct-chips">
        {rank && <Link href="/play-chester?road=1" className="ct-chip">{rank.icon} {rank.name} · {rank.points} PTS</Link>}
        {ladder && <Link href="/play-chester" className="ct-chip ct-chip--lime">{ladder.grandChester ? '👑 GRAND CHESTER' : `♞ ${LADDER_LABELS[['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][ladder.unlocked]] || 'ROOKIE'} · RUNG ${ladder.unlocked + 1}/4`}</Link>}
      </div>}
    </section>

    <section className="ct-card ct-prompter" aria-label="Chester says">
      <span className="ct-eyebrow">{returning ? 'Chester says' : 'Chester, mayor of Chess Town'}</span>
      <p key={lineIndex % chesterLines.length} className="ct-prompter__line">{bubbleLine}</p>
    </section>

    {returning
      ? <section className="ct-card ct-continue" aria-label="Where you left off">
          <b className="ct-continue__title">WHERE YOU LEFT OFF</b>
          <span>👑 Road to Joseph: level {roadLevel} of {ROAD_MAX}{isBossLevel(roadLevel) ? ` - boss fight vs ${bossFor(roadLevel)?.name}` : ''}.</span>
          {tip ? <span>💡 Chester’s tip you’re working on: {tip}</span> : <span>💡 No tip yet. Play a game and Chester will give you one.</span>}
          {scout && scout.flagged > 0 && (() => {
            const phaseName = scout.worstPhase === 'middlegame' ? 'the middle of the game' : scout.worstPhase || 'the middlegame';
            const target = Math.max(1, Math.floor(scout.perGame) - 1);
            // Drill matched to WHERE the slips happen, educationally: loose pieces live in
            // the middlegame -> Pawn Wars trains "nothing left hanging" (same mapping as the
            // report card's blunders habit); opening slips -> Lesson Hall; endgame -> conversion reps.
            const drill = scout.worstPhase === 'opening' ? { text: 'Lesson Hall - develop with purpose', href: '/training' } : scout.worstPhase === 'endgame' ? { text: 'a rematch at your level - convert the ending', href: '/play-chester' } : { text: 'Pawn Wars - short sharp games, nothing left hanging', href: '/pawn-wars' };
            return <span>📚 <b>Today’s homework:</b> {scout.headline}{scout.topPiece ? <> Your most-dropped piece: the <b>{scout.topPiece.piece}</b> ({scout.topPiece.n}&times;).</> : null} Assignment: one game at your level, and finish with <b>&le;{target} big slip{target === 1 ? '' : 's'}</b> (your average: {scout.perGame.toFixed(1)}). {scout.lesson} Sharpen it: <Link href={drill.href} className="ct-link">{drill.text}</Link>.{scout.trend === 'better' ? ' Trend: improving - Chester noticed.' : scout.trend === 'worse' ? ' Trend: slipping - today we fix that.' : ''}</span>;
          })()}
          {scout && scout.flagged === 0 && <span>📚 <b>Today’s homework:</b> no big slips on file - rare air. One game at the NEXT level up: the homework is noticing the moment it gets hard.</span>}
          <span>♟ Today’s opening: <b>{openingToday().name}</b> ({openingToday().moves}). {openingToday().why} <Link href="/play-chester" className="ct-link">Try it</Link></span>
        </section>
      : <section className="ct-card ct-continue" aria-label="New here">
          <b className="ct-continue__title ct-continue__title--green">NEW HERE?</b>
          <span>Start with <b>PLAY CHESTER</b>. Pick a game, Chester coaches you in plain words. When you are ready, the <b>ROAD TO JOSEPH</b> is the long adventure.</span>
        </section>}

    <nav className="ct-doors" aria-label="Chess Town destinations">
      {doors.map((door) => <Link href={door.href} key={door.title} className={`ct-door ${door.first ? 'ct-door--first' : ''}`} style={{ '--door-accent': door.accent } as React.CSSProperties}>
        <i aria-hidden="true">{door.icon}</i>
        <div><b>{door.title}</b><span>{door.copy}</span></div>
        <em>→</em>
      </Link>)}
    </nav>

    <div className="ct-live"><i /> THE TOWN IS OPEN - FREE TO PLAY</div>
  </main>;
}
