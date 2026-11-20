'use client';
import { useEffect, useRef, useState } from 'react';
import type { State, PID, Intent } from '@/lib/game';
import { SPIN_MS } from '@/utils/sabotageEngine';
import { OrsonFace, buzz } from './shared';

const ICON: Record<string, string> = { Action: '💥', Adventure: '🧭', Animation: '🎨', Comedy: '😂', Crime: '🕵️', Documentary: '🎙️', Drama: '🎭', Family: '🏡', Fantasy: '🧙', History: '🏛️', Horror: '🔪', Music: '🎵', Mystery: '🔎', Romance: '💘', 'Science Fiction': '🚀', Thriller: '😰', War: '🪖', Western: '🤠' };
const COL = ['#e11d48', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#84cc16', '#0ea5e9'];
const short = (g: string) => (g === 'Science Fiction' ? 'Sci-Fi' : g);

/** Genre Roulette as a game moment: full-screen wheel of fortune. Each player gets one spin and one veto; Orson commentates. State lives in s.sab.wheel so both phones see the same spin. */
export default function WheelOfGenres({ s, pid, send, now }: { s: State; pid: PID; send: (i: Intent) => void; now: number }) {
  const w = s.sab?.wheel; const [rot, setRot] = useState(0); const lastAt = useRef<number>(-1); const lastN = useRef<number>(-1); const [closed, setClosed] = useState('');
  const N = w?.opts.length || 10; const seg = 360 / N;
  useEffect(() => {
    if (!w || w.idx === null || w.n === lastN.current) return; const first = lastN.current === -1 && now > w.at + SPIN_MS; lastN.current = w.n; lastAt.current = w.at;
    const target = -((w.idx + 0.5) * seg); setRot((r) => (first ? target : r + 360 * 5 + ((((target - r) % 360) + 360) % 360)));
    if (!first) buzz([30, 40, 30]);
  }, [w?.n, w?.idx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!w) return null;
  const key = 'w' + w.n + w.final; if (w.stage === 'done' && (closed === key || now > w.at + 5500)) return null;
  const judge: PID = w.turn === 'A' ? 'B' : 'A'; const revealed = w.idx !== null && now >= w.at + SPIN_MS;
  const spinning = w.idx !== null && !revealed && w.stage !== 'done'; const nm = (p: PID) => s.players[p].name;
  const mineTurn = w.stage === 'spin' && w.turn === pid; const iJudge = w.stage === 'judge' && judge === pid && revealed;
  const C = 150, R = 140; const pts = (i: number) => { const a0 = ((i * seg - 90) * Math.PI) / 180, a1 = (((i + 1) * seg - 90) * Math.PI) / 180; return `M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} A${R},${R} 0 0 1 ${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z`; };
  const label = w.stage === 'done' && w.final ? w.final : revealed && w.cand ? w.cand : '';
  return <div className="cs-wheel" role="dialog" aria-label="Genre Roulette">
    <div className="cs-wheel-in">
      <div className="cs-wheel-t">GENRE ROULETTE</div>
      <div className="cs-wheel-rules">{(['A', 'B'] as PID[]).map((p) => <span key={p} className={p === pid ? 'is-me' : ''}><b>{p === pid ? 'YOU' : nm(p).toUpperCase().slice(0, 8)}</b><i className={w.spun[p] ? 'is-used' : ''}>🎡 SPIN</i><i className={w.vetoed[p] ? 'is-used' : ''}>🚫 VETO</i></span>)}</div>
      <div className="cs-wheel-stage">
        <div className="cs-wheel-ptr">▼</div>
        <svg viewBox="0 0 300 300" className="cs-wheel-svg" style={{ transform: `rotate(${rot}deg)`, transition: `transform ${SPIN_MS}ms cubic-bezier(.1,.75,.12,1)` }}>
          <circle cx={C} cy={C} r={R + 6} fill="#1a1020" stroke="#fbbf24" strokeWidth="4" />
          {w.opts.map((g, i) => <g key={g}><path d={pts(i)} fill={COL[i % COL.length]} stroke="#0008" strokeWidth="1.5" />
            <g transform={`rotate(${(i + 0.5) * seg} ${C} ${C})`}><text x={C} y={C - R + 30} textAnchor="middle" fontSize="22">{ICON[g] || '🎬'}</text><text x={C} y={C - R + 48} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{short(g).toUpperCase().slice(0, 9)}</text></g></g>)}
          <circle cx={C} cy={C} r="20" fill="#fbbf24" stroke="#fff" strokeWidth="3" />
        </svg>
      </div>
      <div className="cs-wheel-result">{spinning ? <span className="cs-wheel-spin">...</span> : label ? <><small>{w.stage === 'done' ? 'TONIGHT IS' : 'THE WHEEL SAYS'}</small><b>{ICON[label] || '🎬'} {label}</b></> : <span>&nbsp;</span>}</div>
      <div className="cs-wheel-orson"><div className="cs-wheel-face"><OrsonFace mood="scheme" talking={spinning} /></div><p>{w.line}</p></div>
      <div className="cs-wheel-act">
        {mineTurn && <button className="cs-btn cs-btn--gold cs-wheel-spinbtn" onClick={() => { buzz(20); send({ t: 'wheel', pid, act: 'spin' }); }}>🎡 SPIN THE WHEEL</button>}
        {w.stage === 'spin' && !mineTurn && <em>{nm(w.turn)} is about to spin...</em>}
        {spinning && <em>No touching. The wheel is thinking.</em>}
        {iJudge && <><button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'wheel', pid, act: 'accept' })}>✅ KEEP {short(w.cand as string).toUpperCase()}</button>
          <button className="cs-btn cs-btn--no" disabled={!!w.vetoed[pid]} onClick={() => { buzz([40, 30, 60]); send({ t: 'wheel', pid, act: 'veto' }); }}>{w.vetoed[pid] ? 'VETO USED' : '🚫 VETO IT'}</button></>}
        {w.stage === 'judge' && revealed && !iJudge && <em>{nm(judge)} decides: keep it or veto it...</em>}
        {w.stage === 'done' && <button className="cs-btn cs-btn--gold" onClick={() => setClosed(key)}>LET&apos;S DRAFT</button>}
      </div>
    </div>
  </div>;
}
