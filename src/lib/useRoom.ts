'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { sb } from '@/lib/supa';
import { loadMem, recordNight, coupleKey, nightsKey } from '@/lib/memory';
import { newState, reduce, BY_ID, fallbackPitch, AXES, AXQ_NAME, type Mood, type Intent, type PID, type State } from '@/lib/game';

/** pid 'A' is the host (runs the reducer). 'B' and the TV (pid null) only send intents / render state. */
export function useRoom(code: string, pid: PID | null, name: string, kind: 'movie' | 'series' = 'movie') {
  const host = pid === 'A';
  const [state, setState] = useState<State | null>(null);
  const [skew, setSkew] = useState(0);
  const [online, setOnline] = useState(false);
  const stRef = useRef<State | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const busy = useRef({ pitches: false, judge: false, mem: false, rec: false });

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
        if (host) { if (stRef.current) { const s = stRef.current; chRef.current?.send({ type: 'broadcast', event: 'state', payload: s }); } apply({ t: 'join', pid: 'A', name, kind }); }
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

  // host: keep the screen awake and re-announce state the moment the tab comes back
  useEffect(() => {
    if (!host) return;
    type WL = { release: () => Promise<void> };
    let lock: WL | null = null;
    const grab = async () => { try { const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<WL> } }; if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen'); } catch { /* unsupported or denied */ } };
    const vis = () => { if (document.visibilityState === 'visible') { grab(); if (stRef.current) chRef.current?.send({ type: 'broadcast', event: 'state', payload: { ...stRef.current, now: Date.now() } }); } };
    grab(); document.addEventListener('visibilitychange', vis); window.addEventListener('focus', vis); window.addEventListener('online', vis);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('focus', vis); window.removeEventListener('online', vis); lock?.release().catch(() => {}); };
  }, [host]);

  // host: Orson's live commentary. One short Gemini call per big moment, capped per room, always with an in-character fallback.
  const qn = useRef({ calls: 0, seen: new Set<string>(), busy: false, lastLog: '', matches: 0 });
  useEffect(() => {
    if (!host || !state) return;
    const q = qn.current; const s = state;
    const names = `${s.players.A.name} and ${s.players.B.name}`;
    const say = (key: string, event: string, ctx: string, fb: [string, Mood]) => {
      if (q.seen.has(key)) return; q.seen.add(key);
      if (q.calls >= 16 || q.busy) { apply({ t: 'quip', line: fb[0], mood: fb[1] }); return; }
      q.busy = true; q.calls++;
      const t = setTimeout(() => { q.busy = false; apply({ t: 'quip', line: fb[0], mood: fb[1] }); }, 6000); let done = false;
      fetch('/api/orson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'quip', names, event, ctx, roast: s.roast }) })
        .then((r) => r.json()).then((d) => { if (done) return; done = true; clearTimeout(t); q.busy = false; if (d.line) { apply({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); apply({ t: 'quip', line: d.line, mood: d.mood || 'idle' }); } else apply({ t: 'quip', line: fb[0], mood: fb[1] }); })
        .catch(() => { if (done) return; done = true; clearTimeout(t); q.busy = false; apply({ t: 'quip', line: fb[0], mood: fb[1] }); });
    };
    const k = s.v === 0 ? '' : s.code + ':' + s.mem.nights;
    if (s.phase === 'vibe' && s.players.A.joined && s.players.B.joined && s.vibe.attempts === 0 && s.vibe.score === null) say(k + 'meet', `Both players just arrived in the room. ${s.mem.last ? 'Last night: ' + s.mem.last : 'First night together on this app.'}`, '', [`${s.players.A.name}. ${s.players.B.name}. Two humans, one remote, zero chance of agreement. Wonderful.`, 'smug']);
    if (s.vibe.score !== null && s.vibe.doneAt) {
      const A = s.vibe.ans.A, B = s.vibe.ans.B; const gaps = [0, 1, 2, 3].map((i) => Math.abs((A[i] as number) - (B[i] as number)));
      const wi = gaps.indexOf(Math.max(...gaps));
      say(k + 'gate' + s.vibe.attempts, s.vibe.passed ? `The gate just PASSED at ${Math.round(s.vibe.score * 100)}% alignment.` : `The gate FAILED at ${Math.round(s.vibe.score * 100)}% alignment.`, `Widest gap: ${AXQ_NAME[wi]}, ${s.players.A.name} said ${A[wi]}/10 and ${s.players.B.name} said ${B[wi]}/10. ${s.vibe.passed ? 'Tease about how suspiciously alike they are.' : 'Name the exact clash and enjoy it.'}`,
        s.vibe.passed ? [`${Math.round(s.vibe.score * 100)}%. You two are alarmingly compatible. I am going to need a moment.`, 'glee'] : [`${AXQ_NAME[wi]}: ${A[wi]} against ${B[wi]}. I have seen peace treaties collapse over less.`, 'shock']);
    }
    if (s.phase === 'draft' && !s.draft.loading) say(k + 'draft', 'The blind draft is starting: each picks 10 films in secret.', `Tonight's mood target: energy ${s.vibe.target?.[0].toFixed(0)}, darkness ${s.vibe.target?.[1].toFixed(0)}, fantasy ${s.vibe.target?.[2].toFixed(0)}, scale ${s.vibe.target?.[3].toFixed(0)} out of 10.`, ['Ten films each, in secret. I will be watching your thumbs. Judging, mostly.', 'scheme']);
    if (s.phase === 'draft' && !s.draft.loading) for (const p of ['A', 'B'] as const) { const pr = s.draft.learn[p]; if (pr.n >= 5 && pr.yes === 0) say(k + 'pass' + p, `${s.players[p].name} has passed on their first ${pr.n} films in a row.`, 'Deck is re-ranking toward what they actually like. Tease them.', [`${s.players[p].name} has rejected ${pr.n} straight. I am recalibrating. Quietly. With tears.`, 'shock']); }
    if (s.phase === 'bracket' && s.br.round === 1 && s.br.cur === 0) { const ov = s.draft.picks.A.filter((x) => s.draft.picks.B.includes(x)); say(k + 'pool', `The pool is locked: ${ov.length} of the drafts overlapped.`, ov.length ? `Both drafted: ${ov.map((x) => BY_ID[x].t).slice(0, 3).join(', ')}` : 'Zero overlap.', ov.length ? [`${ov.length} films in common. A flicker of hope. I refuse to enjoy it.`, 'smug'] : ['Zero overlap. You two have never met, have you?', 'shock']); }
    const top = s.log[0] || '';
    if (top && top !== q.lastLog) {
      q.lastLog = top;
      if (/Veto|Surprise|Silver Bullet|Temptation|offer/.test(top)) say(k + 'log' + top, top, 'React to this power move. Be theatrical.', [/offer|Temptation/.test(top) ? 'Someone is being tempted. I arranged it, of course.' : top.includes('Surprise') ? 'A gift. How suspicious. How romantic. How suspicious again.' : top.includes('Veto') ? 'A veto. Somebody woke up and chose violence.' : 'Blood on the carpet. I will send the bill.', /offer|Temptation|Surprise/.test(top) ? 'scheme' : 'shock']);
      else if (/ beats /.test(top)) { q.matches++; if (q.matches % 4 === 0 || /tap-battle/.test(top)) say(k + 'm' + q.matches, top, 'A bracket result. Comment on the winner, loser or how it was decided.', [top.includes('tap-battle') ? 'A tap battle. Dignity left the building three taps ago.' : 'Another one falls. The carpet remembers.', 'glee']); }
    }
    if (s.phase === 'final' && !s.fin.pitchEnds) say(k + 'final' + s.fin.rematchUsed, `The final two are ${BY_ID[s.fin.a].t} versus ${BY_ID[s.fin.b].t}.`, 'Build tension.', [`${BY_ID[s.fin.a].t} against ${BY_ID[s.fin.b].t}. Pick your hill. Prepare to die on it.`, 'scheme']);
    if (s.phase === 'done' && s.winner !== null && s.fin.verdict) say(k + 'done' + s.fin.rematchUsed, `The night is decided: you watch ${BY_ID[s.winner].t}.`, s.fin.loser ? `${s.players[s.fin.loser].name} lost and owes the popcorn.` : 'They agreed on the same film.', [`${BY_ID[s.winner].t}. Dim the lights. I will be in the back, pretending not to cry.`, 'glee']);
  }, [host, state, apply]);

  useEffect(() => {
    if (!host || !state) return;
    if (state.phase === 'lobby' || state.phase === 'vibe') busy.current.pitches = false;
    if (state.phase !== 'final') busy.current.judge = false;
    if (state.phase === 'draft' && state.draft.loading && !busy.current.pitches) {
      busy.current.pitches = true;
      const ids = Array.from(new Set(state.draft.deck)).slice(0, 70);
      const t = state.vibe.target || [1.5, 1.5, 1.5, 1.5];
      const vibe = `pacing ${t[0].toFixed(1)}/10 (high = dense plot), emotional weight ${t[1].toFixed(1)}/10 (high = grim), fiction ${t[2].toFixed(1)}/10 (low = true story), runtime ${t[3].toFixed(1)}/10 (high = long)`;
      const movies = ids.map((id) => ({ id, t: BY_ID[id].t, y: BY_ID[id].y, g: BY_ID[id].g, o: BY_ID[id].o, c: BY_ID[id].c, rt: BY_ID[id].rt, k: BY_ID[id].k }));
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
      const fallback = () => { const w = A.r >= B.r ? A.id : B.id; apply({ t: 'verdict', winner: w, reason: 'Orson lost the signal, so the higher rated film takes it.', lines: [`${A.t} against ${B.t}. A fight for the ages, or at least for tonight.`, `${(A.r >= B.r ? B : A).t}, I say this with love: no.`, 'Drumroll, please. I have never been wrong. Mostly.'] }); };
      fetch('/api/orson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'judge', roast: state.roast, rematch: state.fin.rematchUsed, takeover: true, a: side(A.id), b: side(B.id) }) })
        .then((r) => r.json()).then((d) => {
          if (!d.winner) return fallback();
          apply({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
          apply({ t: 'verdict', winner: d.winner === 'A' ? A.id : B.id, reason: d.verdict || '', lines: Array.isArray(d.lines) ? d.lines.slice(0, 4) : undefined });
        }).catch(fallback);
    }
  }, [host, state, apply]);

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
