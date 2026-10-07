// PRD phases 2-4: The Hit List, the 8-seed March Madness bracket, upset multipliers, Bracket Buster, sudden-death trivia, accept-or-reroll.
// Pure state transitions; game.ts's reducer calls these. Tunable rules live in R.
import { BY_ID, poolOf, pickWildcards, vecOf, wdist, seeded, type PID, type State, type Movie } from './game';

export const R = {
  HIT_MS: 15000, HIT_REVEAL_MS: 5200, GRID_EACH: 8, GRID_MIN: 18, GRID_MAX: 18, BRACKET: 16, MAX_WILD_IN_BRACKET: 4, BLITZ_MS: 8000, CHAMP_MS: 20000, CALLS_MS: [26000, 18000, 12000, 9000], CALL_BONUS: [1, 2, 3, 5], REVEAL_MS: 14000, SEED_MS: 9000, HOLD_MS: 900000, SHOW_BLITZ: 6500, SHOW_MATCH: 9000,
  PURSE: 50, FREE_WEIGHT: 10, OVERDRIVE: 1.2, UPSET_GAP: 3, UPSET_MULT: 2, BUSTER_FINE: 10, BUSTER_MAX_MS: 14000, TRIVIA_MS: 15000, NEXT_MS: 5500,
};

export type HitWeap = { veto: number | null; shields: number[]; done: boolean };
export type HitRes = { dead: number[]; blocked: { by: PID; id: number }[]; mocked: number | null; shield: Record<number, PID>; cut: number[]; until: number };
export type Hit = { endsAt: number; grid: number[]; owner: Record<number, 'A' | 'B' | 'AB' | 'O'>; weap: { A: HitWeap; B: HitWeap }; shieldsAllowed: { A: number; B: number }; res: HitRes | null };
export type Trivia = { q: string; opts: string[]; ans: number; endsAt: number; locked: { A?: boolean; B?: boolean }; winner: PID | null };
export type M8 = {
  id: string; round: 1 | 2 | 3 | 4; slot: number; a: number | null; b: number | null; seedA: number; seedB: number;
  status: 'PENDING' | 'VOTING_ACTIVE' | 'LOCKED_FOR_VETO' | 'RESOLVED';
  wg: { A?: { id: number; tok: number }; B?: { id: number; tok: number } };
  winner: number | null; via: string | null; wild: boolean; trivia: Trivia | null; busting: { by: PID; id: number; at: number } | null; nextAt: number | null; bust?: string; endsAt?: number; calledBy?: PID[];
};
export type B8 = {
  matches: M8[]; cur: number; seed: Record<number, number>; shield: Record<number, PID>; purse: { A: number; B: number };
  buster: { A: boolean; B: boolean }; upsets: { winner: number; loser: number; gap: number }[]; vetoLog: { by: PID; id: number; score: number; line?: string }[];
  wilds: number[]; backed: { A: number; B: number }; bonus: { A: number; B: number };
  show?: { until: number; kind: 'explain' | 'rank' | 'seed' | 'champ' | 'calls' | 'round'; round: number; line?: string } | null; ack?: { A: boolean; B: boolean }; calls?: Calls;
};
export type Calls = { champ: { A?: number; B?: number }; pick: { A: Record<number, number>; B: Record<number, number> }; score: { A: number; B: number }; streak: { A: number; B: number } };
export type Reroll = { stage: 'off' | 'ask' | 'done'; votes: { A?: boolean; B?: boolean }; used: boolean; to: number | null };

const sc = (m: Movie) => (m.rt ?? m.r * 10) / 100;
const other = (p: PID): PID => (p === 'A' ? 'B' : 'A');
export const tm8 = (id: number) => BY_ID[id].t;

/** Called when both drafts are locked: build the Hit List grid (each player's first 5 picks, i.e. fastest swipes, plus Orson wildcards). */
export function startHit(s: State, now: number) {
  const A = s.draft.picks.A.slice(0, R.GRID_EACH), B = s.draft.picks.B.slice(0, R.GRID_EACH);
  const own: number[] = Array.from(new Set([...A, ...B]));
  const owner: Hit['owner'] = {};
  for (const id of own) owner[id] = A.includes(id) && B.includes(id) ? 'AB' : A.includes(id) ? 'A' : 'B';
  const nWild = Math.max(2, Math.min(R.GRID_MAX - own.length, R.GRID_MIN - own.length));
  const wild = pickWildcards(new Set([...own, ...s.draft.picks.A, ...s.draft.picks.B, ...s.vetoed]), s.vibe.target || [5, 5, 5, 5], Math.max(2, nWild), s.code, s.kind).slice(0, Math.max(2, R.GRID_MAX - own.length));
  for (const id of wild) owner[id] = 'O';
  const grid = [...own, ...wild];
  const bonus = s.b8Bonus || { A: 0, B: 0 };
  s.hit = { endsAt: now + R.HIT_MS, grid, owner, weap: { A: { veto: null, shields: [], done: false }, B: { veto: null, shields: [], done: false } }, shieldsAllowed: { A: 1 + bonus.A, B: 1 + bonus.B }, res: null };
  s.phase = 'hitlist'; s.pool = grid;
  s.log.unshift(`The Hit List: ${grid.length} titles, 15 seconds, one Veto and one Silver Bullet each.`);
}

export function hitIntent(s: State, it: { pid: PID; veto?: number | null; shield?: number | null; done?: boolean }, now: number) {
  const h = s.hit; if (!h || s.phase !== 'hitlist' || h.res) return;
  const w = h.weap[it.pid]; if (w.done) return;
  if (it.veto !== undefined) { if (it.veto === null || (h.grid.includes(it.veto) && h.owner[it.veto] !== it.pid && h.owner[it.veto] !== 'AB')) w.veto = it.veto; }
  if (it.shield !== undefined && it.shield !== null) {
    const id = it.shield; const o = h.owner[id];
    if (h.grid.includes(id) && (o === it.pid || o === 'AB')) { w.shields = w.shields.includes(id) ? w.shields.filter((x) => x !== id) : [...w.shields, id].slice(-h.shieldsAllowed[it.pid]); }
  }
  if (it.done) w.done = true;
  if (h.weap.A.done && h.weap.B.done) resolveHit(s, now);
}

export function resolveHit(s: State, now: number) {
  const h = s.hit; if (!h || h.res) return;
  const shield: Record<number, PID> = {};
  for (const p of ['A', 'B'] as PID[]) for (const id of h.weap[p].shields) if (!shield[id]) shield[id] = p;
  const dead: number[] = []; const blocked: HitRes['blocked'] = [];
  for (const p of ['A', 'B'] as PID[]) { const v = h.weap[p].veto; if (v === null) continue; if (shield[v]) blocked.push({ by: p, id: v }); else if (!dead.includes(v)) dead.push(v); }
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
  let surv = h.grid.filter((id) => !res.dead.includes(id));
  const score = (id: number) => seedScore(s, id);
  // cut to 8: shielded titles are protected, Orson wildcards capped at 3, lowest seeding score goes first
  const prot = new Set(Object.keys(res.shield).map(Number));
  // every player's top picks (draft order) are protected from the cut so each person's films always reach the bracket
  for (const p of ['A', 'B'] as PID[]) for (const id of s.draft.picks[p].slice(0, 6)) if (surv.includes(id)) prot.add(id);
  const wilds = () => surv.filter((id) => h.owner[id] === 'O');
  while (wilds().length > R.MAX_WILD_IN_BRACKET && surv.length > 0) { const w = wilds().filter((x) => !prot.has(x)).sort((a, b) => score(a) - score(b))[0]; if (w === undefined) break; surv = surv.filter((x) => x !== w); }
  while (surv.length > R.BRACKET) { const c = surv.filter((x) => !prot.has(x)).sort((a, b) => (h.owner[b] === 'O' ? 1 : 0) - (h.owner[a] === 'O' ? 1 : 0) || score(a) - score(b))[0]; if (c === undefined) break; surv = surv.filter((x) => x !== c); }
  if (surv.length < R.BRACKET) { // too many deaths: top up with extra wildcards
    const extra = pickWildcards(new Set([...surv, ...h.grid, ...s.vetoed, ...s.draft.picks.A, ...s.draft.picks.B]), s.vibe.target || [5, 5, 5, 5], R.BRACKET - surv.length + 2, s.code + 'top', s.kind);
    for (const id of extra) { if (surv.length >= R.BRACKET) break; surv.push(id); h.owner[id] = 'O'; }
  }
  const ranked = [...surv].sort((a, b) => score(b) - score(a) || a - b);
  const seed: Record<number, number> = {}; ranked.forEach((id, i) => { seed[id] = i + 1; });
  const at = (n: number) => ranked[n - 1];
  const mk = (id: string, round: 1 | 2 | 3 | 4, slot: number, a: number | null, b: number | null): M8 => ({ id, round, slot, a, b, seedA: a ? seed[a] : 0, seedB: b ? seed[b] : 0, status: 'PENDING', wg: {}, winner: null, via: null, wild: false, trivia: null, busting: null, nextAt: null });
  const PAIRS: [number, number][] = [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]];
  const ms: M8[] = PAIRS.map(([x, y], k) => mk('r' + k, 1, k, at(x), at(y)));
  for (let k = 0; k < 4; k++) ms.push(mk('q' + k, 2, 8 + k, null, null));
  ms.push(mk('s0', 3, 12, null, null), mk('s1', 3, 13, null, null), mk('f1', 4, 14, null, null));
  const bonus = s.b8Bonus || { A: 0, B: 0 };
  s.b8 = { matches: ms, cur: 0, seed, shield: res.shield, purse: { A: R.PURSE, B: R.PURSE }, buster: { A: true, B: true }, upsets: [], vetoLog: (s as { _vl?: B8['vetoLog'] })._vl || [], wilds: surv.filter((x) => h.owner[x] === 'O'), backed: { A: 0, B: 0 }, bonus, show: { until: now + R.HOLD_MS, kind: 'explain', round: 0 }, ack: { A: false, B: false }, calls: { champ: {}, pick: { A: {}, B: {} }, score: { A: 0, B: 0 }, streak: { A: 0, B: 0 } } };
  delete (s as { _vl?: unknown })._vl;
  s.pool = ranked; s.phase = 'bracket';
  s.log.unshift(`Bracket set: ${BY_ID[at(1)].t} is the number one seed.`);
}

const say8 = (s: State, line: string, mood: 'smug' | 'shock' | 'glee' | 'scheme' = 'smug') => { s.orson = { ...s.orson, line, mood, n: s.orson.n + 1 }; };
const NAMES = ['Round of 16', 'Quarterfinal', 'Semifinal', 'The Final'];
/** Matchup commentary: written from the seeds, ratings and shields so every bout gets its own billing. */
function introLine(s: State, m: M8): { line: string; mood: 'smug' | 'scheme' } | null {
  const b = s.b8; if (!b || m.a === null || m.b === null) return null; const A = BY_ID[m.a], B = BY_ID[m.b]; const gap = Math.abs(m.seedA - m.seedB);
  const hi = m.seedA < m.seedB ? A : B, lo = hi === A ? B : A; const sh = b.shield[m.a] || b.shield[m.b];
  const pool = m.round === 4 ? [`THE FINAL. ${A.t} against ${B.t}. Everything you have ever agreed on comes down to this.`, `Two titles left. One of you is about to be very smug. ${A.t} versus ${B.t}.`]
    : gap >= 8 ? [`#${m.seedA < m.seedB ? m.seedA : m.seedB} ${hi.t} against #${Math.max(m.seedA, m.seedB)} ${lo.t}. David and Goliath, except David has a worse trailer.`, `${lo.t} was not supposed to be here. Neither was I, but here we are.`]
    : gap <= 1 ? [`${A.t} against ${B.t}. Practically twins. Pick carefully, one of you is wrong.`, `Neck and neck: #${m.seedA} against #${m.seedB}. Hearts will break.`]
    : sh ? [`${A.t} versus ${B.t}. One of them is wearing a Gold Shield. Cheating, but legal.`]
    : [`${NAMES[m.round - 1]}: #${m.seedA} ${A.t} versus #${m.seedB} ${B.t}. Choose violently.`, `${A.t} meets ${B.t}. Rated ${A.r.toFixed(1)} and ${B.r.toFixed(1)}. Taste is subjective, and you are both wrong.`];
  return { line: pool[Math.abs(m.slot * 7 + s.code.length) % pool.length], mood: gap >= 8 || m.round === 4 ? 'scheme' : 'smug' };
}
function intro8(s: State, m: M8) { const l = introLine(s, m); if (l) say8(s, l.line, l.mood); }
const MATCH_WEIGHT = (m: M8, p: PID, tok: number) => (m.round === 1 ? R.FREE_WEIGHT : tok);

export function wagerIntent(s: State, it: { pid: PID; id: number; tok: number }, now: number) {
  const b = s.b8; if (!b || s.phase !== 'bracket') return; const m = b.matches[b.cur];
  if (!m || m.status !== 'VOTING_ACTIVE' || m.wg[it.pid] || (it.id !== m.a && it.id !== m.b)) return;
  let tok = 0;
  if (m.round > 1) { tok = Math.max(1, Math.min(Math.floor(it.tok || 1), b.purse[it.pid])); if (b.purse[it.pid] < 1) tok = 0; if (tok === 0) tok = 0; b.purse[it.pid] -= tok; }
  m.wg[it.pid] = { id: it.id, tok };
  if (m.wg.A && m.wg.B) settle(s, m, now);
}

export function bars(b: B8, m: M8) {
  const t = (id: number | null) => (['A', 'B'] as PID[]).reduce((n, p) => n + (m.wg[p] && m.wg[p]!.id === id ? MATCH_WEIGHT(m, p, m.wg[p]!.tok) : 0), 0) * (id !== null && b.shield[id] ? R.OVERDRIVE : 1);
  return { a: t(m.a), b: t(m.b) };
}

function settle(s: State, m: M8, now: number) {
  const b = s.b8 as B8; const br = bars(b, m);
  if (br.a === br.b && m.round === 1) { finish(s, m, m.seedA < m.seedB ? (m.a as number) : (m.b as number), 'dead heat, the higher seed takes it', now); return; }
  if (br.a === br.b) { startTrivia(s, m, now); return; }
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
    if (m.round === 4 && cl.champ[p] === winner) { s.b8Bonus = { ...(s.b8Bonus || { A: 0, B: 0 }), [p]: ((s.b8Bonus || { A: 0, B: 0 })[p] || 0) + 1 }; s.log.unshift(`${s.players[p].name} called the champion. Silver Bullet next game.`); }
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
export function ackIntent(s: State, it: { pid: PID }) { const b = s.b8; if (!b || !b.show || !['explain', 'rank', 'champ', 'calls'].includes(b.show.kind)) return; b.ack = { ...(b.ack || { A: false, B: false }), [it.pid]: true }; }

export function bustIntent(s: State, it: { pid: PID; id: number }, now: number) {
  const b = s.b8; if (!b || s.phase !== 'bracket') return; const m = b.matches[b.cur];
  if (!m || m.round === 1 || m.status !== 'VOTING_ACTIVE' || m.trivia || !b.buster[it.pid] || (it.id !== m.a && it.id !== m.b) || b.shield[it.id]) return;
  b.buster[it.pid] = false; m.status = 'LOCKED_FOR_VETO'; m.busting = { by: it.pid, id: it.id, at: now };
  s.log.unshift(`${s.players[it.pid].name} used the Bracket Buster on ${BY_ID[it.id].t}.`);
}
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
  m.bust = roast; m.wg = {}; m.busting = null; m.status = 'VOTING_ACTIVE'; s.orson = { ...s.orson, line: roast, n: s.orson.n + 1 };
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
    const kd = b.show.kind; const wait = kd === 'explain' || kd === 'rank'; const early = (wait || kd === 'champ' || kd === 'calls') && !!b.ack && b.ack.A && b.ack.B;
    if (!early && now < b.show.until) return;
    if (b.show.kind === 'explain') { b.ack = { A: false, B: false }; b.show = { until: now + R.HOLD_MS, kind: 'rank', round: 0 }; return; }
    if (b.show.kind === 'rank') { b.show = { until: now + R.SEED_MS, kind: 'seed', round: 0 }; return; }
    const k = b.show; b.show = null;
    if (k.kind === 'seed' && b.calls) { b.ack = { A: false, B: false }; b.show = { until: now + R.CHAMP_MS, kind: 'champ', round: 0 }; return; }
    if (k.kind === 'champ') { callsShow(b, 1, now); return; }
    if (k.kind === 'round') { b.cur++; const nr = b.matches[b.cur].round; if (nr !== k.round && b.calls) { callsShow(b, nr, now); return; } }
    startMatch(s, b, now); return;
  }
  const m = b.matches[b.cur]; if (!m) return;
  if (m.status === 'VOTING_ACTIVE' && m.round === 1 && !m.trivia && m.endsAt && now >= m.endsAt) {
    const hi = m.seedA < m.seedB ? (m.a as number) : (m.b as number);
    for (const p of ['A', 'B'] as PID[]) if (!m.wg[p]) m.wg[p] = { id: hi, tok: 0 };
    settle(s, m, now); return;
  }
  if (m.status === 'LOCKED_FOR_VETO' && m.busting && now - m.busting.at > R.BUSTER_MAX_MS) bustDone(s, 'Orson is lost for words. The wildcard walks in anyway.', now);
  if (m.status === 'VOTING_ACTIVE' && m.trivia && now >= m.trivia.endsAt) triviaTimeout(s, m, now);
  if (m.status === 'RESOLVED' && m.nextAt && now >= m.nextAt) advance8(s, now);
}

function advance8(s: State, now: number) {
  const b = s.b8 as B8; const m = b.matches[b.cur];
  const feed = (to: number, side: 'a' | 'b', id: number) => { const t = b.matches[to]; t[side] = id; if (side === 'a') t.seedA = b.seed[id]; else t.seedB = b.seed[id]; };
  if (m.round === 1) feed(8 + (m.slot >> 1), m.slot % 2 === 0 ? 'a' : 'b', m.winner as number);
  else if (m.round === 2) { const j = m.slot - 8; feed(12 + (j >> 1), j % 2 === 0 ? 'a' : 'b', m.winner as number); }
  else if (m.round === 3) feed(14, m.slot === 12 ? 'a' : 'b', m.winner as number);
  if (b.cur < 14) {
    m.nextAt = null; const nx = b.matches[b.cur + 1];
    // bracket, matchup, bracket, matchup: the full bracket returns after EVERY match (longer at the end of a round)
    b.show = { until: now + (nx.round !== m.round ? R.REVEAL_MS : m.round === 1 ? R.SHOW_BLITZ : R.SHOW_MATCH), kind: 'round', round: m.round, line: introLine(s, nx)?.line }; return;
  }
  // Final decided: Orson takes over the screen to crown it (script written server-side; winner is fixed by the bracket)
  const w = m.winner as number; const l = w === m.a ? (m.b as number) : (m.a as number);
  s.phase = 'final'; s.fin = { ...s.fin, a: w, b: l, choice: {}, pitchEnds: now, judging: true, judgeRequested: false, verdict: null, forced: w, rematchUsed: false, loser: null, wpid: null, tie: false };
}

export function rerollVote(s: State, it: { pid: PID; yes: boolean }, now: number) {
  const r = s.reroll; if (!r || r.stage !== 'ask' || r.votes[it.pid] !== undefined) return; r.votes[it.pid] = it.yes;
  if (r.votes.A === undefined || r.votes.B === undefined) return;
  r.stage = 'done';
  if (r.votes.A && r.votes.B) {
    const used = new Set<number>([...s.pool, ...s.vetoed, ...Object.keys(s.b8?.seed || {}).map(Number)]);
    const t = s.vibe.target || [5, 5, 5, 5];
    const inn = poolOf(s.kind).filter((x) => !used.has(x.id) && x.r >= 7).map((x) => ({ x, sc: x.r - wdist(vecOf(x), t) * 0.15 })).sort((a, c) => c.sc - a.sc || a.x.id - c.x.id)[0];
    if (inn) { r.to = inn.x.id; r.used = true; s.winner = inn.x.id; s.b8Bonus = { A: 1, B: 1 }; s.fin.verdict = { winner: inn.x.id, reason: `You threw it away. Fine. ${inn.x.t} it is. I will see you both next time with a Silver Bullet each.` }; s.log.unshift(`Reroll accepted: Orson picks ${inn.x.t}.`); }
  }
}
