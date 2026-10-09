'use client';
import { useEffect, useRef, useState } from 'react';
import type { State } from '@/lib/game';

/** v2.2 War Chest post-mortem: when a token bout newly resolves, Orson's verdict on the wager math shows for 5 seconds. */
export default function PostMortem({ s }: { s: State }) {
  const seen = useRef<Set<string> | null>(null); const [id, setId] = useState<string | null>(null);
  const resolved = (s.b8?.matches || []).filter((m) => m.status === 'RESOLVED' && m.round > 1 && m.winner !== null);
  const fresh = seen.current ? resolved.find((m) => !seen.current!.has(m.id)) : undefined;
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(resolved.map((m) => m.id)); return; }
    if (fresh) { seen.current.add(fresh.id); setId(fresh.id); const t = setTimeout(() => setId(null), 5000); return () => clearTimeout(t); }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const m = id ? s.b8?.matches.find((x) => x.id === id) : null; if (!m) return null;
  const a = m.wg.A?.tok || 0, b = m.wg.B?.tok || 0; const w = m.winner === m.wg.A?.id ? s.players.A.name : s.players.B.name;
  const line = m.mortem || `${s.players.A.name} spent ${a}, ${s.players.B.name} spent ${b}. ${w} takes it. ${a + b === 0 ? 'Pure apathy.' : Math.max(a, b) > 25 ? 'Desperation was noted.' : 'Restraint, how dull.'}`;
  return <div className="cs-toast"><b>POST-MORTEM</b><span>{line}</span></div>;
}
