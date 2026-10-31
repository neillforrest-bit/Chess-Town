'use client';
// Chess onboarding: "How well do you know chess?" -> tailored Chester opening
// and difficulty, then the chess mode menu. Skill is remembered on the device.
import { useEffect, useState } from 'react';
import Link from 'next/link';

export type ChessSkill = 'never' | 'bit' | 'hard' | 'decent' | 'good';

const OPTIONS: { key: ChessSkill; label: string; chester: string }[] = [
  { key: 'never', label: "I've never played", chester: "Perfect - a clean slate! We'll start gentle. Tap a piece and I'll show you where it can go. I'll coach every move." },
  { key: 'bit', label: "I've played a bit", chester: "A bit of experience goes a long way. I'll coach your moves and keep the pressure friendly." },
  { key: 'hard', label: "It's too hard for me", chester: "Not tonight it isn't. I'll grade your moves, explain the why, and never punish a brave try." },
  { key: 'decent', label: "I'm decent", chester: "Decent, eh? I'll play fair but honest - expect a real game with light coaching." },
  { key: 'good', label: "I'm good", chester: "Good? Excellent. No mercy from me, and I'll still grade your technique. Bring your best." },
];

const SKILL_PARAM: Record<ChessSkill, string> = { never: 'never', bit: 'bit', hard: 'hard', decent: 'decent', good: 'good' };

const CSS: any = {
  page: { minHeight: '100dvh', background: 'linear-gradient(180deg,#120b2e,#1d1145)', color: '#fff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '24px 18px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  h1: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 34, color: '#ffd93b', textShadow: '0 3px 0 rgba(0,0,0,0.4)', textAlign: 'center', margin: '12px 0 4px' },
  card: { width: '100%', maxWidth: 440, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, padding: '16px 16px', marginTop: 14, boxSizing: 'border-box' },
  opt: { display: 'block', width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '15px 16px', marginTop: 10, color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: "'Nunito', system-ui, sans-serif", cursor: 'pointer', boxSizing: 'border-box' },
  modeBtn: { display: 'block', width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 14, padding: '13px 15px', marginTop: 10, color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none', boxSizing: 'border-box' },
  chester: { display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', maxWidth: 440, marginTop: 14, background: 'rgba(255,217,59,0.10)', border: '1px solid rgba(255,217,59,0.35)', borderRadius: 16, padding: '12px 14px', fontSize: 15, lineHeight: 1.45, boxSizing: 'border-box' },
};

export default function ChessOnboarding() {
  const [skill, setSkill] = useState<ChessSkill | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem('ct-chess-skill') as ChessSkill | null;
    if (saved && SKILL_PARAM[saved]) setSkill(saved);
    setLoaded(true);
  }, []);
  const pick = (k: ChessSkill) => { window.localStorage.setItem('ct-chess-skill', k); setSkill(k); };
  const opt = OPTIONS.find((o) => o.key === skill);

  return (
    <main style={CSS.page}>
      <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 14, letterSpacing: 3, opacity: 0.7, marginTop: 6 }}>GAMES FOR ALL</div>
      <h1 style={CSS.h1}>CHESS</h1>
      {!loaded ? null : !skill ? (
        <div style={CSS.card}>
          <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 22, color: '#ffd93b' }}>How well do you know chess?</div>
          {OPTIONS.map((o) => (
            <button key={o.key} style={CSS.opt} onClick={() => pick(o.key)}>{o.label}</button>
          ))}
        </div>
      ) : (
        <>
          <div style={CSS.chester}><span style={{ fontSize: 26, lineHeight: 1 }}>♞</span><div><b>Chester:</b> {opt?.chester}</div></div>
          <div style={CSS.card}>
            <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 20, color: '#ffd93b' }}>Choose your game</div>
            <Link href={`/play-chester?skill=${SKILL_PARAM[skill]}`} style={CSS.modeBtn}>Play Chester<span style={{ display: 'block', fontSize: 13, fontWeight: 600, opacity: 0.75 }}>Full game, coached to your level</span></Link>
            <Link href="/arena" style={CSS.modeBtn}>The Arena<span style={{ display: 'block', fontSize: 13, fontWeight: 600, opacity: 0.75 }}>Challenge a friend on two devices, mini games, daily challenges and the full town</span></Link>
          </div>
          <button style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }} onClick={() => { window.localStorage.removeItem('ct-chess-skill'); setSkill(null); }}>Change my level</button>
        </>
      )}
      <div style={{ marginTop: 22, fontSize: 13, opacity: 0.6 }}><Link href="/" style={{ color: '#fff' }}>Back to all games</Link></div>
    </main>
  );
}
