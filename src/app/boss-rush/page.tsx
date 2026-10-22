'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BOSS_ROSTER, eloForLevel } from '@/lib/road';
import { RUSH_LEVELS, getRush, weekKey } from '@/lib/boss-rush';

const ICON: Record<number, string> = { 3: '♟', 6: '♞', 9: '♝', 12: '♛', 15: '♚' };
export default function BossRush() {
  const [r, setR] = useState<{ step: number; done: boolean; trophies: string[]; attempts: number } | null>(null);
  useEffect(() => { setR(getRush()); }, []);
  const step = r?.step ?? 0;
  return <main style={{ minHeight: '100dvh', background: '#0b0a12', color: '#f4eefb', fontFamily: 'system-ui,sans-serif', padding: '78px 16px 40px', textAlign: 'center' }}>
    <Link href="/road/chess" style={{ color: '#ffd84d', fontSize: 12 }}>← Road</Link>
    <h1 style={{ margin: '6px 0 2px', fontSize: 24, letterSpacing: '.08em' }}>WEEKLY BOSS RUSH</h1>
    <p style={{ margin: 0, fontSize: 13, opacity: .85 }}>Beat {RUSH_LEVELS.length} bosses in a row. Lose once and the run resets. New run every week ({weekKey()}).</p>
    <div style={{ margin: '18px auto', maxWidth: 340, display: 'grid', gap: 10 }}>
      {RUSH_LEVELS.map((lv, i) => { const b = BOSS_ROSTER[lv]; const beaten = i < step; const now = i === step && !r?.done; return <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: beaten ? 'linear-gradient(135deg,#14532d,#166534)' : now ? '#3a1420' : '#1a1530', border: now ? '2px solid #ef4444' : '2px solid #2a2347', textAlign: 'left' }}>
        <span style={{ fontSize: 30 }}>{beaten ? '✓' : ICON[lv]}</span>
        <span style={{ flex: 1 }}><b>{b.name}</b><br /><span style={{ fontSize: 12, opacity: .75 }}>{b.archetype} · ~{eloForLevel(lv)} Elo</span></span>
        <span style={{ fontSize: 11, opacity: .8 }}>{beaten ? 'DOWN' : now ? 'NEXT' : `#${i + 1}`}</span></div>; })}
    </div>
    {r?.done && <p style={{ color: '#ffd84d', fontWeight: 800 }}>🏆 Trophy won this week. Run it again for fun.</p>}
    <Link href="/play-chester?road=1&rush=1" style={{ display: 'block', maxWidth: 340, margin: '0 auto', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '12px 0', borderRadius: 12, textDecoration: 'none' }}>{step === 0 ? 'START THE RUSH' : `FIGHT BOSS ${step + 1}`}</Link>
    <p style={{ fontSize: 12, opacity: .7, marginTop: 14 }}>🏆 {r?.trophies.length ?? 0} trophies · {r?.attempts ?? 0} resets this week</p>
  </main>;
}
