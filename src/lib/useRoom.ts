'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { newState, reduce, BY_ID, fallbackPitch, type Intent, type PID, type State } from '@/lib/game';

let client: ReturnType<typeof createClient> | null = null;
const sb = () => (client ||= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { realtime: { params: { eventsPerSecond: 20 } } }));

/** pid 'A' is the host (runs the reducer). 'B' and the TV (pid null) only send intents / render state. */
export function useRoom(code: string, pid: PID | null, name: string) {
  const host = pid === 'A';
  const [state, setState] = useState<State | null>(null);
  const [skew, setSkew] = useState(0);
  const [online, setOnline] = useState(false);
  const stRef = useRef<State | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const busy = useRef({ pitches: false, judge: false });

  const publish = useCallback((s: State) => {
    stRef.current = s; setState(s);
    if (host) { try { localStorage.setItem('cs-' + code, JSON.stringify(s)); } catch { /* ignore */ } }
    chRef.current?.send({ type: 'broadcast', event: 'state', payload: s });
  }, [code, host]);

  const apply = useCallback((it: Intent) => { const cur = stRef.current; if (!cur) return; publish(reduce(cur, it)); }, [publish]);

  const send = useCallback((it: Intent) => {
    if (host) apply(it); else chRef.current?.send({ type: 'broadcast', event: 'intent', payload: it });
  }, [host, apply]);

  useEffect(() => {
    let init: State = newState(code);
    if (host) { try { const raw = localStorage.getItem('cs-' + code); if (raw) init = JSON.parse(raw); } catch { /* ignore */ } stRef.current = init; setState(init); }
    const ch = sb().channel('cinesync-' + code, { config: { broadcast: { self: false, ack: false } } });
    chRef.current = ch;
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (host) return;
      const s = payload as State; setSkew(s.now - Date.now());
      if (!stRef.current || s.v >= stRef.current.v) { stRef.current = s; setState(s); }
    });
    ch.on('broadcast', { event: 'intent' }, ({ payload }) => { if (host) apply(payload as Intent); });
    ch.on('broadcast', { event: 'hello' }, () => { if (host && stRef.current) chRef.current?.send({ type: 'broadcast', event: 'state', payload: stRef.current }); });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setOnline(true);
        if (host) { if (stRef.current) { const s = stRef.current; chRef.current?.send({ type: 'broadcast', event: 'state', payload: s }); } apply({ t: 'join', pid: 'A', name }); }
        else { ch.send({ type: 'broadcast', event: 'hello', payload: {} }); if (pid) ch.send({ type: 'broadcast', event: 'intent', payload: { t: 'join', pid, name } }); }
      }
    });
    // non-host: keep saying hello until state arrives, and re-join on a loop until accepted
    const hello = setInterval(() => {
      if (host) return;
      const s = stRef.current;
      if (!s) ch.send({ type: 'broadcast', event: 'hello', payload: {} });
      else if (pid && !s.players[pid].joined) ch.send({ type: 'broadcast', event: 'intent', payload: { t: 'join', pid, name } });
    }, 1500);
    return () => { clearInterval(hello); ch.unsubscribe(); chRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, pid, name]);

  // host engine: timers + Orson (Gemini) side effects
  useEffect(() => {
    if (!host) return;
    const tick = setInterval(() => { const s = stRef.current; if (!s) return; const needs = (s.phase === 'bracket' || s.phase === 'final'); if (needs) apply({ t: 'tick', now: Date.now() }); }, 500);
    const beat = setInterval(() => { if (stRef.current) chRef.current?.send({ type: 'broadcast', event: 'state', payload: { ...stRef.current, now: Date.now() } }); }, 2500);
    return () => { clearInterval(tick); clearInterval(beat); };
  }, [host, apply]);

  useEffect(() => {
    if (!host || !state) return;
    if (state.phase === 'draft' && state.draft.loading && !busy.current.pitches) {
      busy.current.pitches = true;
      const ids = [...state.draft.deck, ...Array.from(new Set(state.draft.deck))].slice(0, 50);
      const t = state.vibe.target || [1.5, 1.5, 1.5, 1.5];
      const vibe = `energy ${t[0].toFixed(1)}/3, darkness ${t[1].toFixed(1)}/3, fantasy ${t[2].toFixed(1)}/3, spectacle ${t[3].toFixed(1)}/3`;
      const movies = ids.map((id) => ({ id, t: BY_ID[id].t, y: BY_ID[id].y, g: BY_ID[id].g, o: BY_ID[id].o }));
      const fallback = Object.fromEntries(ids.map((id) => [id, fallbackPitch(id)]));
      const timer = setTimeout(() => apply({ t: 'pitches', map: fallback }), 22000);
      fetch('/api/orson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'pitches', vibe, movies }) })
        .then((r) => r.json()).then((d) => {
          clearTimeout(timer);
          if (d.map) { apply({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); apply({ t: 'pitches', map: { ...fallback, ...d.map } }); } else apply({ t: 'pitches', map: fallback });
        }).catch(() => { clearTimeout(timer); apply({ t: 'pitches', map: fallback }); });
    }
    if (state.phase === 'final' && state.fin.judging && !busy.current.judge && !state.fin.verdict) {
      busy.current.judge = true;
      const f = state.fin; const A = BY_ID[f.a], B = BY_ID[f.b];
      // each player defends the film they chose; map to film A/B
      const defender = (id: number) => (f.choice.A === id ? 'A' : 'B') as PID;
      const side = (id: number) => { const p = defender(id); return { t: BY_ID[id].t, y: BY_ID[id].y, r: BY_ID[id].r, by: state.players[p].name, pitch: f.pitch[p] || '' }; };
      const fallback = () => { const w = A.r >= B.r ? A.id : B.id; apply({ t: 'verdict', winner: w, reason: 'Orson lost the signal, so the higher rated film takes it.' }); };
      fetch('/api/orson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'judge', a: side(A.id), b: side(B.id) }) })
        .then((r) => r.json()).then((d) => {
          if (!d.winner) return fallback();
          apply({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
          apply({ t: 'verdict', winner: d.winner === 'A' ? A.id : B.id, reason: d.verdict || '' });
        }).catch(fallback);
    }
  }, [host, state, apply]);

  return { state, send, skew, online, host };
}
