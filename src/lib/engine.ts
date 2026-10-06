/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side game engine: ONE Supabase row per room is the single source of truth.
// Intents are applied by the pure reducer under a compare-and-set on state.v; Orson (Gemini) side effects run here too.
import { createClient } from '@supabase/supabase-js';
import { newState, reduce, BY_ID, fallbackPitch, AXQ_NAME, type Mood, type Intent, type State } from '@/lib/game';

const db = () => createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false } });

async function readRoom(code: string): Promise<State | null> {
  const { data } = await db().from('cinesync_rooms').select('state').eq('code', code).maybeSingle();
  return data ? (data.state as State) : null;
}
export const getRoom = async (code: string) => { const s = await readRoom(code); return s ? { ...s, now: Date.now() } : newState(code); };

const strip = (s: State) => JSON.stringify({ ...s, v: 0, now: 0 });

async function write(cur: State | null, next: State): Promise<boolean> {
  const c = db();
  if (!cur) { const { error } = await c.from('cinesync_rooms').insert({ code: next.code, kind: next.kind, state: next }); return !error; }
  const { data, error } = await c.from('cinesync_rooms').update({ state: next, kind: next.kind, updated_at: new Date().toISOString() }).eq('code', next.code).eq('state->>v', String(cur.v)).select('code');
  return !error && !!data && data.length > 0;
}

export async function runIntent(code: string, it: Intent): Promise<{ state: State; changed: boolean }> {
  for (let i = 0; i < 6; i++) {
    const row = await readRoom(code);
    const cur = row || newState(code); if (!cur.fx) cur.fx = { seen: [] };
    const next = reduce(cur, { ...(it as any), now: Date.now() } as Intent); if (!next.fx) next.fx = cur.fx;
    if (row && it.t === 'tick' && strip(next) === strip(cur)) return { state: cur, changed: false };
    if (await write(row, next)) return { state: next, changed: true };
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
  }
  const s = (await readRoom(code)) || newState(code); return { state: s, changed: false };
}

/** First caller wins a key; used so each Orson effect fires exactly once per game. */
export async function claim(code: string, key: string): Promise<{ ok: boolean; seen: string[] }> {
  for (let i = 0; i < 6; i++) {
    const row = await readRoom(code); if (!row) return { ok: false, seen: [] };
    const fx = row.fx || { seen: [] };
    if (fx.seen.includes(key)) return { ok: false, seen: fx.seen };
    const next: State = { ...row, v: row.v + 1, fx: { seen: [...fx.seen, key] } };
    if (await write(row, next)) return { ok: true, seen: next.fx.seen };
  }
  return { ok: false, seen: [] };
}

async function orson(origin: string, body: unknown, ms: number): Promise<any | null> {
  try { const r = await fetch(origin + '/api/orson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) }); return await r.json(); } catch { return null; }
}

/** Orson's brain: look at the state, fire any one-shot Gemini effect that is due, write results back as intents. */
export async function effects(code: string, origin: string): Promise<void> {
  const s = await readRoom(code); if (!s) return;
  const ap = (it: Intent) => runIntent(code, it);
  const ps: Promise<unknown>[] = [];
  const names = `${s.players.A.name} and ${s.players.B.name}`;
  const say = (key: string, event: string, ctx: string, fb: [string, Mood]) => {
    ps.push((async () => {
      const c = await claim(code, 'q:' + key); if (!c.ok) return;
      const calls = c.seen.filter((x) => x.startsWith('q:')).length;
      if (calls > 16 || s.cost.usd > 12) { await ap({ t: 'quip', line: fb[0], mood: fb[1] }); return; }
      const d = await orson(origin, { type: 'quip', names, event, ctx, roast: s.roast }, 7000);
      if (d && d.line) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'quip', line: d.line, mood: d.mood || 'idle' }); } else await ap({ t: 'quip', line: fb[0], mood: fb[1] });
    })());
  };
      const k = s.code + ':' + s.mem.nights;
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
  if (top) {
    if (/Veto|Surprise|Silver Bullet|Temptation|offer|Red Strike|Grenade|Bracket Buster|UPSET|Reroll/.test(top)) say(k + 'log' + top, top, 'React to this power move. Be theatrical.', [/offer|Temptation/.test(top) ? 'Someone is being tempted. I arranged it, of course.' : top.includes('Surprise') ? 'A gift. How suspicious. How romantic. How suspicious again.' : top.includes('Veto') ? 'A veto. Somebody woke up and chose violence.' : 'Blood on the carpet. I will send the bill.', /offer|Temptation|Surprise/.test(top) ? 'scheme' : 'shock']);
    if (/ beats /.test(top)) { const nb = s.log.filter((l) => / beats /.test(l)).length; if (nb % 4 === 0 || /tap-battle/.test(top)) say(k + 'm' + nb, top, 'A bracket result. Comment on the winner, loser or how it was decided.', [top.includes('tap-battle') ? 'A tap battle. Dignity left the building three taps ago.' : 'Another one falls. The carpet remembers.', 'glee']); }
  }
  if (s.phase === 'final' && !s.fin.pitchEnds) say(k + 'final' + s.fin.rematchUsed, `The final two are ${BY_ID[s.fin.a].t} versus ${BY_ID[s.fin.b].t}.`, 'Build tension.', [`${BY_ID[s.fin.a].t} against ${BY_ID[s.fin.b].t}. Pick your hill. Prepare to die on it.`, 'scheme']);
  if (s.phase === 'done' && s.winner !== null && s.fin.verdict) say(k + 'done' + s.fin.rematchUsed, `The night is decided: you watch ${BY_ID[s.winner].t}.`, s.fin.loser ? `${s.players[s.fin.loser].name} lost and owes the popcorn.` : 'They agreed on the same film.', [`${BY_ID[s.winner].t}. Dim the lights. I will be in the back, pretending not to cry.`, 'glee']);

  if (s.phase === 'draft' && s.draft.loading) ps.push((async () => {
    const c = await claim(code, 'pitches'); if (!c.ok) return;
    const ids = Array.from(new Set(s.draft.deck)).slice(0, 70);
    const t = s.vibe.target || [1.5, 1.5, 1.5, 1.5];
    const vibe = `pacing ${t[0].toFixed(1)}/10 (high = dense plot), emotional weight ${t[1].toFixed(1)}/10 (high = grim), fiction ${t[2].toFixed(1)}/10 (low = true story), runtime ${t[3].toFixed(1)}/10 (high = long)`;
    const movies = ids.map((id) => ({ id, t: BY_ID[id].t, y: BY_ID[id].y, g: BY_ID[id].g, o: BY_ID[id].o, c: BY_ID[id].c, rt: BY_ID[id].rt, k: BY_ID[id].k }));
    const fallback = Object.fromEntries(ids.map((id) => [id, fallbackPitch(id)]));
    const d = await orson(origin, { type: 'pitches', vibe, movies }, 25000);
    if (d && d.map) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'pitches', map: { ...fallback, ...d.map } }); } else await ap({ t: 'pitches', map: fallback });
  })());
  if (s.phase === 'final' && s.fin.judging && !s.fin.verdict) ps.push((async () => {
    const c = await claim(code, 'judge' + s.fin.rematchUsed); if (!c.ok) return;
    const f = s.fin; const A = BY_ID[f.a], B = BY_ID[f.b];
    const defender = (id: number) => (f.choice.A === id ? 'A' : 'B') as 'A' | 'B';
    const side = (id: number) => { const p = defender(id); return { t: BY_ID[id].t, y: BY_ID[id].y, r: BY_ID[id].r, by: s.players[p].name, pitch: f.pitch[p] || '' }; };
    const d = await orson(origin, { type: 'judge', roast: s.roast, rematch: f.rematchUsed, takeover: true, forced: f.forced !== undefined ? (f.forced === A.id ? 'A' : 'B') : undefined, a: side(A.id), b: side(B.id) }, 25000);
    if (d && d.winner) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'verdict', winner: d.winner === 'A' ? A.id : B.id, reason: d.verdict || '', lines: Array.isArray(d.lines) ? d.lines.slice(0, 4) : undefined }); }
    else { const w = f.forced !== undefined ? f.forced : A.r >= B.r ? A.id : B.id; await ap({ t: 'verdict', winner: w, reason: 'Orson lost the signal, so the higher rated film takes it.', lines: [`${A.t} against ${B.t}. A fight for the ages, or at least for tonight.`, `${(A.r >= B.r ? B : A).t}, I say this with love: no.`, 'Drumroll, please. I have never been wrong. Mostly.'] }); }
  })());

  // Hit List and bracket: Orson writes a "why you'd like it" for every title that is on the table and has no pitch yet
  if ((s.phase === 'hitlist' || (s.phase === 'bracket' && s.b8)) && !s.draft.loading) {
    const ids = (s.phase === 'hitlist' ? (s.hit?.grid || []) : Object.keys(s.b8?.seed || {}).map(Number)).filter((id) => !s.draft.pitches[id]);
    if (ids.length) ps.push((async () => {
      const c = await claim(code, 'bp:' + s.phase + ids.length); if (!c.ok) return;
      const t = s.vibe.target || [5, 5, 5, 5];
      const vibe = `pacing ${t[0].toFixed(1)}/10, emotional weight ${t[1].toFixed(1)}/10, fiction ${t[2].toFixed(1)}/10, runtime ${t[3].toFixed(1)}/10`;
      const movies = ids.map((id) => ({ id, t: BY_ID[id].t, y: BY_ID[id].y, g: BY_ID[id].g, o: BY_ID[id].o, c: BY_ID[id].c, rt: BY_ID[id].rt, k: BY_ID[id].k }));
      const fb = Object.fromEntries(ids.map((id) => [id, fallbackPitch(id)]));
      const d = await orson(origin, { type: 'pitches', vibe, movies }, 25000);
      if (d && d.map) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'pitches', map: { ...fb, ...d.map } }); } else await ap({ t: 'pitches', map: fb });
    })());
  }
  // Bracket Buster: the screen is glitch-locked while Orson writes the roast; then the wildcard is injected
  if (s.phase === 'bracket' && s.b8) { const m = s.b8.matches[s.b8.cur]; if (m && m.status === 'LOCKED_FOR_VETO' && m.busting) { const bu = m.busting; ps.push((async () => {
    const c = await claim(code, 'bust' + m.id + bu.at); if (!c.ok) return;
    const fb = `${s.players[bu.by].name} just torched ${BY_ID[bu.id].t}. Bold. Petty. I am rather moved.`;
    const d = await orson(origin, { type: 'quip', names, event: `${s.players[bu.by].name} used the Bracket Buster veto on ${BY_ID[bu.id].t} mid-tournament, so Orson replaces it with a polarising wildcard and fines them 10 tokens.`, ctx: 'Roast the vetoer for their punishment. Max 28 words.', roast: s.roast }, 8000);
    if (d && d.line) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
    await ap({ t: 'bustdone', roast: d && d.line ? d.line : fb });
  })()); } }
  // Match report: one vicious sentence about the couple's taste
  if (s.phase === 'done' && s.winner !== null && !s.taste) ps.push((async () => {
    const c = await claim(code, 'tasteroast'); if (!c.ok) return;
    const up = s.b8?.upsets.slice().sort((a, b) => b.gap - a.gap)[0];
    const fb = `${BY_ID[s.winner as number].t}. A film for two people who agreed to disagree and then both gave up.`;
    const d = await orson(origin, { type: 'quip', names, event: `The night is decided: ${BY_ID[s.winner as number].t}.${up ? ` Biggest upset: ${BY_ID[up.winner].t} over ${BY_ID[up.loser].t}.` : ''}`, ctx: 'Write ONE sentence, max 26 words, roasting this couple\'s overall taste, lovingly.', roast: true }, 8000);
    if (d && d.line) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
    await ap({ t: 'tasteroast', line: d && d.line ? d.line : fb });
  })());

  await Promise.all(ps);
}
