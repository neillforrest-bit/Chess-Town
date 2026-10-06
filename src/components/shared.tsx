'use client';
import { useEffect, useState } from 'react';
import { BY_ID, poster, heatLabel, type Mood, type Movie, type State } from '@/lib/game';

export function useNow(skew: number) {
  const [n, setN] = useState(() => Date.now() + skew);
  useEffect(() => { const t = setInterval(() => setN(Date.now() + skew), 200); return () => clearInterval(t); }, [skew]);
  return n;
}
export const secs = (until: number, now: number) => Math.max(0, Math.ceil((until - now) / 1000));
export const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
export function Poster({ id, cls = '', big = false }: { id: number; cls?: string; big?: boolean }) {
  const m: Movie = BY_ID[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={'cs-poster ' + cls} src={poster(m, big ? 'w500' : 'w342')} alt={m.t} loading="eager" draggable={false} />;
}
export function Meter({ cost }: { cost: { calls: number; inTok: number; outTok: number; usd: number } }) {
  return <div className="cs-meter" title="Orson's running AI cost this room">ORSON METER · {cost.calls} calls · {cost.inTok + cost.outTok} tok · ${cost.usd.toFixed(4)}</div>;
}
export function Typing({ text }: { text: string }) { return <p className="cs-typing">{text}<span className="cs-dots"><i /><i /><i /></span></p>; }
export function Confetti() {
  return <div className="cs-confetti" aria-hidden>{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.12}s`, background: ['#ffcf40', '#f2a900', '#fff1c2', '#c2371a'][i % 4] }} />)}</div>;
}
export const BUILD = (process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').slice(0, 7);

export function ledgerLine(s: State): string | null {
  const a = s.players.A.name, b = s.players.B.name, la = s.mem.ledger.A, lb = s.mem.ledger.B;
  if (la + lb === 0) return null;
  if (la === lb) return `${a} and ${b} are level at ${la}-${lb}.`;
  return la > lb ? `${b} trails ${lb}-${la}.` : `${a} trails ${la}-${lb}.`;
}
export function receipts(s: State) {
  const A = s.draft.picks.A, B = s.draft.picks.B;
  const overlap = A.filter((x) => B.includes(x)).length;
  return { overlap, wildWins: s.stats.wildWins, wildBouts: s.stats.wildBouts, cavedA: s.stats.caved.A, cavedB: s.stats.caved.B };
}

/** Shareable receipts image (canvas -> share sheet or download). */
export async function shareReceipts(s: State) {
  const w = s.winner !== null ? BY_ID[s.winner] : null; if (!w) return;
  const r = receipts(s); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const bg = g.createRadialGradient(540, 0, 100, 540, 400, 1400); bg.addColorStop(0, '#2a1233'); bg.addColorStop(1, '#0b0a10');
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  g.textAlign = 'center'; g.fillStyle = '#ffcf40'; g.font = '700 54px Georgia, serif'; g.fillText('CINESYNC', 540, 110);
  g.fillStyle = '#c9bfd6'; g.font = '34px sans-serif'; g.fillText(`${s.players.A.name} & ${s.players.B.name} · tonight we watch`, 540, 165);
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = poster(w, 'w500');
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; setTimeout(no, 4000); });
    g.save(); g.shadowColor = '#ffcf4099'; g.shadowBlur = 60; g.drawImage(img, 340, 210, 400, 600); g.restore();
  } catch { /* poster optional */ }
  g.fillStyle = '#f4efe6'; g.font = '700 64px Georgia, serif'; g.fillText(w.t.slice(0, 28), 540, 905);
  g.fillStyle = '#c9bfd6'; g.font = '34px sans-serif'; g.fillText(`${w.y} · ${w.r.toFixed(1)}/10`, 540, 955);
  const ll = ledgerLine(s); if (ll) { g.fillStyle = '#ffcf40'; g.font = 'italic 40px Georgia, serif'; g.fillText(ll, 540, 1030); }
  g.fillStyle = '#f4efe6'; g.font = '36px sans-serif';
  g.fillText(`Drafts overlapped on ${r.overlap}/10 · Wildcards won ${r.wildWins}/${r.wildBouts}`, 540, 1110);
  g.fillText(`Caved: ${s.players.A.name} ${r.cavedA} · ${s.players.B.name} ${r.cavedB}`, 540, 1165);
  const up = s.b8?.upsets ? [...s.b8.upsets].sort((x, y) => y.gap - x.gap)[0] : null;
  g.fillStyle = '#c9bfd6'; g.font = '30px sans-serif';
  if (up && BY_ID[up.winner] && BY_ID[up.loser]) g.fillText(`Biggest upset: ${BY_ID[up.winner].t.slice(0, 20)} over ${BY_ID[up.loser].t.slice(0, 20)}`.slice(0, 60), 540, 1210);
  if (s.taste) { g.font = 'italic 28px Georgia, serif'; g.fillText(s.taste.slice(0, 70), 540, 1245); }
  g.fillStyle = '#6f6483'; g.font = '28px sans-serif'; g.fillText('Orson is almost never wrong.', 540, 1305);
  const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'cinesync-night.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'CineSync night' }); return; } catch { /* fall through */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cinesync-night.png'; a.click();
}

export function Heat({ h, big = false }: { h: number; big?: boolean }) {
  return <div className={'cs-heat' + (big ? ' cs-heat--big' : '')} title="Sync heat"><div className="cs-heat-track"><i style={{ width: `${Math.max(4, h)}%` }} /></div><b>{heatLabel(h)}</b></div>;
}
export function Scores({ m }: { m: Movie }) {
  const tone = (v: number | null | undefined, hi: number, lo: number) => (v == null ? 'na' : v >= hi ? 'hi' : v >= lo ? 'mid' : 'lo');
  const cells: [string, string, string][] = [
    ['ROTTEN TOM.', m.rt != null ? `${m.rt}%` : '–', tone(m.rt, 75, 50)],
    ['METACRITIC', m.mc != null ? `${m.mc}` : '–', tone(m.mc, 65, 45)],
    ['IMDB', m.imdb != null ? m.imdb.toFixed(1) : '–', tone(m.imdb, 7.2, 6)],
    ['TMDB', m.r.toFixed(1), tone(m.r, 7.2, 6)],
  ];
  const shown = m.sr ? [...cells.slice(3), ['SEASONS', String(m.sr.s), 'mid'] as [string, string, string], ['EPISODES', String(m.sr.e), 'mid'] as [string, string, string], [m.sr.st === 'Ended' || m.sr.st === 'Canceled' ? 'FINISHED' : 'RUNNING', m.sr.last ? String(m.sr.last) : '', 'mid'] as [string, string, string]] : cells;
  return <div className="cs-scores">{shown.map(([l, v, c]) => <div key={l} className={'cs-score-tile ' + c}><b>{v}</b><span>{l}</span></div>)}</div>;
}

export function OrsonFace({ mood, talking }: { mood: Mood; talking: boolean }) {
  const brow: Record<Mood, [string, string]> = { idle: ['M31 36 Q38 33 45 36', 'M55 34 Q62 31 69 34'], smug: ['M31 37 Q38 35 45 38', 'M55 31 Q62 28 69 32'], shock: ['M31 32 Q38 27 45 32', 'M55 30 Q62 25 69 30'], glee: ['M31 34 Q38 30 45 34', 'M55 34 Q62 30 69 34'], scheme: ['M31 33 L45 38', 'M55 38 L69 33'], sad: ['M31 38 Q38 34 45 33', 'M55 33 Q62 34 69 38'] };
  const mouthOpen = talking || mood === 'shock' || mood === 'glee';
  return (
    <svg className={'cs-oface is-' + mood + (talking ? ' is-talking' : '')} viewBox="0 0 100 100" aria-label="Orson">
      <ellipse cx="50" cy="97" rx="30" ry="12" fill="#161222" />
      <path d="M38 84 L50 92 L62 84 L58 96 L42 96 Z" fill="#c2371a" /><circle cx="50" cy="88" r="3.2" fill="#8d2410" />
      <ellipse cx="50" cy="50" rx="25" ry="29" fill="#f0c9a0" /><ellipse cx="25" cy="52" rx="3.5" ry="6" fill="#e3b88c" /><ellipse cx="75" cy="52" rx="3.5" ry="6" fill="#e3b88c" />
      <path d="M24 42 Q22 14 50 14 Q78 14 76 42 Q70 26 50 26 Q30 26 24 42Z" fill="#1a1420" />
      <path d={brow[mood][0]} stroke="#1a1420" strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d={brow[mood][1]} stroke="#1a1420" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <g className="cs-eyes"><ellipse cx="38" cy="45" rx="4.2" ry={mood === 'glee' ? 2 : 4.4} fill="#fff" /><ellipse cx="62" cy="45" rx="4.2" ry={mood === 'glee' ? 2 : 4.4} fill="#fff" /><circle cx={mood === 'scheme' ? 40 : 38} cy="45.5" r="2" fill="#1a1420" /><circle cx={mood === 'scheme' ? 64 : 62} cy="45.5" r="2" fill="#1a1420" /></g>
      <circle cx="62" cy="45" r="8.2" fill="none" stroke="#ffcf40" strokeWidth="1.6" /><path d="M68 51 Q76 66 70 80" stroke="#ffcf40" strokeWidth="1" fill="none" />
      <path d="M50 46 L47 56 Q50 58 53 56" stroke="#d9a67a" strokeWidth="1.6" fill="none" />
      <path d="M28 62 Q38 56 50 62 Q62 56 72 62 Q64 72 50 66 Q36 72 28 62Z" fill="#1a1420" />
      {mouthOpen ? <ellipse className="cs-mouth" cx="50" cy="73" rx="5.5" ry="4.2" fill="#5a1a1a" /> : mood === 'sad' ? <path d="M43 74 Q50 70 57 74" stroke="#5a1a1a" strokeWidth="2" fill="none" /> : <path d="M43 72 Q50 77 57 72" stroke="#5a1a1a" strokeWidth="2" fill="none" />}
    </svg>
  );
}
const MOOD_EMO: Record<Mood, string> = { idle: '🎩', smug: '😏', shock: '😱', glee: '🤩', scheme: '😈', sad: '🥲' };
export function OrsonBar({ o, tv = false }: { o: { line: string; mood: Mood; n: number; emo?: string }; tv?: boolean }) {
  const [shown, setShown] = useState(o.line.length);
  useEffect(() => { setShown(0); const t = setInterval(() => setShown((x) => { if (x >= o.line.length) { clearInterval(t); return x; } return x + 2; }), 28); return () => clearInterval(t); }, [o.n, o.line]);
  const talking = shown < o.line.length;
  return (
    <div className={'cs-obar' + (tv ? ' cs-obar--tv' : '')} key={o.n}>
      <div className="cs-oavatar"><OrsonFace mood={o.mood} talking={talking} /><span className="cs-oemo" key={o.n}>{o.emo || MOOD_EMO[o.mood]}</span></div>
      <p className="cs-obubble">{o.line.slice(0, shown)}<span className="cs-caret" /></p>
    </div>
  );
}

// Orson takeover: full-screen theatre. Shows on the judging screen (waiting) and plays the scripted lines once the verdict lands.
export function Takeover({ a, b, lines, winner, onDone }: { a: number; b: number; lines?: string[]; winner?: number; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const script = lines && lines.length ? lines : [];
  useEffect(() => {
    if (winner === undefined) return;
    const total = script.length + 1;
    if (step >= total) { const t = setTimeout(() => onDone && onDone(), 1800); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((x) => x + 1), step === script.length ? 1700 : 2300);
    return () => clearTimeout(t);
  }, [step, winner]); // eslint-disable-line react-hooks/exhaustive-deps
  const slam = winner !== undefined && step >= script.length;
  return <div className="cs-takeover">
    <div className="cs-tk-tag">ORSON HAS TAKEN OVER THE SCREEN</div>
    <div className="cs-tk-vs">{[a, b].map((id) => <div key={id} className={'cs-tk-film' + (slam && winner !== id ? ' is-out' : '') + (slam && winner === id ? ' is-in' : '')}><Poster id={id} /><b>{BY_ID[id].t}</b></div>)}</div>
    <p className="cs-tk-line" key={step}>{winner === undefined ? 'Both of you chose. Now I decide. Nobody breathe.' : slam ? 'THE DECISION IS MADE.' : script[Math.min(step, script.length - 1)]}</p>
  </div>;
}
