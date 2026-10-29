'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getChessdleState, chessdleDay } from '@/lib/chessdle';
import { getPlayStreak } from '@/lib/streak';
import { getRush, RUSH_LEVELS } from '@/lib/boss-rush';


export type RoadZone = { from: number; name: string; bg: string; tag: string };
export type RoadBossCfg = { name: string; archetype: string; line: string; icon: string };
export type RoadCfg = { title: string; narrative: string; max: number; storageKey: string; zones: RoadZone[]; bosses: Record<number, RoadBossCfg>; playHref: string; dailyHref?: string; strength: (n: number) => string };
const ROW = 92, W = 340;
export default function RoadMap({ cfg }: { cfg: RoadCfg }) {
  const ROAD_MAX = cfg.max, ZONES = cfg.zones, BOSS_ROSTER = cfg.bosses;
  const isBossLevel = (n: number) => Boolean(BOSS_ROSTER[n]);
  const getRoadLevel = () => { try { const n = parseInt(window.localStorage.getItem(cfg.storageKey) || '1', 10); return Math.min(ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; } };
  const pos = (n: number) => ({ x: 170 + Math.sin((n - 1) * 1.15) * 110, y: (ROAD_MAX - n) * ROW + 70 });
  const [lvl, setLvl] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const [daily, setDaily] = useState<{ streak: number; done: boolean } | null>(null);
  const [rush, setRush] = useState<{ step: number; done: boolean } | null>(null);
  const [flame, setFlame] = useState<{ streak: number; playedToday: boolean }>({ streak: 0, playedToday: false });
  const [up, setUp] = useState<{ lvl: number; boss: RoadBossCfg | null } | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = getRoadLevel(); setLvl(n); try { setFlame(getPlayStreak()); } catch { /* */ }
    if (cfg.dailyHref) { try { const st = getChessdleState(chessdleDay()); setDaily({ streak: st.streak, done: !!st.result }); const r = getRush(); setRush({ step: r.step, done: r.done }); } catch { /* ignore */ } }
    try {
      const k = `${cfg.storageKey}-seen`; const raw = window.localStorage.getItem(k); const seen = raw === null ? n : parseInt(raw, 10) || n;
      if (n > seen) { const beaten = Object.keys(BOSS_ROSTER).map(Number).filter((b) => b >= seen && b < n).pop(); setUp({ lvl: n, boss: beaten ? BOSS_ROSTER[beaten] : null }); }
      window.localStorage.setItem(k, String(n));
    } catch { /* storage blocked: skip the celebration */ }
  }, []);
  useEffect(() => { nowRef.current?.scrollIntoView({ block: 'center' }); }, [lvl]);
  const H = ROAD_MAX * ROW + 80;
  const path = Array.from({ length: ROAD_MAX }, (_, i) => { const p = pos(i + 1); return `${i ? 'L' : 'M'}${p.x},${p.y}`; }).join(' ');
  const shown = sel ?? lvl;
  const bossLevels = Object.keys(BOSS_ROSTER).map(Number).sort((a, b) => a - b);
  const nextBossLvl = bossLevels.find((b) => b >= lvl) ?? null;
  const prevBossLvl = [...bossLevels].reverse().find((b) => b < lvl) ?? 0;
  const toBoss = nextBossLvl === null ? 0 : nextBossLvl - lvl;
  const segPct = nextBossLvl === null ? 100 : Math.round(((lvl - 1 - prevBossLvl) / Math.max(1, nextBossLvl - prevBossLvl)) * 100);
  const overallPct = Math.round(((lvl - 1) / ROAD_MAX) * 100);
  const boss = BOSS_ROSTER[shown];
  return <main style={{ minHeight: '100dvh', background: '#0b0a12', color: '#f4eefb', fontFamily: 'system-ui,sans-serif', paddingBottom: 190 }}>

    <div aria-label="Progress summary" style={{ position: 'sticky', top: 64, zIndex: 20, margin: '0 10px', padding: '6px 10px', borderRadius: 12, background: 'rgba(18,15,34,.96)', border: '1px solid #3b2f66', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <b style={{ whiteSpace: 'nowrap' }}>Lv {lvl}/{ROAD_MAX}</b>{flame.streak > 0 && <span title="Play streak" style={{ whiteSpace: 'nowrap', opacity: flame.playedToday ? 1 : .6 }}>🔥{flame.streak}</span>}
      <span style={{ flex: 1, height: 6, borderRadius: 6, background: '#2a2347', overflow: 'hidden' }}><span style={{ display: 'block', width: `${overallPct}%`, height: '100%', background: 'linear-gradient(90deg,#34d399,#ffd84d)' }} /></span>
      <span style={{ whiteSpace: 'nowrap', color: '#ffd84d', fontWeight: 700 }}>{nextBossLvl === null ? 'Road complete' : `${BOSS_ROSTER[nextBossLvl].icon} ${toBoss === 0 ? 'boss next' : `${toBoss} to boss`}`}</span>
    </div>
    <header style={{ padding: '14px 14px 6px', textAlign: 'center' }}>
      <Link href="/road" style={{ color: '#ffd84d', fontSize: 12 }}>← Road</Link>
      <h1 style={{ margin: '4px 0', fontSize: 22, letterSpacing: '.08em' }}>{cfg.title}</h1>
      <p style={{ margin: 0, fontSize: 13, opacity: .85 }}>{cfg.narrative} Level {lvl} of {ROAD_MAX}.</p>
    </header>
    <section aria-label="Road progress" style={{ margin: '4px 14px 0', padding: '10px 12px', borderRadius: 14, background: 'linear-gradient(180deg,#1a1530,#120f22)', border: '1px solid #3b2f66' }}>
      <style>{`.ct-boss-now{animation:ctPulse 1.6s infinite}@keyframes ctPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,216,77,.55)}50%{box-shadow:0 0 0 9px rgba(255,216,77,0)}}@keyframes ctPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12 }}>
        <b style={{ fontSize: 15 }}>Level {lvl}<span style={{ opacity: .6, fontWeight: 400 }}> / {ROAD_MAX}</span></b>
        <span style={{ opacity: .8 }}>{flame.streak > 0 ? `🔥 ${flame.streak} day streak${flame.playedToday ? '' : ' - play today to keep it'} · ` : ''}{overallPct}% of the road</span>
      </div>
      <div style={{ marginTop: 6, height: 8, borderRadius: 6, background: '#2a2347', overflow: 'hidden' }}><div style={{ width: `${overallPct}%`, height: '100%', background: 'linear-gradient(90deg,#34d399,#ffd84d)' }} /></div>
      {nextBossLvl !== null ? <div style={{ marginTop: 8, fontSize: 12 }}>
        <b style={{ color: '#ffd84d' }}>{BOSS_ROSTER[nextBossLvl].icon} {BOSS_ROSTER[nextBossLvl].name}</b>{toBoss === 0 ? ' is next. Time to fight.' : ` in ${toBoss} level${toBoss === 1 ? '' : 's'}`}
        <div style={{ marginTop: 4, height: 6, borderRadius: 6, background: '#2a2347', overflow: 'hidden' }}><div style={{ width: `${segPct}%`, height: '100%', background: '#ef4444' }} /></div>
      </div> : <div style={{ marginTop: 8, fontSize: 12, color: '#ffd84d' }}>Every boss is down. Road complete.</div>}
      {cfg.dailyHref && daily && <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <Link href={cfg.dailyHref} style={{ flex: 1, textDecoration: 'none', color: '#f4eefb', background: '#241d3d', borderRadius: 10, padding: '8px 10px', fontSize: 12 }}>🟩 <b>Daily Chessdle</b><br /><span style={{ opacity: .8 }}>{daily.done ? `Done today · ${daily.streak} day streak` : `Not played yet · ${daily.streak} day streak`}</span></Link>
        <Link href="/boss-rush" style={{ flex: 1, textDecoration: 'none', color: '#f4eefb', background: '#3a1420', borderRadius: 10, padding: '8px 10px', fontSize: 12 }}>⚔️ <b>Weekly Boss Rush</b><br /><span style={{ opacity: .8 }}>{rush?.done ? 'Trophy won this week' : `${rush?.step ?? 0} of ${RUSH_LEVELS.length} bosses down`}</span></Link>
      </div>}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }} aria-label="Boss badges">
        {bossLevels.map((b) => { const beaten = b < lvl; return <span key={b} title={BOSS_ROSTER[b].name} style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 18, background: beaten ? 'linear-gradient(135deg,#ffd84d,#f59e0b)' : '#241d3d', color: beaten ? '#2b1b00' : '#6b6288', border: b === nextBossLvl ? '2px solid #ef4444' : '2px solid transparent', filter: beaten ? 'none' : 'grayscale(1)' }}>{BOSS_ROSTER[b].icon}</span>; })}
      </div>
    </section>
    <div style={{ position: 'relative', width: W, margin: '8px auto 0', height: H }}>
      {[...ZONES].reverse().map((z) => { const top = (ROAD_MAX - Math.min(ROAD_MAX, z.from + 2)) * ROW + 10; return <div key={z.name} style={{ position: 'absolute', left: 0, right: 0, top, height: ROW * 3, background: z.bg, borderRadius: 16, opacity: .9 }}>
        <span style={{ position: 'absolute', left: 10, top: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: .85 }}>{z.name}</span>
        <span style={{ position: 'absolute', left: 10, top: 21, fontSize: 10, opacity: .6 }}>{z.tag}</span></div>; })}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} aria-hidden="true"><path d={path} fill="none" stroke="#fde68a" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" opacity=".8" /></svg>
      {Array.from({ length: ROAD_MAX }, (_, i) => i + 1).map((n) => { const p = pos(n); const b = isBossLevel(n); const size = b ? 64 : 38; const done = n < lvl, now = n === lvl, locked = n > lvl;
        return <div key={n} ref={now ? nowRef : undefined} style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size }}>
          <button className={b && n === nextBossLvl ? 'ct-boss-now' : undefined} aria-label={`Level ${n}${b ? ` boss ${BOSS_ROSTER[n]?.name}` : ''}${now ? ', you are here' : ''}`} onClick={() => setSel(n)} style={{ width: size, height: size, borderRadius: b ? 14 : '50%', border: `3px solid ${now ? '#fff' : b ? '#ffb800' : '#fde68a'}`, background: done ? '#16a34a' : now ? '#ef4444' : b ? '#3a2a10' : '#1f2937', color: '#fff', fontSize: b ? 26 : 15, fontWeight: 800, opacity: locked ? .7 : 1, boxShadow: now ? '0 0 0 4px rgba(255,255,255,.35)' : 'none', cursor: 'pointer', padding: 0 }}>
            {done ? '✓' : b ? BOSS_ROSTER[n].icon : n}</button>
          {b && <div style={{ position: 'absolute', top: size + 2, left: -30, width: size + 60, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#ffd84d', textShadow: '0 1px 3px #000' }}>{BOSS_ROSTER[n]?.name}</div>}
          {now && <div style={{ position: 'absolute', top: size / 2 - 10, ...(p.x > 170 ? { right: size + 6 } : { left: size + 6 }), width: 76, textAlign: 'center', fontSize: 10, fontWeight: 800, background: '#fff', color: '#111', borderRadius: 8, padding: '1px 0' }}>♞ YOU ARE HERE</div>}
        </div>; })}
    </div>

    {up && <div role="dialog" aria-label="Level up" onClick={() => setUp(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(8,6,16,.88)', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ animation: 'ctPop .5s ease-out both', maxWidth: 300 }}>
        <div style={{ fontSize: 56 }}>{up.boss ? up.boss.icon : '⭐'}</div>
        <h2 style={{ margin: '8px 0 4px', fontSize: 26, color: '#ffd84d', letterSpacing: '.06em' }}>{up.boss ? 'BOSS DEFEATED' : 'LEVEL UP'}</h2>
        <p style={{ margin: 0, fontSize: 15 }}>{up.boss ? `${up.boss.name} is down. You are on level ${up.lvl}.` : `You reached level ${up.lvl} of ${ROAD_MAX}.`}</p>
        <p style={{ margin: '10px 0 0', fontSize: 12, opacity: .7 }}>Tap to carry on</p>
      </div></div>}
    <aside style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'rgba(11,10,18,.97)', borderTop: '2px solid #ffb800', display: 'grid', gap: 4 }}>
      <b style={{ fontSize: 14 }}>{boss ? `BOSS: ${boss.name} - ${boss.archetype}` : `Level ${shown}`}{` · ${cfg.strength(shown)}`}</b>
      <span style={{ fontSize: 12, opacity: .85 }}>{boss ? boss.line : shown < lvl ? 'Cleared.' : shown > lvl ? `Locked. Clear level ${lvl} first.` : 'Next up. Win to move on.'}</span>
      {shown === lvl
        ? <Link href={cfg.playHref} style={{ marginTop: 4, textAlign: 'center', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '10px 0', borderRadius: 10, textDecoration: 'none' }}>{boss ? 'FIGHT THE BOSS' : 'PLAY LEVEL ' + lvl}</Link>
        : <button onClick={() => setSel(null)} style={{ marginTop: 4, padding: '8px 0', borderRadius: 10, border: '1px solid #555', background: '#111', color: '#fff' }}>Back to my level</button>}
    </aside>
  </main>;
}
