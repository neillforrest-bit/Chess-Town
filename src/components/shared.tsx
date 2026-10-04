'use client';
import { useEffect, useState } from 'react';
import { BY_ID, poster, type Movie, type State } from '@/lib/game';

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
  g.fillStyle = '#6f6483'; g.font = '28px sans-serif'; g.fillText('Orson is almost never wrong.', 540, 1260);
  const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'cinesync-night.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'CineSync night' }); return; } catch { /* fall through */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cinesync-night.png'; a.click();
}
