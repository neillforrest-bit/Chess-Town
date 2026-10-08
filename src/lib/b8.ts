// PRD phases 2-4: The Hit List, the 8-seed March Madness bracket, upset multipliers, Bracket Buster, sudden-death trivia, accept-or-reroll.
// Pure state transitions; game.ts's reducer calls these. Tunable rules live in R.
import { TROPE_NAMES, BY_ID, poolOf, pickWildcards, vecOf, wdist, seeded, type PID, type State, type Movie } from './game';

export const R = {
  HIT_MS: 120000, HIT_REVEAL_MS: 12000, BUDGET: 100, BONUS_TOK: 10, GRID_EACH: 10, GRID_MIN: 18, GRID_MAX: 18, BRACKET: 16, MAX_WILD_IN_BRACKET: 4, BLITZ_MS: 8000, CHAMP_MS: 20000, CALLS_MS: [26000, 18000, 12000, 9000], CALL_BONUS: [1, 2, 3, 5], REVEAL_MS: 14000, SEED_MS: 13000, HOLD_MS: 900000, SHOW_BLITZ: 6500, SHOW_MATCH: 9000,
  PURSE: 50, FREE_WEIGHT: 10, OVERDRIVE: 1, UPSET_GAP: 3, UPSET_MULT: 2, BUSTER_FINE: 10, BUSTER_MAX_MS: 14000, TRIVIA_MS: 15000, NEXT_MS: 5500,
};

export type HitWeap = { veto: number | null; shields: number[]; done: boolean };
export type HitRes = { dead: number[]; blocked: { by: PID; id: number }[]; mocked: number | null; shield: Record<number, PID>; cut: number[]; until: number };
export type Hit = { endsAt: number; grid: number[]; owner: Record<number, 'A' | 'B' | 'AB' | 'O'>; weap: { A: HitWeap; B: HitWeap }; shieldsAllowed: { A: number; B: number }; tok: { A: Record<number, number>; B: Record<number, number> }; budget: { A: number; B: number }; res: HitRes | null };
export type Trivia = { q: string; opts: string[]; ans: number; endsAt: number; locked: { A?: boolean; B?: boolean }; winner: PID | null };
export type M8 = {
  id: string; round: 1 | 2 | 3 | 4; slot: number; a: number | null; b: number | null; seedA: number; seedB: number;
  status: 'PENDING' | 'VOTING_ACTIVE' | 'LOCKED_FOR_VETO' | 'RESOLVED';
  wg: { A?: { id: number; tok: number }; B?: { id: number; tok: number } };
  winner: number | null; via: string | null; wild: boolean; trivia: Trivia | null; busting: { by: PID; id: number; at: number } | null; nextAt: number | null; bust?: string; endsAt?: number; calledBy?: PID[]; tape?: string;
  live?: { A?: { id: number; tok: number }; B?: { id: number; tok: number } }; bidEnds?: number;
};
export type B8 = {
  matches: M8[]; cur: number; seed: Record<number, number>; shield: Record<number, PID>; purse: { A: number; B: number };
  buster: { A: boolean; B: boolean }; upsets: { winner: number; loser: number; gap: number }[]; vetoLog: { by: PID; id: number; score: number; line?: string }[];
  base: number; conf: Record<number, { p: PID; rank: number; golden: boolean; tok: number }>; wilds: number[]; backed: { A: number; B: number }; bonus: { A: number; B: number };
  show?: { until: number; kind: 'explain' | 'rank' | 'seed' | 'champ' | 'calls' | 'round'; round: number; line?: string } | null; ack?: { A: boolean; B: boolean }; calls?: Calls;
};
export type Calls = { champ: { A?: number; B?: number }; pick: { A: Record<number, number>; B: Record<number, number> }; score: { A: number; B: number }; streak: { A: number; B: number } };
export type Ult = { rant: string; titan: { id: number; why: string }; gem: { id: number; why: string } };
export type Reroll = { stage: 'off' | 'ask' | 'tropes' | 'wait' | 'pick' | 'done'; votes: { A?: boolean; B?: boolean }; used: boolean; to: number | null; by?: PID; tropes?: string[]; ult?: Ult | null; at?: number; pk?: { A?: string[]; B?: string[] }; uv?: { A?: 'titan' | 'gem' | 'keep'; B?: 'titan' | 'gem' | 'keep' } };
export const TROPES_OLD = ['Twist ending', 'Heist', 'Time loop', 'Road trip', 'Found family', 'Revenge', 'Underdog', 'Slow burn', 'Unreliable narrator', 'Outer space', 'Small town', 'Heartbreaker', 'One location', 'Cult classic', 'Feel-good', 'Dark comedy'] as const;
export const rrLive = (s: { b8: unknown; reroll: Reroll }) => !!s.b8 && ['ask', 'tropes', 'wait', 'pick'].includes(s.reroll.stage);
/** Candidates for the ultimatum: unseen, well rated, from our TMDB-sourced catalogue so every film and score is real. */
export function nukeCands(s: State, n = 36) {
  const used = new Set<number>([...s.pool, ...s.vetoed, ...Object.keys(s.b8?.seed || {}).map(Number), ...(s.seenBan || [])]);
  const tr = (s.reroll.tropes || []).join(' ').toLowerCase();
  return poolOf(s.kind).filter((x) => !used.has(x.id) && x.r >= 7.2 && x.id !== s.winner)
    .map((x) => ({ x, sc: x.r + (x.kw || []).filter((k) => tr.includes(k.toLowerCase())).length * 0.6 })).sort((a, c) => c.sc - a.sc || a.x.id - c.x.id).slice(0, n).map((o) => o.x);
}
export function nukeFallback(s: State): Ult {
  const c = nukeCands(s);
  const titan = [...c].sort((a, b) => (b.rt ?? b.r * 10) - (a.rt ?? a.r * 10) || b.pop - a.pop)[0];
  const gem = [...c].filter((x) => x.id !== titan?.id).sort((a, b) => a.pop - b.pop || b.r - a.r)[0] || titan;
  return { rant: `You BOTH hit the button. Six tropes, two verdicts, zero loyalty. Here is the gauntlet: take it or leave it.`, titan: { id: titan?.id ?? 0, why: 'The critics\' darling. Hard to argue with, so argue anyway.' }, gem: { id: gem?.id ?? 0, why: 'Almost nobody has seen it. That is the point.' } };
}

const sc = (m: Movie) => (m.rt ?? m.r * 10) / 100;
const other = (p: PID): PID => (p === 'A' ? 'B' : 'A');
export const tm8 = (id: number) => BY_ID[id].t;

/** Called when both drafts are locked: build the Hit List grid (each player's first 5 picks, i.e. fastest swipes, plus Orson wildcards). */
export function startHit(s: State, now: number) {
  const A = s.draft.picks.A.slice(0, R.GRID_EACH), B = s.draft.picks.B.slice(0, R.GRID_EACH);
  const own: number[] = Array.from(new Set([...A, ...B]));
  const owner: Hit['owner'] = {};
  for (const id of own) owner[id] = A.includes(id) && B.includes(id) ? 'AB' : A.includes(id) ? 'A' : 'B';
  const bonus = s.b8Bonus || { A: 0, B: 0 };
  s.hit = { endsAt: now + R.HIT_MS, grid: own, owner, weap: { A: { veto: null, shields: [], done: false }, B: { veto: null, shields: [], done: false } }, shieldsAllowed: { A: 1, B: 1 }, tok: { A: {}, B: {} }, budget: { A: R.BUDGET + R.BONUS_TOK * bonus.A, B: R.BUDGET + R.BONUS_TOK * bonus.B }, res: null };
  s.phase = 'hitlist'; s.pool = own;
  s.log.unshift(`The War Room: ${own.length} titles. Spend your hype tokens, pick a Golden Ticket, load a Silver Bullet.`);
}

export function hitIntent(s: State, it: { pid: PID; veto?: number | null; shield?: number | null; done?: boolean; tok?: { id: number; amt: number } }, now: number) {
  const h = s.hit; if (!h || s.phase !== 'hitlist' || h.res) return;
  const w = h.weap[it.pid]; if (w.done) return;
  if (it.veto !== undefined) { if (it.veto === null || (h.grid.includes(it.veto) && h.owner[it.veto] !== it.pid && h.owner[it.veto] !== 'AB')) w.veto = it.veto; }
  if (it.shield !== undefined && it.shield !== null) {
    const id = it.shield; const o = h.owner[id];
    if (h.grid.includes(id) && (o === it.pid || o === 'AB')) { w.shields = w.shields.includes(id) ? w.shields.filter((x) => x !== id) : [...w.shields, id].slice(-h.shieldsAllowed[it.pid]); }
  }
  if (it.tok) {
    const id = it.tok.id; const o = h.owner[id]; const amt = Math.max(0, Math.floor(Number(it.tok.amt) || 0));
    if (h.grid.includes(id) && (o === it.pid || o === 'AB')) { const t = h.tok[it.pid]; const others = Object.keys(t).filter((k) => Number(k) !== id).reduce((n, k) => n + t[Number(k)], 0); t[id] = Math.min(amt, Math.max(0, h.budget[it.pid] - others)); }
  }
  if (it.done) w.done = true;
  if (h.weap.A.done && h.weap.B.done) resolveHit(s, now);
}

export function resolveHit(s: State, now: number) {
  const h = s.hit; if (!h || h.res) return;
  const shield: Record<number, PID> = {};
  for (const p of ['A', 'B'] as PID[]) for (const id of h.weap[p].shields) if (!shield[id]) shield[id] = p;
  const dead: number[] = []; const blocked: HitRes['blocked'] = [];
  for (const p of ['A', 'B'] as PID[]) { const v = h.weap[p].veto; if (v === null) continue; if (!dead.includes(v)) dead.push(v); }
  const mocked = h.weap.A.veto !== null && h.weap.A.veto === h.weap.B.veto && dead.includes(h.weap.A.veto) ? h.weap.A.veto : null;
  const vl: B8['vetoLog'] = [];
  for (const p of ['A', 'B'] as PID[]) { const v = h.weap[p].veto; if (v !== null && dead.includes(v)) vl.push({ by: p, id: v, score: BY_ID[v].r }); }
  const surv = h.grid.filter((id) => !dead.includes(id));
  const cut = surv.length > R.BRACKET ? [] : [];
  h.res = { dead, blocked, mocked, shield, cut, until: now + R.HIT_REVEAL_MS };
  s.vetoed.push(...dead);
  for (const d of dead) s.log.unshift(`Red Strike: ${BY_ID[d].t} is dead.`);
  for (const b of blocked) s.log.unshift(`${s.players[b.by].name}'s Veto on ${BY_ID[b.id].t} bounced off a Gold Shield.`);
  (s as { _vl?: B8['vetoLog'] })._vl = vl;
}

/** Seeding score: movies 0.4 RT + 0.3 TMDB + 0.3 swipe velocity; series TMDB only (0.7) + velocity (0.3). */
function seedScore(s: State, id: number): number {
  const m = BY_ID[id]; const isSeries = s.kind === 'series';
  const vi = (p: PID) => { const i = s.draft.picks[p].indexOf(id); return i < 0 ? null : 1 - i / 10; };
  const va = vi('A'), vb = vi('B'); const vs = [va, vb].filter((x) => x !== null) as number[];
  const vel = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0.3;
  const tmdb = m.r / 10;
  return isSeries ? 0.7 * tmdb + 0.3 * vel : 0.4 * sc(m) + 0.3 * tmdb + 0.3 * vel;
}

export function buildBracket(s: State, now: number) {
  const h = s.hit as Hit; const res = h.res as HitRes;
  const surv = h.grid.filter((id) => !res.dead.includes(id));
  const score = (id: number) => seedScore(s, id);
  const tk = (p: PID, id: number) => h.tok[p][id] || 0;
  const golden = (p: PID) => { const g = h.weap[p].shields[0]; return g !== undefined && surv.includes(g) && (h.owner[g] === p || h.owner[g] === 'AB') ? g : null; };
  const gA = golden('A'), gB = golden('B');
  // each title belongs to one player's conference; a shared title goes to whoever spent more hype on it
  const mine: Record<PID, number[]> = { A: [], B: [] };
  for (const id of surv) { const o = h.owner[id]; mine[o === 'AB' ? (tk('B', id) > tk('A', id) ? 'B' : 'A') : (o as PID)].push(id); }
  if (gA !== null && gB === gA) { /* both ticketed the same shared title: it stays with its owner by tokens, the other conference simply has no champion */ }
  const rank = (p: PID) => { const g = golden(p); const rest = mine[p].filter((x) => x !== g).sort((a, c) => tk(p, c) - tk(p, a) || score(c) - score(a) || a - c); return g !== null && mine[p].includes(g) ? [g, ...rest] : rest; };
  let rA = rank('A'), rB = rank('B');
  // guard: a Silver Bullet can leave a conference short; backfill from the other conference's surplus
  while (rA.length < 4 && rB.length > 4) rA.push(rB.pop() as number);
  while (rB.length < 4 && rA.length > 4) rB.push(rA.pop() as number);
  if (rA.length < 4 || rB.length < 4) {
    const extra = pickWildcards(new Set([...surv, ...res.dead, ...s.vetoed]), s.vibe.target || [5, 5, 5, 5], 8, s.code + 'top', s.kind);
    for (const id of extra) { if (rA.length < 4) { rA.push(id); h.owner[id] = 'A'; } else if (rB.length < 4) { rB.push(id); h.owner[id] = 'B'; } }
  }
  rA = rA.slice(0, 4); rB = rB.slice(0, 4);
  const conf: B8['conf'] = {}; const seed: Record<number, number> = {};
  rA.forEach((id, i) => { conf[id] = { p: 'A', rank: i + 1, golden: id === gA, tok: tk('A', id) }; seed[id] = 2 * i + 1; });
  rB.forEach((id, i) => { conf[id] = { p: 'B', rank: i + 1, golden: id === gB, tok: tk('B', id) }; seed[id] = 2 * i + 2; });
  const goldMap: Record<number, PID> = {}; if (gA !== null && conf[gA]) goldMap[gA] = 'A'; if (gB !== null && conf[gB] && gB !== gA) goldMap[gB] = 'B';
  const mk = (id: string, round: 1 | 2 | 3 | 4, slot: number, a: number | null, b: number | null): M8 => ({ id, round, slot, a, b, seedA: a ? seed[a] : 0, seedB: b ? seed[b] : 0, status: 'PENDING', wg: {}, winner: null, via: null, wild: false, trivia: null, busting: null, nextAt: null });
  // spec pairings: QF1 A#1 v B#4, QF2 B#2 v A#3, QF3 B#1 v A#4, QF4 A#2 v B#3
  const ms: M8[] = [mk('q0', 2, 0, rA[0], rB[3]), mk('q1', 2, 1, rB[1], rA[2]), mk('q2', 2, 2, rB[0], rA[3]), mk('q3', 2, 3, rA[1], rB[2]), mk('s0', 3, 4, null, null), mk('s1', 3, 5, null, null), mk('f1', 4, 6, null, null)];
  const bonus = s.b8Bonus || { A: 0, B: 0 };
  const all = [...rA, ...rB];
  s.b8 = { matches: ms, cur: 0, seed, shield: goldMap, base: 0, conf, purse: { A: R.PURSE, B: R.PURSE }, buster: { A: true, B: true }, upsets: [], vetoLog: (s as { _vl?: B8['vetoLog'] })._vl || [], wilds: [], backed: { A: 0, B: 0 }, bonus, show: { until: now + R.HOLD_MS, kind: 'explain', round: 0 }, ack: { A: false, B: false }, calls: { champ: {}, pick: { A: {}, B: {} }, score: { A: 0, B: 0 }, streak: { A: 0, B: 0 } } };
  delete (s as { _vl?: unknown })._vl;
  s.pool = all; s.phase = 'bracket';
  s.log.unshift(`Bracket set: ${BY_ID[rA[0]].t} and ${BY_ID[rB[0]].t} lead the two conferences.`);
}

const say8 = (s: State, line: string, mood: 'smug' | 'shock' | 'glee' | 'scheme' = 'smug') => { s.orson = { ...s.orson, line, mood, n: s.orson.n + 1 }; };
const NAMES = ['Round of 16', 'Quarterfinal', 'Semifinal', 'The Final'];
/** Matchup commentary: written from the seeds, ratings and shields so every bout gets its own billing. */
function introLine(s: State, m: M8): { line: string; mood: 'smug' | 'scheme' } | null {
  const b = s.b8; if (!b || m.a === null || m.b === null) return null;
  if (m.tape) return { line: m.tape, mood: m.round === 4 ? 'scheme' : 'smug' }; const A = BY_ID[m.a], B = BY_ID[m.b]; const gap = Math.abs(m.seedA - m.seedB);
  const hi = m.seedA < m.seedB ? A : B, lo = hi === A ? B : A; const sh = b.shield[m.a] || b.shield[m.b];
  const pool = m.round === 4 ? [`THE FINAL. ${A.t} against ${B.t}. Everything you have ever agreed on comes down to this.`, `Two titles left. One of you is about to be very smug. ${A.t} versus ${B.t}.`]
    : gap >= 8 ? [`#${m.seedA < m.seedB ? m.seedA : m.seedB} ${hi.t} against #${Math.max(m.seedA, m.seedB)} ${lo.t}. David and Goliath, except David has a worse trailer.`, `${lo.t} was not supposed to be here. Neither was I, but here we are.`]
    : gap <= 1 ? [`${A.t} against ${B.t}. Practically twins. Pick carefully, one of you is wrong.`, `Neck and neck: #${m.seedA} against #${m.seedB}. Hearts will break.`]
    : sh ? [`${A.t} versus ${B.t}. One of them is wearing a Gold Shield. Cheating, but legal.`]
    : [`${NAMES[m.round - 1]}: #${m.seedA} ${A.t} versus #${m.seedB} ${B.t}. Choose violently.`, `${A.t} meets ${B.t}. Rated ${A.r.toFixed(1)} and ${B.r.toFixed(1)}. Taste is subjective, and you are both wrong.`];
  return { line: pool[Math.abs(m.slot * 7 + s.code.length) % pool.length], mood: gap >= 8 || m.round === 4 ? 'scheme' : 'smug' };
}
function intro8(s: State, m: M8) { const l = introLine(s, m); if (l) say8(s, l.line, l.mood); }
/** LIVE TUG-OF-WAR: open escalating bids. Tokens leave the purse the moment they are bid; both partners see each other's stake in real time. */
export function bidIntent(s: State, it: { pid: PID; id: number; add: number }, now: number) {
  const b = s.b8; if (!b || s.phase !== 'bracket') return; const m = b.matches[b.cur];
  if (!m || m.round < 2 || m.status !== 'VOTING_ACTIVE' || m.wg[it.pid] || (it.id !== m.a && it.id !== m.b)) return;
  const cur = m.live?.[it.pid]; if (cur && cur.id !== it.id) return;
  const add = Math.max(1, Math.min(Math.floor(it.add || 1), b.purse[it.pid])); if (b.purse[it.pid] < 1) return;
  b.purse[it.pid] -= add; m.live = { ...(m.live || {}), [it.pid]: { id: it.id, tok: (cur ? cur.tok : 0) + add } };
  if (!m.bidEnds) m.bidEnds = now + 120000;
}
export function lockBid(s: State, it: { pid: PID }, now: number) {
  const b = s.b8; if (!b || s.phase !== 'bracket') return; const m = b.matches[b.cur];
  if (!m || m.status !== 'VOTING_ACTIVE' || m.wg[it.pid] || !m.live?.[it.pid]) return;
  m.wg[it.pid] = m.live[it.pid]; if (m.wg.A && m.wg.B) settle(s, m, now);
}
const MATCH_WEIGHT = (m: M8, p: PID, tok: number) => (m.round === 1 ? R.FREE_WEIGHT : tok);

export function wagerIntent(s: State, it: { pid: PID; id: number; tok: number }, now: number) {
  const b = s.b8; if (!b || s.phase !== 'bracket') return; const m = b.matches[b.cur];
  if (!m || m.status !== 'VOTING_ACTIVE' || m.wg[it.pid] || m.live?.[it.pid] || (it.id !== m.a && it.id !== m.b)) return;
  let tok = 0;
  if (m.round > 1) { tok = Math.max(1, Math.min(Math.floor(it.tok || 1), b.purse[it.pid])); if (b.purse[it.pid] < 1) tok = 0; if (tok === 0) tok = 0; b.purse[it.pid] -= tok; }
  m.wg[it.pid] = { id: it.id, tok };
  if (m.wg.A && m.wg.B) settle(s, m, now);
}

export function bars(b: B8, m: M8) {
  const src = (p: PID) => m.wg[p] || m.live?.[p];
  const t = (id: number | null) => (['A', 'B'] as PID[]).reduce((n, p) => n + (src(p) && src(p)!.id === id ? MATCH_WEIGHT(m, p, src(p)!.tok) : 0), 0) * (id !== null && b.shield[id] ? R.OVERDRIVE : 1);
  return { a: t(m.a), b: t(m.b) };
}

function settle(s: State, m: M8, now: number) {
  const b = s.b8 as B8; const br = bars(b, m);
  if (br.a === br.b && m.round === 1) { finish(s, m, m.seedA < m.seedB ? (m.a as number) : (m.b as number), 'dead heat, the higher seed takes it', now); return; }
  if (br.a === br.b) { const ga = b.shield[m.a as number], gb = b.shield[m.b as number]; if (ga && !gb) { finish(s, m, m.a as number, 'the Golden Ticket breaks the tie', now); return; } if (gb && !ga) { finish(s, m, m.b as number, 'the Golden Ticket breaks the tie', now); return; } startTrivia(s, m, now); return; }
  finish(s, m, br.a > br.b ? (m.a as number) : (m.b as number), `${Math.round(Math.max(br.a, br.b))} to ${Math.round(Math.min(br.a, br.b))} on the tug-of-war`, now);
}

function startTrivia(s: State, m: M8, now: number) {
  const a = BY_ID[m.a as number], bb = BY_ID[m.b as number]; const rnd = seeded(s.code, 'triv' + m.id);
  const films = [a, bb].filter((f) => (f.c || []).length);
  const f = films[Math.floor(rnd() * Math.max(1, films.length))] || a;
  const cast = (f.c || []).slice(0, 3); const real = cast[Math.floor(rnd() * Math.max(1, cast.length))] || (f.k || 'the director');
  const mine = new Set([...(a.c || []), ...(bb.c || [])]);
  const pool = poolOf(s.kind).flatMap((x) => x.c || []).filter((n) => !mine.has(n));
  const wrong: string[] = []; let guard = 0;
  while (wrong.length < 3 && pool.length && guard++ < 300) { const n = pool[Math.floor(rnd() * pool.length)]; if (!wrong.includes(n)) wrong.push(n); }
  const opts = [...wrong, real]; for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  m.status = 'VOTING_ACTIVE';
  m.trivia = { q: `Sudden death! Which of these stars is in ${f.t}?`, opts, ans: opts.indexOf(real), endsAt: now + R.TRIVIA_MS, locked: {}, winner: null };
  s.log.unshift('Dead tie. Orson calls sudden death trivia.');
}

export function triviaTap(s: State, it: { pid: PID; i: number }, now: number) {
  const b = s.b8; if (!b) return; const m = b.matches[b.cur]; const t = m?.trivia; if (!m || !t || m.status === 'RESOLVED' || t.locked[it.pid]) return;
  if (it.i === t.ans) { t.winner = it.pid; const w = m.wg[it.pid]?.id; const pick = w !== undefined ? w : (m.a as number); finish(s, m, pick, `${s.players[it.pid].name} won sudden death trivia`, now); }
  else { t.locked[it.pid] = true; if (t.locked.A && t.locked.B) triviaTimeout(s, m, now); }
}
function triviaTimeout(s: State, m: M8, now: number) {
  const hi = BY_ID[m.a as number].r >= BY_ID[m.b as number].r ? (m.a as number) : (m.b as number);
  finish(s, m, hi, 'trivia stalemate, higher rated title advances', now);
}

function finish(s: State, m: M8, winner: number, via: string, now: number) {
  const b = s.b8 as B8; m.winner = winner; m.via = via; m.status = 'RESOLVED'; m.nextAt = now + R.NEXT_MS;
  const loser = winner === m.a ? (m.b as number) : (m.a as number);
  const sw = b.seed[winner], sl = b.seed[loser]; const gap = sw - sl;
  const mult = gap >= R.UPSET_GAP ? R.UPSET_MULT : 1;
  if (gap > 0) b.upsets.push({ winner, loser, gap });
  for (const p of ['A', 'B'] as PID[]) { const w = m.wg[p]; if (w && w.id === winner) { b.backed[p]++; if (m.round > 1) b.purse[p] += w.tok * mult; } }
  if (BY_ID[winner] && b.wilds.includes(winner)) s.stats.wildWins++;
  s.log.unshift(`${BY_ID[winner].t} beats ${BY_ID[loser].t} (${via}).${gap >= R.UPSET_GAP ? ' UPSET!' : ''}`);
  const cl = b.calls; let champMock = '';
  if (cl) for (const p of ['A', 'B'] as PID[]) {
    const pk = cl.pick[p][m.slot];
    if (pk !== undefined) { if (pk === winner) { cl.streak[p]++; const bon = R.CALL_BONUS[m.round - 1] + (cl.streak[p] >= 3 ? 1 : 0); b.purse[p] += bon; cl.score[p] += bon; m.calledBy = [...(m.calledBy || []), p]; } else cl.streak[p] = 0; }
    if (cl.champ[p] === loser) champMock += `${s.players[p].name} called ${BY_ID[loser].t} to win it all. It is dead. `;
    if (m.round === 4 && cl.champ[p] === winner) { s.b8Bonus = { ...(s.b8Bonus || { A: 0, B: 0 }), [p]: ((s.b8Bonus || { A: 0, B: 0 })[p] || 0) + 1 }; s.log.unshift(`${s.players[p].name} called the champion. +10 hype tokens next game.`); }
  }
  if (champMock) say8(s, champMock + 'Weep quietly.', 'glee'); else
  if (gap >= R.UPSET_GAP) say8(s, `UPSET! #${sw} ${BY_ID[winner].t} knocks out #${sl} ${BY_ID[loser].t}. The bracket weeps. I am delighted.`, 'glee');
  if (!champMock && gap < R.UPSET_GAP) say8(s, `${BY_ID[winner].t} advances. ${gap > 0 ? 'Mild upset.' : 'The seeding holds.'} ${BY_ID[loser].t} goes quietly.`, 'smug');
}

export function champIntent(s: State, it: { pid: PID; id: number }) { const b = s.b8; if (!b || !b.calls || b.show?.kind !== 'champ' || b.ack?.[it.pid] || b.seed[it.id] === undefined) return; b.calls.champ[it.pid] = it.id; }
export function callIntent(s: State, it: { pid: PID; slot: number; id: number }) {
  const b = s.b8; const sh = b?.show; if (!b || !b.calls || !sh || sh.kind !== 'calls' || b.ack?.[it.pid]) return;
  const m = b.matches[it.slot]; if (!m || m.round !== sh.round || (it.id !== m.a && it.id !== m.b)) return; b.calls.pick[it.pid][it.slot] = it.id;
}
const callsShow = (b: B8, round: number, now: number) => { b.ack = { A: false, B: false }; b.show = { until: now + R.CALLS_MS[round - 1], kind: 'calls', round }; };
const startMatch = (s: State, b: B8, now: number) => { const nx = b.matches[b.cur]; nx.status = 'VOTING_ACTIVE'; if (nx.round === 1) nx.endsAt = now + R.BLITZ_MS; intro8(s, nx); };
export function tapeIntent(s: State, it: { slot: number; line: string }) { const m = s.b8?.matches[it.slot]; if (!m || m.tape || !it.line) return; m.tape = String(it.line).replace(/\s+/g, ' ').trim().slice(0, 240); }

export function ackIntent(s: State, it: { pid: PID }) { const b = s.b8; if (!b || !b.show || !['explain', 'rank', 'champ', 'calls', 'round', 'seed'].includes(b.show.kind)) return; b.ack = { ...(b.ack || { A: false, B: false }), [it.pid]: true }; }

// Bracket Buster retired in the Pure Rivalry format (it needed an Orson wildcard); the Silver Bullet is the only kill shot.
export function bustIntent(_s: State, _it: { pid: PID; id: number }, _now: number) { void _s; void _it; void _now; }
export function bustDone(s: State, roast: string, now: number) {
  const b = s.b8; if (!b) return; const m = b.matches[b.cur]; if (!m || !m.busting) return;
  const { by, id } = m.busting; const old = BY_ID[id];
  const taken = new Set([...Object.keys(b.seed).map(Number), ...s.vetoed, ...s.pool]);
  const t = vecOf(old);
  const inn = poolOf(s.kind).filter((x) => !taken.has(x.id) && x.r >= 6.8).map((x) => ({ x, sc: x.r * 0.6 + wdist(vecOf(x), t) * 0.5 })).sort((a, c) => c.sc - a.sc || a.x.id - c.x.id)[0];
  if (inn) {
    const n = inn.x.id; b.seed[n] = b.seed[id]; delete b.seed[id]; s.vetoed.push(id);
    if (m.a === id) { m.a = n; } else { m.b = n; }
    b.wilds.push(n); m.wild = true; s.pool = s.pool.map((x) => (x === id ? n : x));
  }
  b.purse[by] = Math.max(0, b.purse[by] - R.BUSTER_FINE);
  b.vetoLog.push({ by, id, score: old.r, line: roast });
  for (const p of ['A', 'B'] as PID[]) { const lv = m.live?.[p]; if (lv && !m.wg[p]) b.purse[p] += lv.tok; if (m.wg[p] && m.round > 1) b.purse[p] += m.wg[p]!.tok; } m.live = {}; m.bidEnds = undefined; m.wg = {}; m.busting = null; m.status = 'VOTING_ACTIVE'; s.orson = { ...s.orson, line: roast, n: s.orson.n + 1 };
  s.log.unshift(`Bracket Buster: ${old.t} is out${inn ? `, ${inn.x.t} storms in.` : '.'} ${s.players[by].name} pays ${R.BUSTER_FINE} tokens.`);
}

/** Server clock: Hit List reveal, bracket advance, trivia timeout, stuck Bracket Buster. Returns true if the phase machine moved on. */
export function tick8(s: State, now: number) {
  if (s.phase === 'hitlist' && s.hit) {
    if (!s.hit.res && now >= s.hit.endsAt) resolveHit(s, now);
    else if (s.hit.res && now >= s.hit.res.until) buildBracket(s, now);
    return;
  }
  const b = s.b8; if (!b || s.phase !== 'bracket') return;
  if (b.show) {
    const kd = b.show.kind; const wait = kd === 'explain' || kd === 'rank'; const early = (wait || kd === 'champ' || kd === 'calls' || kd === 'round' || kd === 'seed') && !!b.ack && b.ack.A && b.ack.B;
    // seed + round pages wait for both players to tap READY (the timeline is only the reveal beats; 90s safety fallback)
    if (!early && now < b.show.until + (kd === 'round' || kd === 'seed' ? 90000 : 0)) return;
    if (b.show.kind === 'explain') { b.ack = { A: false, B: false }; b.show = { until: now + R.HOLD_MS, kind: 'rank', round: 0 }; return; }
    if (b.show.kind === 'rank') { b.ack = { A: false, B: false }; b.show = { until: now + R.SEED_MS, kind: 'seed', round: 0 }; return; }
    const k = b.show; b.show = null;
    if (k.kind === 'seed' && b.calls) { b.ack = { A: false, B: false }; b.show = { until: now + R.CHAMP_MS, kind: 'champ', round: 0 }; return; }
    if (k.kind === 'champ') { callsShow(b, b.matches[0].round, now); return; }
    if (k.kind === 'round') { b.cur++; const nr = b.matches[b.cur].round; if (nr !== k.round && b.calls) { callsShow(b, nr, now); return; } }
    startMatch(s, b, now); return;
  }
  const m = b.matches[b.cur]; if (!m) return;
  if (m.status === 'VOTING_ACTIVE' && m.round === 1 && !m.trivia && m.endsAt && now >= m.endsAt) {
    const hi = m.seedA < m.seedB ? (m.a as number) : (m.b as number);
    for (const p of ['A', 'B'] as PID[]) if (!m.wg[p]) m.wg[p] = { id: hi, tok: 0 };
    settle(s, m, now); return;
  }
  if (m.status === 'VOTING_ACTIVE' && m.round > 1 && !m.trivia && m.bidEnds && now >= m.bidEnds) {
    for (const p of ['A', 'B'] as PID[]) if (!m.wg[p] && m.live?.[p]) m.wg[p] = m.live[p];
    settle(s, m, now); return;
  }
  if (m.status === 'LOCKED_FOR_VETO' && m.busting && now - m.busting.at > R.BUSTER_MAX_MS) bustDone(s, 'Orson is lost for words. The wildcard walks in anyway.', now);
  if (m.status === 'VOTING_ACTIVE' && m.trivia && now >= m.trivia.endsAt) triviaTimeout(s, m, now);
  if (m.status === 'RESOLVED' && m.nextAt && now >= m.nextAt) advance8(s, now);
}

function advance8(s: State, now: number) {
  const b = s.b8 as B8; const m = b.matches[b.cur];
  const feed = (to: number, side: 'a' | 'b', id: number) => { const t = b.matches[to]; t[side] = id; if (side === 'a') t.seedA = b.seed[id]; else t.seedB = b.seed[id]; };
  if (m.round === 2) { const j = m.slot - b.base; feed(b.base + 4 + (j >> 1), j % 2 === 0 ? 'a' : 'b', m.winner as number); }
  else if (m.round === 3) feed(b.base + 6, (m.slot - b.base) === 4 ? 'a' : 'b', m.winner as number);
  if (b.cur < b.matches.length - 1) {
    m.nextAt = null; const nx = b.matches[b.cur + 1];
    // bracket, matchup, bracket, matchup: the full bracket returns after EVERY match (longer at the end of a round)
    b.ack = { A: false, B: false }; b.show = { until: now + (nx.round !== m.round ? R.REVEAL_MS : m.round === 1 ? R.SHOW_BLITZ : R.SHOW_MATCH), kind: 'round', round: m.round, line: introLine(s, nx)?.line }; return;
  }
  // Final decided: Orson takes over the screen to crown it (script written server-side; winner is fixed by the bracket)
  const w = m.winner as number; const l = w === m.a ? (m.b as number) : (m.a as number);
  s.phase = 'final'; s.fin = { ...s.fin, a: w, b: l, choice: {}, pitchEnds: now, judging: true, judgeRequested: false, verdict: null, forced: w, rematchUsed: false, loser: null, wpid: null, tie: false };
}

export function rerollVote(s: State, it: { pid: PID; yes: boolean }, now: number) {
  const r = s.reroll; if (!r || r.stage !== 'ask' || r.votes[it.pid] !== undefined) return;
  r.votes[it.pid] = it.yes;
  // NUCLEAR VETO needs BOTH partners to hate the crowned film. Either one keeping it ends the gamble.
  if (!it.yes) { r.stage = 'done'; s.log.unshift(`${s.players[it.pid].name} kept the winner`); return; }
  if (r.votes.A && r.votes.B) { s.reroll = { ...r, stage: 'tropes', tropes: [], pk: {}, uv: {}, ult: null, at: now }; s.log.unshift('Both pressed the NUCLEAR VETO: Genre Gauntlet'); }
}
export function nukeTropes(s: State, it: { pid: PID; tropes: string[] }, now: number) {
  const r = s.reroll; if (r.stage !== 'tropes' || r.pk?.[it.pid]) return;
  const picks = Array.from(new Set(it.tropes.filter((x) => (TROPE_NAMES as readonly string[]).includes(x)))).slice(0, 3); if (picks.length !== 3) return;
  r.pk = { ...(r.pk || {}), [it.pid]: picks };
  if (r.pk.A && r.pk.B) { r.tropes = [...r.pk.A, ...r.pk.B]; r.stage = 'wait'; r.at = now; }
}
export function nukeUlt(s: State, it: { ult: Ult }) {
  const r = s.reroll; if (r.stage !== 'wait') return;
  const ok = new Set(nukeCands(s, 60).map((x) => x.id));
  let u = it.ult; if (!u || !ok.has(u.titan?.id) || !ok.has(u.gem?.id) || u.titan.id === u.gem.id) u = { ...nukeFallback(s), rant: (u && u.rant) || nukeFallback(s).rant };
  if (!u.titan.id || !u.gem.id) { r.stage = 'done'; return; }
  r.ult = { rant: u.rant.slice(0, 260), titan: { id: u.titan.id, why: u.titan.why.slice(0, 160) }, gem: { id: u.gem.id, why: u.gem.why.slice(0, 160) } }; r.stage = 'pick';
}
export function nukePick(s: State, it: { pid: PID; which: 'titan' | 'gem' | 'keep' }) {
  const r = s.reroll; if (r.stage !== 'pick' || !r.ult || r.uv?.[it.pid]) return;
  r.uv = { ...(r.uv || {}), [it.pid]: it.which };
  if (!r.uv.A || !r.uv.B) return;
  r.stage = 'done';
  // take it or leave it: both must name the same film, otherwise the crowned winner stands
  if (r.uv.A !== r.uv.B || r.uv.A === 'keep') { s.log.unshift('Nuclear veto defused: original winner stays'); return; }
  const which = r.uv.A; const id = r.ult[which].id; r.to = id; r.used = true; s.winner = id; s.b8Bonus = { A: 1, B: 1 };
  s.fin.verdict = { winner: id, reason: `You both took the ${which === 'titan' ? 'BLOCKBUSTER' : 'HIDDEN GEM'}. ${BY_ID[id].t} it is. Next game you both start with 10 extra hype tokens.` };
  s.log.unshift(`Nuclear veto: ${BY_ID[id].t} (${which})`);
}
