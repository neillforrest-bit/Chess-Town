'use client';
import { useEffect, useState } from 'react';
import { BY_ID, poster, type Movie } from '@/lib/game';

export function useNow(skew: number) {
  const [n, setN] = useState(() => Date.now() + skew);
  useEffect(() => { const t = setInterval(() => setN(Date.now() + skew), 200); return () => clearInterval(t); }, [skew]);
  return n;
}
export const secs = (until: number, now: number) => Math.max(0, Math.ceil((until - now) / 1000));
export function Poster({ id, cls = '', big = false }: { id: number; cls?: string; big?: boolean }) {
  const m: Movie = BY_ID[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={'cs-poster ' + cls} src={poster(m, big ? 'w500' : 'w342')} alt={m.t} loading="eager" />;
}
export function Meter({ cost }: { cost: { calls: number; inTok: number; outTok: number; usd: number } }) {
  return <div className="cs-meter" title="Orson's running AI cost this room">ORSON METER · {cost.calls} calls · {cost.inTok + cost.outTok} tok · ${cost.usd.toFixed(4)}</div>;
}
export const BUILD = (process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').slice(0, 7);
