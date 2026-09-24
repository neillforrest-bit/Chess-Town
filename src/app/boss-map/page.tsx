'use client';

// THE ROAD TO JOSEPH - RPG world-map skeleton. Themed areas reuse the existing
// mini-games and lessons; mini-bosses are coached Chester games at rising
// difficulty; Joseph is the capstone. Progress + rating live in localStorage.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBossProgress, getRating, rankFor, type BossProgress, type RatingState } from '@/lib/rating';
import { getChessdleState, todaysChessdle } from '@/lib/chessdle';

type Node = {
  id: string; area: string; name: string; icon: string; blurb: string;
  href: string; kind: 'mini' | 'boss' | 'final'; action: string;
};

const NODES: Node[] = [
  { id: 'pawn-plains', area: 'AREA 1 · PAWN PLAINS', name: 'PAWN WARS', icon: '⚔️', blurb: 'Prove you can march a pawn to glory.', href: '/pawn-wars', kind: 'mini', action: 'WIN A WAR' },
  { id: 'sprint-sands', area: 'AREA 2 · SPRINT SANDS', name: 'MATE SPRINT', icon: '⏱️', blurb: 'Find 3 mates in one sprint to pass.', href: '/mate-sprint', kind: 'mini', action: 'SCORE 3+' },
  { id: 'puzzle-peaks', area: 'AREA 3 · PUZZLE PEAKS', name: 'CHESSDLE', icon: '🟩', blurb: 'Solve today\'s mate to light the beacon.', href: '/chessdle', kind: 'mini', action: 'SOLVE TODAY' },
  { id: 'dojo-trials', area: 'MINI-BOSS · DOJO TRIALS', name: 'ROOKIE CHESTER', icon: '🥋', blurb: 'Chester goes easy. Mostly. Beat him to advance.', href: '/play-chester?level=BEGINNER&boss=dojo-trials', kind: 'boss', action: 'BEAT ROOKIE' },
  { id: 'masters-gate', area: 'MINI-BOSS · MASTER\'S GATE', name: 'CLUB CHESTER', icon: '🎩', blurb: 'No more free queens. A fair fight with teeth.', href: '/play-chester?level=INTERMEDIATE&boss=masters-gate', kind: 'boss', action: 'BEAT CLUB' },
  { id: 'josephs-throne', area: 'FINAL BOSS · THE THRONE', name: 'JOSEPH', icon: '♚', blurb: 'Nightmare Chester channels the Big Boss himself. The town is watching.', href: '/play-chester?level=EXPERT&boss=josephs-throne', kind: 'final', action: 'DETHRONE HIM' },
];

function miniDone(id: string): boolean {
  try {
    if (id === 'pawn-plains') { const raw = window.localStorage.getItem('pawn-wars-v1'); return raw ? (JSON.parse(raw).wins || 0) > 0 : false; }
    if (id === 'sprint-sands') return Number(window.localStorage.getItem('mate-sprint-best') || 0) >= 3;
    if (id === 'puzzle-peaks') return getChessdleState(todaysChessdle().day).streak >= 1;
  } catch { /* private browsing */ }
  return false;
}

export default function BossMapPage() {
  const [progress, setProgress] = useState<BossProgress>({ completed: [] });
  const [rating, setRating] = useState<RatingState>({ points: 0, wins: 0, history: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => { setProgress(getBossProgress()); setRating(getRating()); setReady(true); }, []);

  const done = (node: Node) => node.kind === 'mini' ? (ready && miniDone(node.id)) : progress.completed.includes(node.id);
  const unlocked = (index: number) => index === 0 || NODES.slice(0, index).every((node) => done(node));
  const rank = rankFor(rating.points);
  const allClear = NODES.every((node) => done(node));

  return <main className="bossmap-page">
    <header className="bossmap-head">
      <span>THE ROAD TO JOSEPH</span>
      <h1>WORLD MAP</h1>
      <p>Clear each area to unlock the next. Mini-bosses guard the road. Joseph guards the throne.</p>
    </header>

    <div className="bossmap-rating" aria-label="Your Chesterville rating">
      <i>{rank.icon}</i>
      <div><span>CHESTERVILLE RANK</span><b>{rank.name} · {rating.points} PTS</b>
        <p>{rank.next ? `${rank.next.at - rating.points} pts to ${rank.next.name}` : 'The summit. Joseph is nervous.'} · {rating.wins} {rating.wins === 1 ? 'win' : 'wins'} banked</p></div>
    </div>

    <div className="bossmap-ladder" aria-label="Community ladder - coming soon">
      <span>COMMUNITY LADDER</span>
      <b>👥 MORE TO COME - STAY TUNED</b>
      <p>Your rank is solo for now. The plan: same points, same road, but stacked against your friends. Every win you bank today will count when the ladder opens.</p>
    </div>

    <section className="bossmap-path" aria-label="World map path">
      {NODES.map((node, index) => {
        const isDone = done(node);
        const isOpen = unlocked(index);
        const state = isDone ? 'done' : isOpen ? 'open' : 'locked';
        return <div key={node.id} className={`bossmap-node bossmap-node--${state} ${index % 2 ? 'bossmap-node--right' : ''}`}>
          <div className="bossmap-node__badge" aria-hidden="true">{isDone ? '✓' : isOpen ? node.icon : '🔒'}</div>
          <div className="bossmap-node__card">
            <span>{node.area}</span>
            <b>{node.name}</b>
            <p>{isDone ? 'Conquered. The town remembers.' : isOpen ? node.blurb : 'Clear the road behind you first.'}</p>
            {isOpen && !isDone && <Link href={node.href} className={node.kind === 'final' ? 'bossmap-go bossmap-go--final' : 'bossmap-go'}>{node.action} →</Link>}
            {isDone && <Link href={node.href} className="bossmap-replay">REPLAY →</Link>}
          </div>
        </div>;
      })}
    </section>

    {allClear && <p className="bossmap-legend">👑 THE TOWN IS YOURS. Joseph demands a rematch - he always does.</p>}
    <div className="minigame-links"><Link href="/">← Back to Chesterville</Link></div>
  </main>;
}
