'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ROAD_MAX, BOSS_ROSTER, getRoadLevel, eloForLevel, isBossLevel } from '@/lib/road';

const ZONES = [
  { from: 1, name: 'PAWN MEADOW', bg: 'linear-gradient(180deg,#1f4d2b,#2f6b3a)', tag: 'Where every legend starts.' },
  { from: 4, name: 'KNIGHT FOREST', bg: 'linear-gradient(180deg,#143524,#1b3d3a)', tag: 'The trees watch your every move.' },
  { from: 7, name: 'BISHOP HILLS', bg: 'linear-gradient(180deg,#3b2a55,#4a3366)', tag: 'Diagonals everywhere. Nowhere to hide.' },
  { from: 10, name: 'FROZEN KEEP', bg: 'linear-gradient(180deg,#1d3b57,#27506e)', tag: 'Cold, patient, hard to crack.' },
  { from: 13, name: 'JOSEPH\u2019S CASTLE', bg: 'linear-gradient(180deg,#3a1420,#561b2a)', tag: 'One door left.' },
];
const ROW = 92, W = 340;
const pos = (n: number) => ({ x: 170 + Math.sin((n - 1) * 1.15) * 110, y: (ROAD_MAX - n) * ROW + 70 });
const BOSS_ICON: Record<number, string> = { 3: '♟', 6: '♞', 9: '♝', 12: '♛', 15: '♚' };
const LINES: Record<number, string> = {
  3: 'Casual, chatty, and confident. Beat him and the road opens.',
  6: 'Methodical. He never blunders on purpose and never rushes.',
  9: 'Chaos with a bishop. Expect sacrifices that almost work.',
  12: 'A wall of pawns and patience. Break it or be frozen out.',
  15: 'Full grandmaster strength. Beat Joseph and you are ready to call yourself a grandmaster.',
};

export default function RoadMap() {
  const [lvl, setLvl] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setLvl(getRoadLevel()); }, []);
  useEffect(() => { nowRef.current?.scrollIntoView({ block: 'center' }); }, [lvl]);
  const H = ROAD_MAX * ROW + 80;
  const path = Array.from({ length: ROAD_MAX }, (_, i) => { const p = pos(i + 1); return `${i ? 'L' : 'M'}${p.x},${p.y}`; }).join(' ');
  const shown = sel ?? lvl;
  const boss = BOSS_ROSTER[shown];
  const elo = eloForLevel(shown);
  return <main style={{ minHeight: '100dvh', background: '#0b0a12', color: '#f4eefb', fontFamily: 'system-ui,sans-serif', paddingBottom: 190 }}>
    <header style={{ padding: '14px 14px 6px', textAlign: 'center' }}>
      <Link href="/road" style={{ color: '#ffd84d', fontSize: 12 }}>← Road</Link>
      <h1 style={{ margin: '4px 0', fontSize: 22, letterSpacing: '.08em' }}>ROAD TO JOSEPH</h1>
      <p style={{ margin: 0, fontSize: 13, opacity: .85 }}>Beat Joseph and you are ready to be a grandmaster. Level {lvl} of {ROAD_MAX}.</p>
    </header>
    <div style={{ position: 'relative', width: W, margin: '8px auto 0', height: H }}>
      {[...ZONES].reverse().map((z, zi) => { const top = (ROAD_MAX - Math.min(ROAD_MAX, z.from + 2)) * ROW + 10; return <div key={z.name} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW * 3, background: z.bg, borderRadius: 16, opacity: .9 }}>
        <span style={{ position: 'absolute', left: 10, top: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: .85 }}>{z.name}</span>
        <span style={{ position: 'absolute', left: 10, top: 21, fontSize: 10, opacity: .6 }}>{z.tag}</span></div>; })}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} aria-hidden="true"><path d={path} fill="none" stroke="#fde68a" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" opacity=".8" /></svg>
      {Array.from({ length: ROAD_MAX }, (_, i) => i + 1).map((n) => { const p = pos(n); const b = isBossLevel(n); const size = b ? 54 : 38; const done = n < lvl, now = n === lvl, locked = n > lvl;
        return <div key={n} ref={now ? nowRef : undefined} style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size }}>
          <button aria-label={`Level ${n}${b ? ` boss ${BOSS_ROSTER[n]?.name}` : ''}${now ? ', you are here' : ''}`} onClick={() => setSel(n)} style={{ width: size, height: size, borderRadius: b ? 14 : '50%', border: `3px solid ${now ? '#fff' : b ? '#ffb800' : '#fde68a'}`, background: done ? '#16a34a' : now ? '#ef4444' : b ? '#3a2a10' : '#1f2937', color: '#fff', fontSize: b ? 26 : 15, fontWeight: 800, opacity: locked ? .7 : 1, boxShadow: now ? '0 0 0 4px rgba(255,255,255,.35)' : 'none', cursor: 'pointer', padding: 0 }}>
            {done ? '✓' : b ? BOSS_ICON[n] : n}</button>
          {b && <div style={{ position: 'absolute', top: size + 2, left: -30, width: size + 60, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#ffd84d', textShadow: '0 1px 3px #000' }}>{BOSS_ROSTER[n]?.name}</div>}
          {now && <div style={{ position: 'absolute', top: -22, left: size / 2 - 38, width: 76, textAlign: 'center', fontSize: 10, fontWeight: 800, background: '#fff', color: '#111', borderRadius: 8, padding: '1px 0' }}>♞ YOU ARE HERE</div>}
        </div>; })}
    </div>
    <aside style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(11,10,18,.97)', borderTop: '2px solid #ffb800', display: 'grid', gap: 4 }}>
      <b style={{ fontSize: 14 }}>{boss ? `BOSS: ${boss.name} - ${boss.archetype}` : `Level ${shown}`}{elo ? ` · ~${elo} Elo` : ' · full strength'}</b>
      <span style={{ fontSize: 12, opacity: .85 }}>{boss ? LINES[shown] : shown < lvl ? 'Cleared.' : shown > lvl ? `Locked. Clear level ${lvl} first.` : 'Next up. Win to move on.'}</span>
      {shown === lvl
        ? <Link href="/play-chester?road=1" style={{ marginTop: 4, textAlign: 'center', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '10px 0', borderRadius: 10, textDecoration: 'none' }}>{boss ? 'FIGHT THE BOSS' : 'PLAY LEVEL ' + lvl}</Link>
        : <button onClick={() => setSel(null)} style={{ marginTop: 4, padding: '8px 0', borderRadius: 10, border: '1px solid #555', background: '#111', color: '#fff' }}>Back to my level</button>}
    </aside>
  </main>;
}
