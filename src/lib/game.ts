// CINESYNC game engine: a pure reducer. The host phone runs it; everyone else sends intents.
import catalog from '@/data/catalog.json';

export type PID = 'A' | 'B';
export type Mood = 'idle' | 'smug' | 'shock' | 'glee' | 'scheme' | 'sad';
export type Movie = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; w: boolean; pop: number; c?: string[]; k?: string; rn?: number; tag?: string; im?: string; kw?: string[]; rt?: number | null; mc?: number | null; imdb?: number | null; aw?: string };
export const MOVIES: Movie[] = (catalog as { movies: Movie[] }).movies;
export const BY_ID: Record<number, Movie> = Object.fromEntries(MOVIES.map((m) => [m.id, m]));
export const poster = (m: Movie, size = 'w342') => `https://image.tmdb.org/t/p/${size}${m.p}`;

export const RESPONSE_GATE = 0.7;
export const CLASH = 5; // an axis gap this big fails the gate on its own
export const TASTES = ['Real events', 'Pure fiction', 'Documentary', 'Sports', 'Artsy', 'Award winner'] as const;
export const AXES = ['Energy', 'Darkness', 'Fantasy', 'Scale'] as const;
export const TAP_MS = 10000;
export const PITCH_MS = 60000;
export const NEXT_MS = 2200;
export const DRAFT_SIZE = 10;
export const POOL_SIZE = 30;

// ---------- Phase 1: vibe questions (two sets, so a retry is a genuinely new conversation)
export type Question = { q: string; lo: string; hi: string };
// Four sliders per set (0-10): energy, darkness, fantasy-vs-real, scale. Last set is the lightning set.
export const QUESTION_SETS: Question[][] = [
  [
    { q: 'Tonight your pulse should be...', lo: 'Resting', hi: 'Full sprint' },
    { q: 'How dark can we go?', lo: 'Pure sunshine', hi: 'Pitch black' },
    { q: 'Which world are we visiting?', lo: 'Real life', hi: 'Pure fantasy or space' },
    { q: 'How big is the story?', lo: 'Kitchen table', hi: 'Planet-sized' },
  ],
  [
    { q: 'Be honest: how much energy is left in the tank?', lo: 'Nap-adjacent', hi: 'Bring it on' },
    { q: 'You want to leave feeling...', lo: 'Warm and giggly', hi: 'Wrecked, in a good way' },
    { q: 'Reality check?', lo: 'Keep it grounded', hi: 'Rules are for losers' },
    { q: 'Scale of the thing?', lo: 'Intimate', hi: 'Epic spectacle' },
  ],
  [
    { q: 'The sofa is calling. Your posture?', lo: 'Horizontal', hi: 'Perched on the edge' },
    { q: 'What kind of villain can you tolerate?', lo: 'None, thanks', hi: 'Pure evil' },
    { q: 'How much make-believe?', lo: 'None at all', hi: 'Dragons, ideally' },
    { q: 'How loud should the speakers get?', lo: 'Whisper', hi: 'Neighbours will hear' },
  ],
  [
    { q: 'How much do you want your heart racing?', lo: 'Not at all', hi: 'Out of my chest' },
    { q: 'Tears or screams?', lo: 'Laughing tears', hi: 'Screams, please' },
    { q: 'Where is the story set?', lo: 'My street', hi: 'Not on this planet' },
    { q: 'Runtime attitude?', lo: 'Short and sweet', hi: 'Make it an event' },
  ],
  [
    { q: 'What is the stress level in this house?', lo: 'Zen', hi: 'Critical' },
    { q: 'Pick a soundtrack.', lo: 'Gentle piano', hi: 'Tense strings and dread' },
    { q: 'Pick a backdrop.', lo: 'A kitchen table', hi: 'A galaxy' },
    { q: 'Ending style?', lo: 'Quiet and sweet', hi: 'Explosive' },
  ],
  [
    { q: 'LIGHTNING. Energy, go.', lo: 'Low', hi: 'Max' },
    { q: 'LIGHTNING. Darkness, go.', lo: 'Sunny', hi: 'Pitch black' },
    { q: 'LIGHTNING. Realism, go.', lo: 'Documentary', hi: 'Fantasy' },
    { q: 'LIGHTNING. Size, go.', lo: 'Tiny', hi: 'Enormous' },
  ],
];
export const ORSON_REACTIONS = ['Noted. I will not judge. Out loud.', 'Interesting. Your partner will find that very interesting.', 'Bold. Locking it in.', 'Sure. Cinema forgives all.', 'A strong choice. Or a cry for help.', 'I have seen worse. Not often.'];
export const ROAST_REACTIONS = ['Ah. A person of questionable taste.', 'Your partner will hear about this.', 'I have filed that under "concerning".', 'Brave, in the way a bin fire is brave.', 'Truly the choice of someone who has stopped trying.', 'I expected less, and still I am let down.'];
export const reactionFor = (roast: boolean, seed: number) => { const l = roast ? ROAST_REACTIONS : ORSON_REACTIONS; return l[Math.abs(seed) % l.length]; };

// genre -> [energy, dark, fantasy, scale], each 0-10
const GV: Record<string, number[]> = {
  Action: [8.5, 5, 4.5, 8], Adventure: [7, 3, 7, 8], Animation: [5, 1.5, 8.5, 5.5], Comedy: [4.5, 0.5, 1.5, 3.5], Crime: [6, 7.5, 1.5, 4],
  Documentary: [3, 4.5, 0, 1.5], Drama: [3, 7, 0.5, 1.5], Family: [3.5, 1, 6, 4], Fantasy: [6, 3, 9, 7.5], History: [3, 7, 0.5, 4.5], Horror: [8.5, 9, 4.5, 3.5],
  Music: [3.5, 2.5, 1.5, 4], Mystery: [5.5, 7, 1.5, 2.5], Romance: [1.5, 1.5, 1, 2.5], 'Science Fiction': [7, 6, 9, 8.5], Thriller: [8.5, 7.5, 1.5, 4], War: [7.5, 9, 0.5, 7.5], Western: [6, 6, 0.5, 4.5],
};
const DARK_KW = ['murder', 'serial killer', 'revenge', 'survival', 'dystopia', 'psychological', 'gore', 'slasher', 'haunted', 'torture', 'kidnapping', 'death', 'violence', 'drug', 'crime boss', 'hitman', 'noir', 'neo-noir', 'cult', 'demon', 'possession', 'war', 'terror', 'psychopath', 'loss of loved one', 'found footage', 'gangster', 'heist'];
const LIGHT_KW = ['musical', 'friendship', 'coming of age', 'cartoon', 'anthropomorphism', 'feel good', 'romantic comedy', 'holiday', 'christmas', 'talking animal', 'family'];
const FANTASY_KW = ['superhero', 'magic', 'witch', 'alien', 'super power', 'anthropomorphism', 'dragon', 'supernatural', 'wizard', 'monster', 'mutant', 'time travel', 'other dimension', 'space', 'talking animal', 'vampire', 'ghost', 'robot'];
const REAL_KW = ['based on true story', 'biography', 'true crime', 'based on a true story', 'docudrama', 'real person'];
const EPIC_KW = ['superhero', 'marvel cinematic universe (mcu)', 'space opera', 'battle', 'epic', 'apocalypse', 'world war ii', 'war'];
const CERT_DARK: Record<string, number> = { 'NC-17': 2, R: 1.3, 'TV-MA': 1.3, 'PG-13': 0, 'TV-14': 0, PG: -1.4, 'TV-PG': -1.4, G: -2.8 };
export function tagsOf(m: Movie): string[] {
  const kw = (m.kw || []).map((k) => k.toLowerCase()).join('|'); const t: string[] = [];
  const real = m.g.includes('Documentary') || m.g.includes('History') || /true story|biography|true crime|real person|based on a true/.test(kw);
  t.push(real ? 'Real events' : 'Pure fiction');
  if (m.g.includes('Documentary')) t.push('Documentary');
  if (/sport|boxing|basketball|football|baseball|soccer|racing|olympic|wrestling|tennis|golf|hockey|formula one/.test(kw) || /sport/i.test(m.o)) t.push('Sports');
  if (/surreal|art house|auteur|independent film|experimental|avant|existential|neo-noir|slow burn/.test(kw) || (m.pop < 40 && m.r >= 7.6 && m.g.includes('Drama'))) t.push('Artsy');
  if (/won \d+ oscar|won an oscar|oscars?\b/i.test(m.aw || '') && /won|nominated/i.test(m.aw || '')) t.push('Award winner');
  return t;
}
export function tasteHits(m: Movie, t: { A: string[] | null; B: string[] | null }, actors: { A: string; B: string }): string[] {
  const mine = tagsOf(m); const out: string[] = [];
  for (const tag of mine) if ((t.A || []).includes(tag) || (t.B || []).includes(tag)) { if (tag !== 'Pure fiction' && tag !== 'Real events') out.push(tag); else if ((t.A || []).includes(tag) !== (t.B || []).includes(tag) || true) out.push(tag); }
  for (const p of ['A', 'B'] as const) { const a = actors[p].trim().toLowerCase(); if (a.length > 2 && (m.c || []).some((c) => c.toLowerCase().includes(a))) out.push('Stars ' + (m.c || []).find((c) => c.toLowerCase().includes(a))); }
  return Array.from(new Set(out));
}
const tasteBonus = (m: Movie, t: { A: string[] | null; B: string[] | null }, actors: { A: string; B: string }) => {
  const tags = tagsOf(m); let b = 0;
  for (const tag of tags) { const a = (t.A || []).includes(tag), c = (t.B || []).includes(tag); b += a && c ? 1.8 : a || c ? 0.7 : 0; }
  const wantReal = [(t.A || []).includes('Real events'), (t.B || []).includes('Real events')], wantFic = [(t.A || []).includes('Pure fiction'), (t.B || []).includes('Pure fiction')];
  if (tags.includes('Real events') && wantFic[0] && wantFic[1]) b -= 2; if (tags.includes('Pure fiction') && wantReal[0] && wantReal[1]) b -= 2;
  for (const p of ['A', 'B'] as const) { const a = actors[p].trim().toLowerCase(); if (a.length > 2 && (m.c || []).some((c) => c.toLowerCase().includes(a))) b += 2.2; }
  return b;
};
const clamp = (x: number) => Math.max(0, Math.min(10, x));
const vcache = new Map<number, number[]>();
export const vecOf = (m: Movie): number[] => {
  const hit = vcache.get(m.id); if (hit) return hit;
  const vs = m.g.map((g) => GV[g]).filter(Boolean);
  const base = vs.length ? [0, 1, 2, 3].map((i) => vs.reduce((s, v) => s + v[i], 0) / vs.length) : [5, 5, 5, 5];
  const kw = (m.kw || []).map((k) => k.toLowerCase()); const has = (l: string[]) => kw.filter((k) => l.some((x) => k.includes(x))).length;
  base[1] += (CERT_DARK[m.k || ''] ?? 0) + Math.min(2, has(DARK_KW) * 0.7) - Math.min(2, has(LIGHT_KW) * 0.7);
  base[2] += Math.min(2.5, has(FANTASY_KW) * 0.9) - Math.min(3, has(REAL_KW) * 1.5);
  base[0] += m.g.includes('Action') || m.g.includes('Thriller') || m.g.includes('Horror') ? 0 : -0.3;
  if (m.rn) base[3] += m.rn > 145 ? 1.2 : m.rn > 125 ? 0.4 : m.rn < 95 ? -0.8 : 0;
  base[3] += Math.min(1.5, has(EPIC_KW) * 0.7);
  const v = base.map(clamp); vcache.set(m.id, v); return v;
};
const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const KID = ['Animation', 'Family'];
// Hard exclusions: films that contradict the shared vibe outright, no matter how well rated.
export function excluded(m: Movie, t: number[]): boolean {
  const kid = m.g.some((g) => KID.includes(g)) || ['G', 'TV-Y', 'TV-G'].includes(m.k || '');
  const toon = m.g.includes('Animation') || (m.kw || []).some((k) => /anthropomorphism|talking animal|cartoon|3d animation/i.test(k));
  const rk = m.k || '';
  if (t[1] >= 6 && (kid || ['PG', 'G', 'TV-PG'].includes(rk))) return true;
  if (t[2] <= 4 && toon) return true;
  if (t[2] <= 3 && (m.kw || []).some((k) => /superhero|super power|talking animal/.test(k.toLowerCase()))) return true;
  if (t[1] <= 3 && (m.g.includes('Horror') || ['R', 'NC-17', 'TV-MA'].includes(rk))) return true;
  if (t[0] >= 7 && vecOf(m)[0] < 4.5) return true;
  if (t[0] <= 3 && vecOf(m)[0] > 8) return true;
  if (t[3] >= 7 && vecOf(m)[3] < 3) return true;
  return false;
}
// 0-100: how well a film fits the shared vibe (for the card)
export const fitPct = (m: Movie, t: number[]) => Math.max(0, Math.min(99, Math.round(100 - dist(vecOf(m), t) * 3.6)));
export const W = [1.15, 1.15, 1, 0.8];
const wdist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + W[i] * (x - b[i]) ** 2, 0));

// ---------- state
export type Matchup = { id: string; a: number; b: number; votes: { A?: number; B?: number }; tap: { until: number; A: number; B: number } | null; winner: number | null; via: string | null; nextAt: number | null };
export type State = {
  code: string; v: number; now: number;
  phase: 'lobby' | 'vibe' | 'draft' | 'bracket' | 'final' | 'done';
  players: { A: { name: string; joined: boolean }; B: { name: string; joined: boolean } };
  vibe: { tastes: { A: string[] | null; B: string[] | null }; actors: { A: string; B: string }; set: number; sets: number[]; ans: { A: (number | null)[]; B: (number | null)[] }; score: number | null; passed: boolean; attempts: number; target: number[] | null; doneAt: number | null };
  draft: { deck: number[]; pitches: Record<number, string>; picks: { A: number[]; B: number[] }; idx: { A: number; B: number }; loading: boolean; requested: boolean; inbox: { A: number[]; B: number[] }; sur: Record<number, PID> };
  pw: { A: { bullet: boolean; veto: boolean; surprise: boolean }; B: { bullet: boolean; veto: boolean; surprise: boolean } };
  vetoed: number[];
  pool: number[];
  br: { round: 1 | 2 | 3 | 4; matches: Matchup[]; cur: number; golden: number | null; bullets: { A: boolean; B: boolean }; winners: number[] };
  fin: { a: number; b: number; choice: { A?: number; B?: number }; pitchEnds: number | null; pitch: { A?: string; B?: string }; submitted: { A?: boolean; B?: boolean }; judging: boolean; judgeRequested: boolean; verdict: { winner: number; reason: string } | null; rematchUsed: boolean; loser: PID | null; wpid: PID | null; tie: boolean };
  winner: number | null;
  roast: boolean;
  mem: { nights: number; ledger: { A: number; B: number }; last: string | null; durable: boolean; recorded: boolean };
  tempt: { to: PID; stage: 'off' | 'offer' | 'done'; accepted: boolean; out: number | null; inn: number | null };
  stats: { caved: { A: number; B: number }; wildWins: number; wildBouts: number };
  cost: { calls: number; inTok: number; outTok: number; usd: number };
  orson: { line: string; mood: Mood; n: number };
  log: string[];
};
export const ROUND_LABEL: Record<number, string> = { 1: 'ROUND 1 · 30 to 15', 2: 'ROUND 2 · 15 to 8 · GOLDEN BYE', 3: 'ROUND 3 · 8 to 4', 4: 'SEMIS · 4 to 2' };

export const newState = (code: string): State => ({
  code, v: 0, now: Date.now(), phase: 'lobby',
  players: { A: { name: 'Player 1', joined: false }, B: { name: 'Player 2', joined: false } },
  vibe: { tastes: { A: null, B: null }, actors: { A: '', B: '' }, set: 0, sets: [0, 0, 0, 0], ans: { A: [null, null, null, null], B: [null, null, null, null] }, score: null, passed: false, attempts: 0, target: null, doneAt: null },
  draft: { deck: [], pitches: {}, picks: { A: [], B: [] }, idx: { A: 0, B: 0 }, loading: false, requested: false, inbox: { A: [], B: [] }, sur: {} },
  pw: { A: { bullet: true, veto: true, surprise: true }, B: { bullet: true, veto: true, surprise: true } }, vetoed: [],
  pool: [], br: { round: 1, matches: [], cur: 0, golden: null, bullets: { A: true, B: true }, winners: [] },
  fin: { a: 0, b: 0, choice: {}, pitchEnds: null, pitch: {}, submitted: {}, judging: false, judgeRequested: false, verdict: null, rematchUsed: false, loser: null, wpid: null, tie: false },
  winner: null, roast: false,
  mem: { nights: 0, ledger: { A: 0, B: 0 }, last: null, durable: false, recorded: false },
  tempt: { to: 'A', stage: 'off', accepted: false, out: null, inn: null },
  stats: { caved: { A: 0, B: 0 }, wildWins: 0, wildBouts: 0},
  cost: { calls: 0, inTok: 0, outTok: 0, usd: 0 }, orson: { line: 'Welcome. I am Orson. I have hosted worse couples. Not many, but some.', mood: 'idle', n: 0 }, log: [],
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
  let s = 0, mx = 0; for (let i = 0; i < 4; i++) { const d = Math.abs((a[i] ?? 0) - (b[i] ?? 0)); s += 1 - d / 10; mx = Math.max(mx, d); }
  s /= 4; return mx >= CLASH ? Math.min(s, RESPONSE_GATE - 0.01) : s;
}
// axes to re-ask after a miss: the clashing ones (gap >= 4), at least the two widest
export function clashAxes(a: (number | null)[], b: (number | null)[]): number[] {
  const d = [0, 1, 2, 3].map((i) => ({ i, d: Math.abs((a[i] ?? 0) - (b[i] ?? 0)) })).sort((x, y) => y.d - x.d);
  const out = d.filter((x) => x.d >= 4).map((x) => x.i); for (const x of d) { if (out.length >= 2) break; if (!out.includes(x.i)) out.push(x.i); }
  return out.sort();
}
export function buildDeck(target: number[], code: string, banned: number[] = [], taste: { A: string[] | null; B: string[] | null } = { A: null, B: null }, actors: { A: string; B: string } = { A: '', B: '' }): number[] {
  const ok = MOVIES.filter((m) => !m.w && !banned.includes(m.id));
  const score = (m: Movie) => wdist(vecOf(m), target) - 0.6 * (m.r - 6.5) - ((m.rt ?? 60) - 60) * 0.012 - tasteBonus(m, taste, actors);
  const good = ok.filter((m) => !excluded(m, target) && m.r >= 5.8).sort((x, y) => score(x) - score(y));
  const rest = ok.filter((m) => !good.includes(m) && !excluded(m, target)).sort((x, y) => score(x) - score(y));
  const ids = [...good, ...rest].slice(0, 50).map((m) => m.id);
  if (ids.length < 30) for (const m of ok.sort((x, y) => score(x) - score(y))) { if (ids.length >= 40) break; if (!ids.includes(m.id)) ids.push(m.id); }
  return shuffled(ids, code, 'deck');
}
export function pickWildcards(exclude: Set<number>, target: number[], n: number, code: string): number[] {
  const wild = MOVIES.filter((m) => m.w && !exclude.has(m.id) && !excluded(m, target)).sort((a, b) => b.r - a.r || a.id - b.id);
  const top = wild.slice(0, Math.max(n * 3, 30)).map((m) => ({ id: m.id, s: dist(vecOf(m), target) * 0.15 - (BY_ID[m.id].r - 7.5) }));
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
  if (mt.votes.A !== undefined && mt.votes.B !== undefined && mt.votes.A !== mt.votes.B) { const loserPid: PID = mt.votes.A === winner ? 'B' : 'A'; s.stats.caved[loserPid]++; }
  if (BY_ID[mt.a].w || BY_ID[mt.b].w) { s.stats.wildBouts++; if (BY_ID[winner].w) s.stats.wildWins++; }
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
  | { t: 'roast'; on: boolean } | { t: 'mem'; nights: number; ledger: { A: number; B: number }; last: string | null; durable: boolean } | { t: 'recorded' }
  | { t: 'tempt'; pid: PID; out: number | null } | { t: 'rematch' }
  | { t: 'taste'; pid: PID; tags: string[]; actor: string } | { t: 'quip'; line: string; mood: Mood } | { t: 'veto'; pid: PID; id: number } | { t: 'surprise'; pid: PID; id: number } | { t: 'bveto'; pid: PID; id: number }
  | { t: 'tick'; now: number } | { t: 'reset' };

function maybeLock(s: State) {
  if (s.draft.picks.A.length >= DRAFT_SIZE && s.draft.picks.B.length >= DRAFT_SIZE) {
    const union = Array.from(new Set([...s.draft.picks.A, ...s.draft.picks.B]));
    const wild = pickWildcards(new Set([...union, ...s.vetoed]), s.vibe.target || [5, 5, 5, 5], Math.max(10, POOL_SIZE - union.length), s.code);
    s.pool = [...union, ...wild].slice(0, Math.max(POOL_SIZE, union.length + 10));
    s.pool = s.pool.slice(0, POOL_SIZE);
    s.log.unshift(`Pool locked: ${union.length} drafted, ${s.pool.length - union.length} wildcards Orson slipped in.`);
    s.phase = 'bracket'; startRound(s, 1, s.pool);
    { const to: PID = seeded(s.code, 'tempt')() < 0.5 ? 'A' : 'B'; const o: PID = to === 'A' ? 'B' : 'A';
      const cand = s.draft.picks[o].filter((x) => !s.draft.picks[to].includes(x));
      s.tempt = { to, stage: cand.length ? 'offer' : 'done', accepted: false, out: null, inn: null }; }
  }
}

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
      s.vibe.ans[it.pid][it.q] = Math.max(0, Math.min(10, Math.round(it.val)));
      const A = s.vibe.ans.A, B = s.vibe.ans.B;
      if (A.every((x) => x !== null) && B.every((x) => x !== null)) {
        s.vibe.score = alignment(A, B); s.vibe.doneAt = now;
        s.vibe.attempts++;
        if (s.vibe.score >= RESPONSE_GATE) { s.vibe.passed = true; s.vibe.target = [0, 1, 2, 3].map((i) => (((A[i] as number) + (B[i] as number)) / 2)); }
      }
      break;
    }
    case 'retry': {
      if (s.phase !== 'vibe' || s.vibe.passed || s.vibe.score === null) break;
      const axes = clashAxes(s.vibe.ans.A, s.vibe.ans.B);
      s.vibe.set = (s.vibe.set + 1) % (QUESTION_SETS.length - 1);
      for (const i of axes) { s.vibe.sets[i] = s.vibe.set; s.vibe.ans.A[i] = null; s.vibe.ans.B[i] = null; }
      s.vibe.score = null; s.vibe.doneAt = null; break;
    }
    case 'begin': {
      if (s.phase !== 'vibe' || !s.vibe.passed || !s.vibe.tastes.A || !s.vibe.tastes.B) break;
      s.phase = 'draft'; s.draft.deck = buildDeck(s.vibe.target as number[], s.code, [], { A: s.vibe.tastes.A, B: s.vibe.tastes.B }, s.vibe.actors); s.draft.loading = true;
      break;
    }
    case 'draftreq': s.draft.requested = true; break;
    case 'pitches': s.draft.pitches = { ...s.draft.pitches, ...it.map }; s.draft.loading = false; break;
    case 'swipe': {
      if (s.phase !== 'draft' || s.draft.loading) break;
      const picks = s.draft.picks[it.pid];
      if (picks.length >= DRAFT_SIZE) break;
      const ib = s.draft.inbox[it.pid];
      if (ib.length) { if (ib[0] !== it.id) break; ib.shift(); if (it.yes && !picks.includes(it.id)) picks.push(it.id); }
      else {
        if (s.draft.deck[s.draft.idx[it.pid]] !== it.id) break;
        s.draft.idx[it.pid]++;
        if (it.yes && !picks.includes(it.id)) picks.push(it.id);
      }
      // deck exhausted without 10: fill with the best unpicked cards
      if (picks.length < DRAFT_SIZE && !ib.length && s.draft.idx[it.pid] >= s.draft.deck.length) {
        for (const id of s.draft.deck) { if (picks.length >= DRAFT_SIZE) break; if (!picks.includes(id)) picks.push(id); }
      }
      maybeLock(s);
      break;
    }
    case 'veto': {
      if (s.phase !== 'draft' || s.draft.loading || !s.pw[it.pid].veto || s.draft.picks[it.pid].length >= DRAFT_SIZE) break;
      const cur = s.draft.inbox[it.pid][0] ?? s.draft.deck[s.draft.idx[it.pid]]; if (cur !== it.id) break;
      s.pw[it.pid].veto = false; s.vetoed.push(it.id);
      for (const p of ['A', 'B'] as PID[]) {
        const pos = s.draft.deck.indexOf(it.id); if (pos >= 0 && pos < s.draft.idx[p]) s.draft.idx[p]--;
        s.draft.picks[p] = s.draft.picks[p].filter((x) => x !== it.id); s.draft.inbox[p] = s.draft.inbox[p].filter((x) => x !== it.id);
      }
      s.draft.deck = s.draft.deck.filter((x) => x !== it.id);
      s.log.unshift(`${s.players[it.pid].name} used a Veto: ${BY_ID[it.id].t} is gone for both of you.`);
      break;
    }
    case 'surprise': {
      if (s.phase !== 'draft' || s.draft.loading || !s.pw[it.pid].surprise) break;
      const picks = s.draft.picks[it.pid]; if (picks.length >= DRAFT_SIZE) break;
      const ib = s.draft.inbox[it.pid]; const cur = ib[0] ?? s.draft.deck[s.draft.idx[it.pid]]; if (cur !== it.id) break;
      s.pw[it.pid].surprise = false;
      if (ib.length) ib.shift(); else s.draft.idx[it.pid]++;
      if (!picks.includes(it.id)) picks.push(it.id);
      const o: PID = it.pid === 'A' ? 'B' : 'A';
      if (s.draft.picks[o].length < DRAFT_SIZE && !s.draft.picks[o].includes(it.id)) { s.draft.inbox[o].push(it.id); s.draft.sur[it.id] = it.pid; }
      s.log.unshift(`${s.players[it.pid].name} played a Surprise on ${s.players[o].name}.`);
      maybeLock(s);
      break;
    }
    case 'bveto': {
      const mt = s.br.matches[s.br.cur];
      if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer' || !s.pw[it.pid].veto) break;
      if (it.id !== mt.a && it.id !== mt.b) break;
      const t = s.vibe.target || [5, 5, 5, 5];
      const inn = MOVIES.filter((m) => m.w && !s.pool.includes(m.id) && !s.vetoed.includes(m.id) && !excluded(m, t)).sort((a, b) => b.r - a.r || a.id - b.id)[0]; if (!inn) break;
      s.pw[it.pid].veto = false; s.vetoed.push(it.id);
      s.pool = s.pool.map((x) => (x === it.id ? inn.id : x)); if (mt.a === it.id) mt.a = inn.id; else mt.b = inn.id; mt.votes = {};
      s.log.unshift(`${s.players[it.pid].name} used a Veto: ${BY_ID[it.id].t} is out, a mystery wildcard takes its seat.`);
      break;
    }
    case 'vote': {
      const mt = s.br.matches[s.br.cur]; if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer') break;
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
      if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer' || !s.pw[it.pid].bullet) break;
      if (it.id !== mt.a && it.id !== mt.b) break;
      s.pw[it.pid].bullet = false;
      finishMatch(s, mt, it.id === mt.a ? mt.b : mt.a, `${s.players[it.pid].name} fired a Silver Bullet at ${BY_ID[it.id].t}`, now);
      break;
    }
    case 'fchoice': {
      if (s.phase !== 'final') break;
      s.fin.choice[it.pid] = it.id;
      const { A, B } = s.fin.choice;
      if (A !== undefined && B !== undefined) {
        if (A === B) { s.fin.verdict = { winner: A, reason: 'You both picked the same film. No pitch needed. Orson is almost disappointed.' }; s.winner = A; s.fin.tie = true; s.phase = 'done'; }
        else s.fin.pitchEnds = now + PITCH_MS;
      }
      break;
    }
    case 'pitch': { if (s.phase !== 'final' || s.fin.verdict) break; s.fin.pitch[it.pid] = it.text.slice(0, 600); if (it.submit) s.fin.submitted[it.pid] = true; break; }
    case 'judgereq': s.fin.judgeRequested = true; break;
    case 'verdict': {
      s.fin.verdict = { winner: it.winner, reason: it.reason }; s.fin.judging = false; s.winner = it.winner; s.phase = 'done';
      const wp: PID = s.fin.choice.A === it.winner ? 'A' : 'B'; s.fin.wpid = wp; s.fin.loser = wp === 'A' ? 'B' : 'A'; s.fin.tie = false; s.mem.recorded = false;
      break;
    }
    case 'roast': s.roast = it.on; break;
    case 'mem': { s.mem = { ...s.mem, nights: it.nights, ledger: it.ledger, last: it.last, durable: it.durable }; if (s.phase === 'lobby' || (s.phase === 'vibe' && s.vibe.attempts === 0)) s.vibe.set = it.nights % (QUESTION_SETS.length - 1); s.vibe.sets = [s.vibe.set, s.vibe.set, s.vibe.set, s.vibe.set]; break; }
    case 'recorded': s.mem.recorded = true; break;
    case 'tempt': {
      if (s.phase !== 'bracket' || s.tempt.stage !== 'offer' || it.pid !== s.tempt.to) break;
      const other: PID = it.pid === 'A' ? 'B' : 'A';
      if (it.out === null || !s.draft.picks[other].includes(it.out) || s.draft.picks[it.pid].includes(it.out) || !s.pool.includes(it.out)) { s.tempt.stage = 'done'; s.log.unshift('Orson made a private offer. It was declined.'); break; }
      const inn = MOVIES.filter((m) => m.w && !s.pool.includes(m.id) && !excluded(m, s.vibe.target || [5, 5, 5, 5])).sort((a, b) => b.r - a.r || a.id - b.id)[0];
      if (!inn) { s.tempt.stage = 'done'; break; }
      s.pool = s.pool.map((x) => (x === it.out ? inn.id : x));
      s.br.matches.forEach((m) => { if (m.winner === null) { if (m.a === it.out) m.a = inn.id; if (m.b === it.out) m.b = inn.id; } });
      s.tempt = { ...s.tempt, stage: 'done', accepted: true, out: it.out, inn: inn.id };
      s.log.unshift(`${s.players[it.pid].name} took Orson's offer: ${BY_ID[it.out].t} is out, a wildcard is in.`);
      break;
    }
    case 'rematch': {
      if (s.phase !== 'done' || !s.fin.loser || s.fin.rematchUsed || s.fin.tie) break;
      const cA = s.fin.choice.A, cB = s.fin.choice.B;
      s.fin = { ...s.fin, choice: { A: cB, B: cA }, pitch: {}, submitted: {}, verdict: null, judging: false, judgeRequested: false, pitchEnds: now + PITCH_MS, rematchUsed: true, loser: null, wpid: null };
      s.winner = null; s.phase = 'final'; s.mem.recorded = false;
      break;
    }
    case 'taste': if (s.phase === 'vibe' && s.vibe.passed) { s.vibe.tastes[it.pid] = it.tags.filter((x) => (TASTES as readonly string[]).includes(x)); s.vibe.actors[it.pid] = it.actor.slice(0, 30); } break;
    case 'quip': s.orson = { line: it.line.slice(0, 200), mood: it.mood, n: s.orson.n + 1 }; break;
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
    case 'reset': return { ...newState(s.code), v: s.v + 1, players: s.players, phase: (s.players.A.joined && s.players.B.joined ? 'vibe' : 'lobby') as State['phase'], roast: s.roast, cost: s.cost, orson: s.orson, mem: { ...s.mem, recorded: false }, vibe: { ...newState(s.code).vibe, set: (s.vibe.set + 1) % (QUESTION_SETS.length - 1), sets: Array(4).fill((s.vibe.set + 1) % (QUESTION_SETS.length - 1)) } };
  }
  return s;
}

// Theatrical heat 0-100: starts at the gate, rises as you agree in the bracket. Never shows per-axis numbers.
export function heatOf(s: State): number {
  if (s.vibe.score === null) return 0;
  const base = s.vibe.score * 55;
  const res = s.br.matches.filter((m) => m.winner !== null);
  let agreed = 0, tot = 0; void res;
  if (s.phase === 'bracket' || s.phase === 'final' || s.phase === 'done') { const all = s.log.filter((l) => l.includes('(you both agreed)')).length; agreed = all; tot = Math.max(8, s.log.filter((l) => / beats /.test(l)).length); }
  return Math.min(100, Math.round(base + (s.phase === 'draft' ? 6 : 8) + (agreed / Math.max(1, tot)) * 37));
}
export const heatLabel = (h: number) => (h >= 88 ? 'BLAZING' : h >= 72 ? 'HOT' : h >= 55 ? 'WARM' : h >= 35 ? 'COOL' : 'COLD');
