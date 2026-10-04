// CINESYNC game engine: a pure reducer. The host phone runs it; everyone else sends intents.
import catalog from '@/data/catalog.json';

export type PID = 'A' | 'B';
export type Movie = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; w: boolean; pop: number };
export const MOVIES: Movie[] = (catalog as { movies: Movie[] }).movies;
export const BY_ID: Record<number, Movie> = Object.fromEntries(MOVIES.map((m) => [m.id, m]));
export const poster = (m: Movie, size = 'w342') => `https://image.tmdb.org/t/p/${size}${m.p}`;

export const RESPONSE_GATE = 0.6;
export const TAP_MS = 10000;
export const PITCH_MS = 60000;
export const NEXT_MS = 2200;
export const DRAFT_SIZE = 10;
export const POOL_SIZE = 30;

// ---------- Phase 1: vibe questions (two sets, so a retry is a genuinely new conversation)
export type Question = { q: string; opts: [string, string, string, string] };
export const QUESTION_SETS: Question[][] = [
  [
    { q: 'Tonight your pulse should be...', opts: ['Resting', 'Gently ticking', 'Racing a bit', 'Full sprint'] },
    { q: 'Pick the mood you can stomach.', opts: ['Pure laughs', 'Light with heart', 'Serious with edges', 'Dark and heavy'] },
    { q: 'Which world are we visiting?', opts: ['Real life', 'Real, but heightened', 'Strange and stylish', 'Pure fantasy or space'] },
    { q: 'Pacing?', opts: ['Slow burn, quiet talk', 'Steady story', 'Punchy', 'Big loud spectacle'] },
  ],
  [
    { q: 'Be honest: how much energy do you have left?', opts: ['Nap-adjacent', 'Some', 'Decent', 'Bring it on'] },
    { q: 'You want to leave the film feeling...', opts: ['Warm and giggly', 'Moved', 'Rattled', 'Wrecked in a good way'] },
    { q: 'Reality check?', opts: ['Keep it grounded', 'Mostly grounded', 'Bend the rules', 'Rules are for losers'] },
    { q: 'Scale of the thing?', opts: ['Intimate', 'Human sized', 'Epic-ish', 'Planet-sized'] },
  ],
];
export const ORSON_REACTIONS = ['Noted. I will not judge. Out loud.', 'Interesting. Your partner will find that very interesting.', 'Bold. Locking it in.', 'Sure. Cinema forgives all.'];

// genre -> [energy, tone(dark), world(fantasy), scale]
const GV: Record<string, number[]> = {
  Action: [3, 1.5, 1.5, 3], Adventure: [2.5, 1, 2.5, 3], Animation: [1.5, 0.5, 3, 2], Comedy: [1.5, 0, 0.5, 1.5], Crime: [2, 2.5, 0.5, 1.5],
  Documentary: [1, 1.5, 0, 0.5], Drama: [1, 2.5, 0, 0.5], Family: [1, 0.5, 2, 1.5], Fantasy: [2, 1, 3, 2.5], History: [1, 2.5, 0, 1.5], Horror: [3, 3, 1.5, 1.5],
  Music: [1, 1, 0.5, 1.5], Mystery: [2, 2.5, 0.5, 1], Romance: [0.5, 0.5, 0.5, 1], 'Science Fiction': [2.5, 2, 3, 3], Thriller: [3, 2.5, 0.5, 1.5], War: [2.5, 3, 0, 2.5], Western: [2, 2, 0, 1.5],
};
const vecOf = (m: Movie) => {
  const vs = m.g.map((g) => GV[g]).filter(Boolean);
  if (!vs.length) return [1.5, 1.5, 1.5, 1.5];
  return [0, 1, 2, 3].map((i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);
};
const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

// ---------- state
export type Matchup = { id: string; a: number; b: number; votes: { A?: number; B?: number }; tap: { until: number; A: number; B: number } | null; winner: number | null; via: string | null; nextAt: number | null };
export type State = {
  code: string; v: number; now: number;
  phase: 'lobby' | 'vibe' | 'draft' | 'bracket' | 'final' | 'done';
  players: { A: { name: string; joined: boolean }; B: { name: string; joined: boolean } };
  vibe: { set: number; ans: { A: (number | null)[]; B: (number | null)[] }; score: number | null; passed: boolean; attempts: number; target: number[] | null };
  draft: { deck: number[]; pitches: Record<number, string>; picks: { A: number[]; B: number[] }; idx: { A: number; B: number }; loading: boolean; requested: boolean };
  pool: number[];
  br: { round: 1 | 2 | 3 | 4; matches: Matchup[]; cur: number; golden: number | null; bullets: { A: boolean; B: boolean }; winners: number[] };
  fin: { a: number; b: number; choice: { A?: number; B?: number }; pitchEnds: number | null; pitch: { A?: string; B?: string }; submitted: { A?: boolean; B?: boolean }; judging: boolean; judgeRequested: boolean; verdict: { winner: number; reason: string } | null };
  winner: number | null;
  cost: { calls: number; inTok: number; outTok: number; usd: number };
  log: string[];
};
export const ROUND_LABEL: Record<number, string> = { 1: 'ROUND 1 · 30 to 15', 2: 'ROUND 2 · 15 to 8 · GOLDEN BYE', 3: 'ROUND 3 · 8 to 4 · SILVER BULLETS', 4: 'SEMIS · 4 to 2' };

export const newState = (code: string): State => ({
  code, v: 0, now: Date.now(), phase: 'lobby',
  players: { A: { name: 'Player 1', joined: false }, B: { name: 'Player 2', joined: false } },
  vibe: { set: 0, ans: { A: [null, null, null, null], B: [null, null, null, null] }, score: null, passed: false, attempts: 0, target: null },
  draft: { deck: [], pitches: {}, picks: { A: [], B: [] }, idx: { A: 0, B: 0 }, loading: false, requested: false },
  pool: [], br: { round: 1, matches: [], cur: 0, golden: null, bullets: { A: true, B: true }, winners: [] },
  fin: { a: 0, b: 0, choice: {}, pitchEnds: null, pitch: {}, submitted: {}, judging: false, judgeRequested: false, verdict: null },
  winner: null, cost: { calls: 0, inTok: 0, outTok: 0, usd: 0 }, log: [],
});

// seeded shuffle so every client sees the same order
export function seeded(code: string, salt: string) {
  let h = 2166136261; for (const c of code + salt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
export function shuffled<T>(arr: T[], code: string, salt: string): T[] {
  const rnd = seeded(code, salt); const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function alignment(a: (number | null)[], b: (number | null)[]): number {
  let s = 0; for (let i = 0; i < 4; i++) s += 1 - Math.abs((a[i] ?? 0) - (b[i] ?? 0)) / 3;
  return s / 4;
}

export function buildDeck(target: number[], code: string): number[] {
  const scored = MOVIES.filter((m) => !m.w).map((m) => ({ id: m.id, s: dist(vecOf(m), target) - 0.2 * (m.r - 6.5) }));
  scored.sort((x, y) => x.s - y.s);
  return shuffled(scored.slice(0, 50).map((x) => x.id), code, 'deck');
}
export function pickWildcards(exclude: Set<number>, target: number[], n: number, code: string): number[] {
  const wild = MOVIES.filter((m) => m.w && !exclude.has(m.id)).sort((a, b) => b.r - a.r || a.id - b.id);
  const top = wild.slice(0, Math.max(n * 3, 30)).map((m) => ({ id: m.id, s: dist(vecOf(m), target) * 0.5 - (BY_ID[m.id].r - 7.5) }));
  top.sort((x, y) => x.s - y.s);
  const out = top.slice(0, n).map((x) => x.id);
  if (out.length < n) for (const m of MOVIES) { if (out.length >= n) break; if (!exclude.has(m.id) && !out.includes(m.id)) out.push(m.id); }
  return out;
}
export function fallbackPitch(id: number): string {
  const m = BY_ID[id]; const first = m.o.split(/(?<=[.!?])\s/)[0] || m.o;
  return first.length > 150 ? first.slice(0, 147) + '...' : first;
}

const mk = (id: string, a: number, b: number): Matchup => ({ id, a, b, votes: {}, tap: null, winner: null, via: null, nextAt: null });
const higher = (a: number, b: number) => (BY_ID[a].r > BY_ID[b].r || (BY_ID[a].r === BY_ID[b].r && a < b) ? a : b);

function pairUp(ids: number[], round: number): Matchup[] {
  const out: Matchup[] = []; for (let i = 0; i + 1 < ids.length; i += 2) out.push(mk(`r${round}m${i / 2}`, ids[i], ids[i + 1])); return out;
}

function startRound(s: State, round: 1 | 2 | 3 | 4, ids: number[]) {
  let list = ids; let golden: number | null = null;
  if (round === 2) { golden = [...ids].sort((a, b) => (higher(a, b) === a ? -1 : 1))[0]; list = ids.filter((x) => x !== golden); }
  s.br = { round, matches: pairUp(shuffled(list, s.code, 'r' + round), round), cur: 0, golden, bullets: round === 3 ? { A: true, B: true } : s.br.bullets, winners: golden ? [golden] : [] };
  if (golden) s.log.unshift(`Golden Bye: ${BY_ID[golden].t} is the top rated film and walks through.`);
}

function finishMatch(s: State, mt: Matchup, winner: number, via: string, now: number) {
  mt.winner = winner; mt.via = via; mt.nextAt = now + NEXT_MS; mt.tap = null;
  s.log.unshift(`${BY_ID[winner].t} beats ${BY_ID[winner === mt.a ? mt.b : mt.a].t} (${via}).`);
}

function advance(s: State, now: number) {
  const br = s.br; const mt = br.matches[br.cur];
  if (!mt || mt.winner === null) return;
  br.winners.push(mt.winner);
  if (br.cur + 1 < br.matches.length) { br.cur++; return; }
  const w = br.winners;
  if (br.round === 1) startRound(s, 2, w);
  else if (br.round === 2) startRound(s, 3, w);
  else if (br.round === 3) startRound(s, 4, w);
  else {
    s.phase = 'final'; s.fin = { ...s.fin, a: w[0], b: w[1] };
  }
  void now;
}

export type Intent =
  | { t: 'join'; pid: PID; name?: string } | { t: 'ans'; pid: PID; q: number; val: number } | { t: 'retry' } | { t: 'begin' }
  | { t: 'pitches'; map: Record<number, string> } | { t: 'draftreq' } | { t: 'swipe'; pid: PID; id: number; yes: boolean }
  | { t: 'vote'; pid: PID; pick: number } | { t: 'tapcount'; pid: PID; n: number } | { t: 'bullet'; pid: PID; id: number }
  | { t: 'fchoice'; pid: PID; id: number } | { t: 'pitch'; pid: PID; text: string; submit?: boolean }
  | { t: 'verdict'; winner: number; reason: string } | { t: 'judgereq' } | { t: 'cost'; inTok: number; outTok: number; usd: number }
  | { t: 'tick'; now: number } | { t: 'reset' };

export function reduce(prev: State, it: Intent): State {
  const s: State = JSON.parse(JSON.stringify(prev)); s.v++;
  const now = (it as { now?: number }).now ?? Date.now(); s.now = now;
  switch (it.t) {
    case 'join': {
      s.players[it.pid] = { name: (it.name || s.players[it.pid].name).slice(0, 14), joined: true };
      if (s.players.A.joined && s.players.B.joined && s.phase === 'lobby') s.phase = 'vibe';
      break;
    }
    case 'ans': {
      if (s.phase !== 'vibe' || s.vibe.passed) break;
      s.vibe.ans[it.pid][it.q] = it.val;
      const A = s.vibe.ans.A, B = s.vibe.ans.B;
      if (A.every((x) => x !== null) && B.every((x) => x !== null)) {
        s.vibe.score = alignment(A, B);
        s.vibe.attempts++;
        if (s.vibe.score >= RESPONSE_GATE) { s.vibe.passed = true; s.vibe.target = [0, 1, 2, 3].map((i) => (((A[i] as number) + (B[i] as number)) / 2)); }
      }
      break;
    }
    case 'retry': if (s.phase === 'vibe' && !s.vibe.passed) { s.vibe.set = (s.vibe.set + 1) % QUESTION_SETS.length; s.vibe.ans = { A: [null, null, null, null], B: [null, null, null, null] }; s.vibe.score = null; } break;
    case 'begin': {
      if (s.phase !== 'vibe' || !s.vibe.passed) break;
      s.phase = 'draft'; s.draft.deck = buildDeck(s.vibe.target as number[], s.code); s.draft.loading = true;
      break;
    }
    case 'draftreq': s.draft.requested = true; break;
    case 'pitches': s.draft.pitches = { ...s.draft.pitches, ...it.map }; s.draft.loading = false; break;
    case 'swipe': {
      if (s.phase !== 'draft' || s.draft.loading) break;
      const picks = s.draft.picks[it.pid];
      if (picks.length >= DRAFT_SIZE) break;
      if (s.draft.deck[s.draft.idx[it.pid]] !== it.id) break;
      s.draft.idx[it.pid]++;
      if (it.yes) picks.push(it.id);
      // deck exhausted without 10: fill with the best unpicked cards
      if (picks.length < DRAFT_SIZE && s.draft.idx[it.pid] >= s.draft.deck.length) {
        for (const id of s.draft.deck) { if (picks.length >= DRAFT_SIZE) break; if (!picks.includes(id)) picks.push(id); }
      }
      if (s.draft.picks.A.length >= DRAFT_SIZE && s.draft.picks.B.length >= DRAFT_SIZE) {
        const union = Array.from(new Set([...s.draft.picks.A, ...s.draft.picks.B]));
        const wild = pickWildcards(new Set(union), s.vibe.target || [1.5, 1.5, 1.5, 1.5], Math.max(10, POOL_SIZE - union.length), s.code);
        s.pool = [...union, ...wild].slice(0, Math.max(POOL_SIZE, union.length + 10));
        s.pool = s.pool.slice(0, POOL_SIZE);
        s.log.unshift(`Pool locked: ${union.length} drafted, ${s.pool.length - union.length} wildcards Orson slipped in.`);
        s.phase = 'bracket'; startRound(s, 1, s.pool);
      }
      break;
    }
    case 'vote': {
      const mt = s.br.matches[s.br.cur]; if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap) break;
      if (it.pick !== mt.a && it.pick !== mt.b) break;
      mt.votes[it.pid] = it.pick;
      if (mt.votes.A !== undefined && mt.votes.B !== undefined) {
        if (mt.votes.A === mt.votes.B) finishMatch(s, mt, mt.votes.A, 'you both agreed', now);
        else mt.tap = { until: now + TAP_MS, A: 0, B: 0 };
      }
      break;
    }
    case 'tapcount': { const mt = s.br.matches[s.br.cur]; if (mt?.tap) mt.tap[it.pid] = Math.max(mt.tap[it.pid], it.n); break; }
    case 'bullet': {
      const mt = s.br.matches[s.br.cur];
      if (s.phase !== 'bracket' || s.br.round !== 3 || !mt || mt.winner !== null || !s.br.bullets[it.pid]) break;
      if (it.id !== mt.a && it.id !== mt.b) break;
      s.br.bullets[it.pid] = false;
      finishMatch(s, mt, it.id === mt.a ? mt.b : mt.a, `${s.players[it.pid].name} fired a Silver Bullet at ${BY_ID[it.id].t}`, now);
      break;
    }
    case 'fchoice': {
      if (s.phase !== 'final') break;
      s.fin.choice[it.pid] = it.id;
      const { A, B } = s.fin.choice;
      if (A !== undefined && B !== undefined) {
        if (A === B) { s.fin.verdict = { winner: A, reason: 'You both picked the same film. No pitch needed. Orson is almost disappointed.' }; s.winner = A; s.phase = 'done'; }
        else s.fin.pitchEnds = now + PITCH_MS;
      }
      break;
    }
    case 'pitch': { if (s.phase !== 'final' || s.fin.verdict) break; s.fin.pitch[it.pid] = it.text.slice(0, 600); if (it.submit) s.fin.submitted[it.pid] = true; break; }
    case 'judgereq': s.fin.judgeRequested = true; break;
    case 'verdict': s.fin.verdict = { winner: it.winner, reason: it.reason }; s.fin.judging = false; s.winner = it.winner; s.phase = 'done'; break;
    case 'cost': s.cost = { calls: s.cost.calls + 1, inTok: s.cost.inTok + it.inTok, outTok: s.cost.outTok + it.outTok, usd: s.cost.usd + it.usd }; break;
    case 'tick': {
      const mt = s.br.matches[s.br.cur];
      if (s.phase === 'bracket' && mt) {
        if (mt.tap && now >= mt.tap.until) {
          const { A, B } = mt.tap; const pa = mt.votes.A as number, pb = mt.votes.B as number;
          if (A === B) finishMatch(s, mt, higher(pa, pb), 'tap-battle tied, higher rated film wins', now);
          else finishMatch(s, mt, A > B ? pa : pb, `tap-battle ${Math.max(A, B)} to ${Math.min(A, B)}`, now);
        } else if (mt.winner !== null && mt.nextAt && now >= mt.nextAt) advance(s, now);
      }
      if (s.phase === 'final' && s.fin.pitchEnds && !s.fin.verdict && !s.fin.judging) {
        if (now >= s.fin.pitchEnds || (s.fin.submitted.A && s.fin.submitted.B)) s.fin.judging = true;
      }
      break;
    }
    case 'reset': return { ...newState(s.code), v: s.v + 1, players: s.players };
  }
  return s;
}
