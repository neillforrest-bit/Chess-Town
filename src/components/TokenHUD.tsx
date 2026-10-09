'use client';
import { useEffect, useState } from 'react';
import type { State } from '@/lib/game';

/** Rolling integer: the old value slides out, the new one slides in, with a floating delta. Pure CSS animation. */
function Roll({ v }: { v: number }) {
  const [prev, setPrev] = useState(v); const [from, setFrom] = useState<number | null>(null);
  useEffect(() => { if (v !== prev) { setFrom(prev); setPrev(v); const t = setTimeout(() => setFrom(null), 800); return () => clearTimeout(t); } }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className="cs-roll"><i key={v} className={from !== null ? 'cs-roll-in' : ''}>{v}</i>{from !== null && <i className="cs-roll-out">{from}</i>}{from !== null && <u className={'cs-roll-d ' + (v < from ? 'is-neg' : 'is-pos')}>{v > from ? '+' : ''}{v - from}</u>}</span>;
}

/** Persistent sticky War Chest: both players' token banks on every tournament screen. */
export default function TokenHUD({ s, me }: { s: State; me: 'A' | 'B' }) {
  const b = s.b8; if (!b) return null;
  return <div className="cs-hud">{(['A', 'B'] as const).map((p) => <div key={p} className={'cs-hud-p cs-hud-p--' + p + (p === me ? ' is-me' : '')}><small>{p === me ? 'YOU · ' : ''}{s.players[p].name.toUpperCase().slice(0, 9)}</small><b>◈ <Roll v={b.purse[p]} /></b></div>)}</div>;
}
