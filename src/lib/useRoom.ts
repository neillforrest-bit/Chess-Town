'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supa';
import { loadMem, recordNight, coupleKey, nightsKey } from '@/lib/memory';
import { BY_ID, registerExtra, type Intent, type PID, type State } from '@/lib/game';

/** Server-authoritative: the room lives in ONE Supabase row. Every client (phones and TV) POSTs intents to the API and renders the row via Realtime. */
export function useRoom(code: string, pid: PID | null, name: string, kind: 'movie' | 'series' = 'movie') {
  const host = pid === 'A'; // only used to pick who writes Orson's cross-night memory
  const [state, setState] = useState<State | null>(null);
  const [skew, setSkew] = useState(0);
  const [online, setOnline] = useState(false);
  const stRef = useRef<State | null>(null);
  const busy = useRef({ mem: false, rec: false });
  const url = `/api/room/${code}`;

  const take = useCallback((s: State) => {
    if (!s || (stRef.current && s.v < stRef.current.v)) return;
    registerExtra(s.extra); setSkew(s.now - Date.now()); stRef.current = s; setState(s); setOnline(true);
  }, []);

  const send = useCallback((it: Intent) => {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ it }) }).then((r) => r.json()).then((s) => { if (s && s.code) take(s as State); }).catch(() => {});
  }, [url, take]);
  const apply = send;

  useEffect(() => {
    let dead = false;
    const pull = () => fetch(url, { cache: 'no-store' }).then((r) => r.json()).then((s) => { if (!dead && s && s.code) take(s as State); }).catch(() => {});
    pull().then(() => { if (!dead && pid) send({ t: 'join', pid, name, kind } as Intent); });
    const ch = sb().channel('cs-row-' + code).on('postgres_changes', { event: '*', schema: 'public', table: 'cinesync_rooms', filter: `code=eq.${code}` }, (p) => { const row = (p as { new?: { state?: State } }).new; if (row?.state) take({ ...row.state, now: Date.now() + (stRef.current ? stRef.current.now - Date.now() : 0) }); }).subscribe();
    const poll = setInterval(pull, 2500); // safety net if Realtime drops
    const rejoin = setInterval(() => { const s = stRef.current; if (pid && s && !s.players[pid].joined) send({ t: 'join', pid, name } as Intent); }, 2000);
    return () => { dead = true; clearInterval(poll); clearInterval(rejoin); ch.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, pid, name]);

  // timers: any connected client nudges the server clock once a second while a timed phase is live (the server ignores no-op ticks)
  useEffect(() => {
    const t = setInterval(() => { const s = stRef.current; if (s && (s.phase === 'bracket' || s.phase === 'final' || s.phase === 'hitlist')) send({ t: 'tick', now: Date.now() } as Intent); }, 1000);
    return () => clearInterval(t);
  }, [send]);

  // keep the screen awake on player phones
  useEffect(() => {
    if (!pid) return;
    type WL = { release: () => Promise<void> };
    let lock: WL | null = null;
    const grab = async () => { try { const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<WL> } }; if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen'); } catch { /* unsupported */ } };
    grab(); const vis = () => { if (document.visibilityState === 'visible') grab(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}); };
  }, [pid]);

  // Orson's memory (host only): load the Ledger once both names are known, record each night when it ends
  useEffect(() => {
    if (!host || !state) return;
    const a = state.players.A, b = state.players.B;
    if (a.joined && b.joined && !busy.current.mem) {
      busy.current.mem = true;
      loadMem(a.name, b.name).then((m) => apply({ t: 'mem', nights: m.nights, ledger: m.ledger, last: m.last, durable: m.durable })).catch(() => { busy.current.mem = false; });
    }
    if (state.phase === 'done' && !state.mem.recorded && !busy.current.rec) {
      busy.current.rec = true;
      const f = state.fin; const film = state.winner ? BY_ID[state.winner].t : 'unknown';
      const wn = f.wpid ? state.players[f.wpid].name : a.name; const ln = f.loser ? state.players[f.loser].name : b.name;
      recordNight({ ts: f.rematchUsed ? Date.now() : Date.now(), couple: coupleKey(a.name, b.name), winner: wn, loser: ln, film, tie: f.tie, amend: f.rematchUsed }, a.name, b.name)
        .then((m) => { try { localStorage.setItem(nightsKey, String(m.nights)); } catch { /* ignore */ } apply({ t: 'mem', nights: m.nights, ledger: m.ledger, last: m.last, durable: m.durable }); apply({ t: 'recorded' }); busy.current.rec = false; })
        .catch(() => { apply({ t: 'recorded' }); busy.current.rec = false; });
    }
  }, [host, state, apply]);

  return { state, send, skew, online, host };
}
