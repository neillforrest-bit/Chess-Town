'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';


export type RoadZone = { from: number; name: string; bg: string; tag: string };
export type RoadBossCfg = { name: string; archetype: string; line: string; icon: string };
export type RoadCfg = { title: string; narrative: string; max: number; storageKey: string; zones: RoadZone[]; bosses: Record<number, RoadBossCfg>; playHref: string; strength: (n: number) => string };
const ROW = 92, W = 340;
export default function RoadMap({ cfg }: { cfg: RoadCfg }) {
  const ROAD_MAX = cfg.max, ZONES = cfg.zones, BOSS_ROSTER = cfg.bosses;
  const isBossLevel = (n: number) => Boolean(BOSS_ROSTER[n]);
  const getRoadLevel = () => { try { const n = parseInt(window.localStorage.getItem(cfg.storageKey) || '1', 10); return Math.min(ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; } };
  const pos = (n: number) => ({ x: 170 + Math.sin((n - 1) * 1.15) * 110, y: (ROAD_MAX - n) * ROW + 70 });
  const [lvl, setLvl] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setLvl(getRoadLevel()); }, []);
  useEffect(() => { nowRef.current?.scrollIntoView({ block: 'center' }); }, [lvl]);
  const H = ROAD_MAX * ROW + 80;
  const path = Array.from({ length: ROAD_MAX }, (_, i) => { const p = pos(i + 1); return `${i ? 'L' : 'M'}${p.x},${p.y}`; }).join(' ');
  const shown = sel ?? lvl;
  const boss = BOSS_ROSTER[shown];
  return <main style={{ minHeight: '100dvh', background: '#0b0a12', color: '#f4eefb', fontFamily: 'system-ui,sans-serif', paddingBottom: 190 }}>
    <header style={{ padding: '14px 14px 6px', textAlign: 'center' }}>
      <Link href="/road" style={{ color: '#ffd84d', fontSize: 12 }}>← Road</Link>
      <h1 style={{ margin: '4px 0', fontSize: 22, letterSpacing: '.08em' }}>{cfg.title}</h1>
      <p style={{ margin: 0, fontSize: 13, opacity: .85 }}>{cfg.narrative} Level {lvl} of {ROAD_MAX}.</p>
    </header>
    <div style={{ position: 'relative', width: W, margin: '8px auto 0', height: H }}>
      {[...ZONES].reverse().map((z) => { const top = (ROAD_MAX - Math.min(ROAD_MAX, z.from + 2)) * ROW + 10; return <div key={z.name} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW * 3, background: z.bg, borderRadius: 16, opacity: .9 }}>
        <span style={{ position: 'absolute', left: 10, top: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: .85 }}>{z.name}</span>
        <span style={{ position: 'absolute', left: 10, top: 21, fontSize: 10, opacity: .6 }}>{z.tag}</span></div>; })}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} aria-hidden="true"><path d={path} fill="none" stroke="#fde68a" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" opacity=".8" /></svg>
      {Array.from({ length: ROAD_MAX }, (_, i) => i + 1).map((n) => { const p = pos(n); const b = isBossLevel(n); const size = b ? 54 : 38; const done = n < lvl, now = n === lvl, locked = n > lvl;
        return <div key={n} ref={now ? nowRef : undefined} style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size }}>
          <button aria-label={`Level ${n}${b ? ` boss ${BOSS_ROSTER[n]?.name}` : ''}${now ? ', you are here' : ''}`} onClick={() => setSel(n)} style={{ width: size, height: size, borderRadius: b ? 14 : '50%', border: `3px solid ${now ? '#fff' : b ? '#ffb800' : '#fde68a'}`, background: done ? '#16a34a' : now ? '#ef4444' : b ? '#3a2a10' : '#1f2937', color: '#fff', fontSize: b ? 26 : 15, fontWeight: 800, opacity: locked ? .7 : 1, boxShadow: now ? '0 0 0 4px rgba(255,255,255,.35)' : 'none', cursor: 'pointer', padding: 0 }}>
            {done ? '✓' : b ? BOSS_ROSTER[n].icon : n}</button>
          {b && <div style={{ position: 'absolute', top: size + 2, left: -30, width: size + 60, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#ffd84d', textShadow: '0 1px 3px #000' }}>{BOSS_ROSTER[n]?.name}</div>}
          {now && <div style={{ position: 'absolute', top: size / 2 - 10, ...(p.x > 170 ? { right: size + 6 } : { left: size + 6 }), width: 76, textAlign: 'center', fontSize: 10, fontWeight: 800, background: '#fff', color: '#111', borderRadius: 8, padding: '1px 0' }}>♞ YOU ARE HERE</div>}
        </div>; })}
    </div>
    <aside style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(11,10,18,.97)', borderTop: '2px solid #ffb800', display: 'grid', gap: 4 }}>
      <b style={{ fontSize: 14 }}>{boss ? `BOSS: ${boss.name} - ${boss.archetype}` : `Level ${shown}`}{` · ${cfg.strength(shown)}`}</b>
      <span style={{ fontSize: 12, opacity: .85 }}>{boss ? boss.line : shown < lvl ? 'Cleared.' : shown > lvl ? `Locked. Clear level ${lvl} first.` : 'Next up. Win to move on.'}</span>
      {shown === lvl
        ? <Link href={cfg.playHref} style={{ marginTop: 4, textAlign: 'center', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '10px 0', borderRadius: 10, textDecoration: 'none' }}>{boss ? 'FIGHT THE BOSS' : 'PLAY LEVEL ' + lvl}</Link>
        : <button onClick={() => setSel(null)} style={{ marginTop: 4, padding: '8px 0', borderRadius: 10, border: '1px solid #555', background: '#111', color: '#fff' }}>Back to my level</button>}
    </aside>
  </main>;
}
