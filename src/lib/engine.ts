/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side game engine: ONE Supabase row per room is the single source of truth.
// Intents are applied by the pure reducer under a compare-and-set on state.v; Orson (Gemini) side effects run here too.
import { createClient } from '@supabase/supabase-js';
import { nukeCands, nukeFallback, previewMatches } from '@/lib/b8';
import { buildPostMatchMortem } from '@/utils/orsonPrompts';
import { newState, reduce, slAvg, registerExtra, BY_ID, fallbackPitch, AXQ_NAME, type Mood, type Intent, type State } from '@/lib/game';

const db = () => createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false } });

async function readRoom(code: string): Promise<State | null> {
  const { data } = await db().from('cinesync_rooms').select('state').eq('code', code).maybeSingle();
  return data ? (data.state as State) : null;
}
export const getRoom = async (code: string) => { const s = await readRoom(code); return s ? { ...s, now: Date.now() } : newState(code); };

const svc = () => createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string, { auth: { persistSession: false } });
const coupleOf = (s: State) => [s.players.A.name, s.players.B.name].map((x) => x.trim().toLowerCase()).sort().join('+');
/** What counts as "seen together". DEFAULT (awaiting Forrest's call): everything shown on the Hit List / bracket plus everything drafted. */
const seenShown = (s: State): number[] => Array.from(new Set([...(s.hit?.grid || []), ...Object.keys(s.b8?.seed || {}).map(Number), ...s.draft.picks.A, ...s.draft.picks.B, ...(s.winner !== null ? [s.winner as number] : [])]));
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
  const s = await readRoom(code); if (!s) return; registerExtra(s.extra);
  const ap = (it: Intent) => runIntent(code, it);
  const ps: Promise<unknown>[] = [];
  const names = `${s.players.A.name} and ${s.players.B.name}`;
  // v2.1 behaviour tracking: each player's swipe habits (passes vs drafts) go into Orson's context so roasts are personal and asymmetric
  const beh = (['A', 'B'] as const).map((p) => { const l = (s.draft as any).learn?.[p]; if (!l || !l.n) return ''; const pass = l.n - l.yes; return `${s.players[p].name} has swiped ${l.n} films: drafted ${l.yes}, passed ${pass} (${Math.round(100 * pass / l.n)}% pass rate), current pass/draft streak ${l.streak}.`; }).filter(Boolean).join(' ');
  const behCtx = beh ? ` Player behaviour: ${beh} Where it is relevant, roast the two players DIFFERENTLY and asymmetrically using these numbers.` : '';
  const say = (key: string, event: string, ctx: string, fb: [string, Mood]) => {
    ps.push((async () => {
      const c = await claim(code, 'q:' + key); if (!c.ok) return;
      const calls = c.seen.filter((x) => x.startsWith('q:')).length;
      if (calls > 16 || s.cost.usd > 12) { await ap({ t: 'quip', line: fb[0], mood: fb[1] }); return; }
      const d = await orson(origin, { type: 'quip', names, event, ctx: ctx + behCtx, roast: s.roast }, 7000);
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
  // Tale of the tape: one pre-fight broadcast line per matchup, generated as soon as both titles are known (templated line stays as fallback)
  if (s.phase === 'bracket' && s.b8) for (const m of s.b8.matches) if (m.a !== null && m.b !== null && !m.tape && m.status !== 'RESOLVED') ps.push((async () => {
    const b8 = s.b8!; const c = await claim(code, 'tape' + m.id + m.a + m.b); if (!c.ok) return;
    const side = (id: number) => { const cf = b8.conf[id]; const ptxt = cf ? `${s.players[cf.p].name} (${cf.golden ? 'GOLDEN TICKET CHAMPION' : 'conference seed #' + cf.rank})` : 'a player'; return `${ptxt}: "${BY_ID[id].t}" (${BY_ID[id].y}, TMDB ${BY_ID[id].r.toFixed(1)}), hype tokens invested: ${cf ? cf.tok : 0}`; };
    const d = await orson(origin, { type: 'quip', names, roast: s.roast, event: `Pre-fight broadcast for a ${['', 'blitz', 'quarterfinal', 'semifinal', 'FINAL'][m.round]} grudge match. ${side(m.a as number)}. VERSUS ${side(m.b as number)}.`, ctx: 'Maximum 2 sentences. Contrast their taste directly. Treat a conference seed #1 or Golden Ticket pick as a king to be guillotined and a seed #4 pick as a desperate underdog. Never corny cheerleading: you want domestic cinematic chaos. Use only the facts supplied, invent no plot.' }, 20000);
    if (d && d.line) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'tape', slot: m.slot, line: d.line }); }
  })());
  // v2.1 Tale of the Tape: one polarised critic review per spotlight film (TMDB), fetched once when the preview screen opens
  if (s.phase === 'bracket' && s.b8 && s.b8.show?.kind === 'champ') {
    const ids = previewMatches(s.b8).flatMap((m) => [m.a as number, m.b as number]);
    if (ids.some((i) => !s.reviews[i])) ps.push((async () => {
      const c = await claim(code, 'reviews'); if (!c.ok) return;
      try { const r = await fetch(origin + '/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), signal: AbortSignal.timeout(12000) }); const d = await r.json() as { map?: Record<number, { a: string; q: string; r: number | null }> };
        await ap({ t: 'reviews', map: d.map && Object.keys(d.map).length ? d.map : { [ids[0]]: { a: '', q: '', r: null } } }); } catch { await ap({ t: 'reviews', map: { [ids[0]]: { a: '', q: '', r: null } } }); }
    })());
  }
  // v2.2 Orson interstitials: his take on the VIBE stage the moment it ends (shared), and an asymmetric pair of DRAFT verdicts (one per player's own phone)
  if (s.phase !== 'lobby' && s.phase !== 'vibe' && !s.inter.vibe) ps.push((async () => {
    const c = await claim(code, 'iv'); if (!c.ok) return;
    const sw = s.vibe.sw; const yesA = Object.values(sw?.A || {}).filter(Boolean).length, yesB = Object.values(sw?.B || {}).filter(Boolean).length;
    const sl = slAvg(s);
    const d = await orson(origin, { type: 'quip', names, roast: s.roast, event: `The VIBE stage just ended. Locked vibes: ${(s.vibe.lock || []).join(', ') || 'chosen by sliders'}. ${s.players.A.name} said yes to ${yesA} vibes, ${s.players.B.name} to ${yesB}.${sl ? ` Average sliders: dark-to-light ${Math.round(sl[0])}, indie-to-blockbuster ${Math.round(sl[1])}, brainy-to-brainless ${Math.round(sl[2])}.` : ''}`, ctx: 'This is a full-screen pause between stages. Give your unvarnished opinion of what this stage says about the couple. 2 sentences max. Use only the facts supplied.' }, 15000);
    await ap({ t: 'inter', key: 'vibe', line: d?.line || `Three vibes locked. ${yesA} yeses from one of you, ${yesB} from the other. This is going to be a long night.` });
    if (d && d.line) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
  })());
  if ((s.phase === 'hitlist' || s.phase === 'bracket' || s.phase === 'done' || s.phase === 'final') && !s.asym) ps.push((async () => {
    const c = await claim(code, 'asym'); if (!c.ok) return;
    const L = (s.draft as any).learn || {}; const st = (p: 'A' | 'B') => { const l = L[p] || { n: 0, yes: 0, streak: 0 }; return { name: s.players[p].name, swipes: l.n || 0, passes: Math.max(0, (l.n || 0) - (l.yes || 0)), drafted: l.yes || 0, streak: l.streak || 0 }; };
    const p1 = st('A'), p2 = st('B');
    const d = await orson(origin, { type: 'asym', names, p1, p2 }, 20000);
    const worse = p1.passes >= p2.passes ? p1 : p2; const other = worse === p1 ? p2 : p1;
    const fbA = p1 === worse ? `${p1.passes} passes, ${p1.name}. Nothing on earth is good enough for you.` : `${p1.drafted} yeses, ${p1.name}. You would draft a cereal box.`; const fbB = p2 === worse ? `${p2.passes} passes, ${p2.name}. Impossible standards are not a personality.` : `${p2.drafted} yeses, ${p2.name}. And ${other.name === p2.name ? worse.name : other.name} is still being picky.`;
    await ap({ t: 'asym', a: d?.a || fbA, b: d?.b || fbB });
    if (d && d.a) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
  })());
  // v2.2 War Chest post-mortem: the wager math of every resolved bout goes to Orson for a one-line verdict (shown as a 5s toast)
  if (s.phase === 'bracket' && s.b8) for (const m of s.b8.matches) if (m.status === 'RESOLVED' && m.winner !== null && !m.mortem && m.round > 1 && m.a !== null && m.b !== null) ps.push((async () => {
    const c = await claim(code, 'pm' + m.id); if (!c.ok) return;
    const w = m.wg || {}; const ta = (['A', 'B'] as const).map((p) => ({ p, w: w[p] }));
    const sideOf = (p: 'A' | 'B') => (w[p] ? BY_ID[w[p]!.id]?.t || '' : '');
    const bout = { a: { name: s.players.A.name, film: sideOf('A'), tokens: w.A?.tok || 0 }, b: { name: s.players.B.name, film: sideOf('B'), tokens: w.B?.tok || 0 }, winner: BY_ID[m.winner as number].t, margin: m.via || 'the tug-of-war', upset: !!s.b8!.upsets.some((u) => u.winner === m.winner && u.loser === (m.winner === m.a ? m.b : m.a)) };
    void ta;
    const d = await orson(origin, { type: 'quip', names, roast: s.roast, event: buildPostMatchMortem(bout), ctx: 'One sentence only. Use the exact token numbers.' }, 9000);
    if (d && d.line) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'mortem', slot: m.slot, line: d.line }); }
  })());
  // Nuclear Veto: emergency ultimatum. Gemini picks a Titan and a Hidden Gem from verified catalogue candidates; templated fallback if it fails.
  if (s.phase === 'done' && s.b8 && s.reroll.stage === 'wait') ps.push((async () => {
    const c = await claim(code, 'nuke' + (s.reroll.at || 0)); if (!c.ok) return;
    const cands = nukeCands(s);
    const w = s.winner !== null ? BY_ID[s.winner] : null;
    const d = await orson(origin, { type: 'nuke', names, roast: s.roast, by: `${s.players.A.name} and ${s.players.B.name}`, winner: w ? `${w.t} (${w.y})` : '', tropes: s.reroll.tropes || [], cands: cands.map((x) => ({ id: x.id, t: x.t, y: x.y, g: x.g.slice(0, 3).join('/'), r: x.r, rt: x.rt ?? null, pop: Math.round(x.pop) })) }, 12000);
    if (d && d.titan) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
    await ap({ t: 'nukeult', ult: d && d.titan && d.gem ? { rant: d.orsonRant || '', titan: d.titan, gem: d.gem } : nukeFallback(s) });
  })());
  // Bracket Buster: the screen is glitch-locked while Orson writes the roast; then the wildcard is injected
  if (s.phase === 'bracket' && s.b8) { const m = s.b8.matches[s.b8.cur]; if (m && m.status === 'LOCKED_FOR_VETO' && m.busting) { const bu = m.busting; ps.push((async () => {
    const c = await claim(code, 'bust' + m.id + bu.at); if (!c.ok) return;
    const fb = `${s.players[bu.by].name} just torched ${BY_ID[bu.id].t}. Bold. Petty. I am rather moved.`;
    const d = await orson(origin, { type: 'quip', names, event: `${s.players[bu.by].name} used the Bracket Buster veto on ${BY_ID[bu.id].t} mid-tournament, so Orson replaces it with a polarising wildcard and fines them 10 tokens.`, ctx: 'Roast the vetoer for their punishment. Max 28 words.', roast: s.roast }, 8000);
    if (d && d.line) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
    await ap({ t: 'bustdone', roast: d && d.line ? d.line : fb });
  })()); } }
  // Couple memory of seen titles (Variety Engine): load at the gate, write at the end of the night. Server-side, service key, never fatal.
  if ((s.phase === 'vibe' || s.phase === 'lobby') && !s.seenLoaded && s.players.A.name && s.players.B.name) ps.push((async () => {
    const c = await claim(code, 'seenload'); if (!c.ok) return;
    let ids: number[] = [];
    try { const { data } = await svc().from('cinesync_seen').select('seen_ids').eq('couple', coupleOf(s)).eq('kind', s.kind).maybeSingle(); ids = ((data as any)?.seen_ids as number[]) || []; } catch { /* table not there yet */ }
    await ap({ t: 'seenload', ids });
  })());
  if (s.phase === 'done' && s.winner !== null) ps.push((async () => {
    const c = await claim(code, 'seenwrite'); if (!c.ok) return;
    try { await svc().rpc('cinesync_seen_add', { c: coupleOf(s), k: s.kind, ids: seenShown(s) }); } catch { /* table not there yet */ }
  })());
  // Match report: one vicious sentence about the couple's taste
  if (s.phase === 'done' && s.winner !== null && !s.taste) ps.push((async () => {
    const c = await claim(code, 'tasteroast'); if (!c.ok) return;
    const up = s.b8?.upsets.slice().sort((a, b) => b.gap - a.gap)[0];
    const fb = `${BY_ID[s.winner as number].t}. A film for two people who agreed to disagree and then both gave up.`;
    const d = await orson(origin, { type: 'quip', names, event: `The night is decided: ${BY_ID[s.winner as number].t}.${up ? ` Biggest upset: ${BY_ID[up.winner].t} over ${BY_ID[up.loser].t}.` : ''}`, ctx: 'Write ONE sentence, max 26 words, roasting this couple\'s overall taste, lovingly.', roast: true }, 8000);
    if (d && d.line) await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 });
    await ap({ t: 'tasteroast', line: d && d.line ? d.line : fb });
  })());

  // v2.0 Vibe Check: both players' sliders -> live TMDB discover (random page 1-5 every run). Always answers the room, even with zero results, so the draft can never hang.
  if (s.vibe && s.vibe.disc === 'req') ps.push((async () => {
    const c = await claim(code, 'discover'); if (!c.ok) return;
    let movies: any[] = [];
    try { const r = await fetch(origin + '/api/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sl: slAvg(s), ban: s.seenBan || [] }), signal: AbortSignal.timeout(15000) }); movies = ((await r.json()) as any).movies || []; } catch { /* fall back to the catalogue */ }
    await ap({ t: 'extras', movies });
  })());
  // Blind Bet: Orson rewrites the two masked synopses (a deterministic redacted overview is already on screen as the fallback)
  if (s.phase === 'bracket' && s.b8) for (const m of s.b8.matches) if (m.wc === 'blind' && m.cry && !m.cry.ai && m.status !== 'RESOLVED' && m.a !== null && m.b !== null) ps.push((async () => {
    const c = await claim(code, 'cry' + m.id + m.a + m.b); if (!c.ok) return;
    const f = (id: number) => `${BY_ID[id].t} (${BY_ID[id].y}): ${BY_ID[id].o}`;
    const d = await orson(origin, { type: 'cryptic', a: f(m.a as number), b: f(m.b as number) }, 12000);
    if (d && d.a && d.b) { await ap({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd || 0 }); await ap({ t: 'cryptic', slot: m.slot, a: d.a, b: d.b }); }
  })());
  // Wager banter: context-aware reaction when a big stake lands (callsigns, balances, matchup, pick trends)
  if (s.phase === 'bracket' && s.b8) { const b8 = s.b8; const m = b8.matches[b8.cur]; if (m && m.round > 1 && m.status === 'VOTING_ACTIVE' && m.a !== null && m.b !== null && m.wc !== 'blind') {
    const st = (['A', 'B'] as const).map((p) => ({ p, l: m.live?.[p] || m.wg[p] })).filter((x) => x.l && x.l.tok >= 25);
    if (st.length) { const top = st.sort((x, y) => (y.l as any).tok - (x.l as any).tok)[0]; const l = top.l as { id: number; tok: number };
      say(code + ':' + s.mem.nights + 'wg' + m.id + top.p + Math.floor(l.tok / 25), `${s.players[top.p].name} just put ${l.tok} Popcorn Tokens on ${BY_ID[l.id].t}.`, `Matchup: ${BY_ID[m.a].t} vs ${BY_ID[m.b].t}. Balances: ${s.players.A.name} ${b8.purse.A}, ${s.players.B.name} ${b8.purse.B}. Tokens backed so far this game: ${s.players.A.name} ${b8.backed.A}, ${s.players.B.name} ${b8.backed.B}. Include a piece of trivia or a quote about the film, mock outrage if the stake is reckless, and stir the rivalry. Max 2 sentences.`, ['That is a lot of popcorn for that film. I have seen less commitment at weddings.', 'scheme']); } } }
  await Promise.all(ps);
}
