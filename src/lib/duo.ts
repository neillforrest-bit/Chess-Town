import { BY_ID, MOVIES, buildDeck, type Movie } from './game';

export type DuoOp = 'keep' | 'pass' | 'seen';
export type DuoMode = 'duel' | 'discovery' | 'pairs' | 'match';
export type DuoPhase = 'lobby' | 'mode' | 'genres' | 'swipe' | 'reveal' | 'bout' | 'tie' | 'result' | 'confirm' | 'done' | 'actors' | 'deal' | 'wager' | 'pReveal' | 'pPick' | 'pConfirm' | 'mCast' | 'mFlip' | 'mClaim' | 'mBid' | 'mPitch' | 'mReveal' | 'mConfirm';

export type DuoSeat = {
  hash: string; name: string;
  tokens: number; earned: number;
  side: number | null; spent: number; locked: boolean; double: boolean; wild: string[];
};

export type PairsState = {
  actors: ({ id: number; name: string } | null)[];
  floor: number;                       // minimum verified RT critic score for a dealt film
  flip: 'critics' | 'audience' | null; // Jemma's coin flip: one per round, star marks the counting score
  cards: { id: number; actor: number }[];
  piles: (number | null)[];            // per card: 0/1 pile, -1 discarded, null not yet placed
  watchPick?: number | null;           // winner's choice of tonight's film from their claimed pile
  turnIdx: number;
  active: number;                      // seat holding the card
  pendingPass: boolean;                // active seat passed; the other decides
  wagers: (number | null)[];
  totals: number[] | null;
  points: number[] | null;
  wagersLocked?: boolean[];           // pub-only: who has locked, never the amounts, until the reveal
};

export type MatchBid = { chips: number; backing: number[] }; // backing = grid indices of the bidder's own claimed cards lending their scores

/** Star Match (Jemma's memory game): two actors' films face-down on the shared TV grid. Flip on your phone; claim your own actor's films; the rival can challenge a claim with a secret bid: claimed cards lend their scores, plus pretend chips. Points leader locks one safe card per round. Ends in pitches, totals, and the winner picking tonight's film from both collections. */
export type MatchState = {
  actors: ({ id: number; name: string } | null)[];
  cards: { id: number; actor: number }[];   // grid order; face-down cards are masked in duoPub
  status: number[];                         // per card: -1 face-down, 0/1 claimed by that seat, -2 burned
  faceUp: number | null;                    // card index shown big on the TV right now
  faceUpMiss: boolean;                      // faceUp was a wrong-actor flip; it goes back down on the next flip
  safeIdx: number | null;                   // the points leader's locked card
  safeBy: number | null;                    // seat that locked it (only they may flip it this round)
  safeRound: number;                        // the round the lock belongs to
  chips: number[];                          // pretend challenge chips left per seat
  turn: number;                             // seat whose flip it is
  turnsTaken: number;
  claim: { card: number; by: number } | null;
  bids: (MatchBid | null)[];
  pitches: (string | null)[];
  totals: number[] | null;
  winnerSeat: number | null;
  watchPick?: number | null;
  lastEvent: string;                        // short public log line for the TV
};

export type DuoRoom = {
  flow: 'movie-duo-v1'; v: number; round: number; expires: number;
  inviteHash: string; receipts: string[]; tvInvite?: string;
  seats: DuoSeat[];
  mode: DuoMode | null;
  phase: DuoPhase;
  genres: string[];                 // available genres for discovery
  picks: string[][];                // per seat: discovery genres/shelf ids, or [mood] for duel
  genreLocked: number[];
  mood: string;                     // duel: combined mood label
  shelf: number[];                  // shared film ids in swipe order
  extras: Movie[];                  // TMDB-sourced films (discovery), so clients/TV can render them
  ops: Record<string, DuoOp>[];     // per seat: filmId -> opinion (private until reveal)
  swipeDone: number[];
  sync: number;                     // sync points earned per player this night
  overlaps: number[];               // films both kept
  loners: number[][];               // per-seat lone keeps
  wilds: number[];                  // Orson's wildcard finalists
  finalists: number[];
  revealAck: number[];
  queue: number[]; pair: number[]; stage: number; advanced: number[];
  history: { pair: number[]; scores: number[]; winner: number; tied: boolean }[];
  tie: number[]; tieSpun: boolean;
  winner: number | null; confirmed: number[];
  pairs: PairsState | null;
  match: MatchState | null;
  openJoin?: boolean;                 // TV-hosted rooms: the room code alone takes a seat, Jackbox-style
  line: string;
};

export type PublicDuo = Omit<DuoRoom, 'inviteHash' | 'receipts' | 'seats' | 'ops' | 'tvInvite'> & {
  you: number;
  seats: Omit<DuoSeat, 'hash'>[];
  progress: number[];                                  // per-seat answered count (safe during swipe)
  ownOps?: Record<string, DuoOp>;                      // seat holder only
  opsRevealed?: Record<string, DuoOp>[];               // everyone, once the reveal lands
  tvInvite?: string;                                   // lobby only, only when a player explicitly asked
};

export const DUO_MOODS: { name: string; genres: string[]; target: number[]; blurb: string }[] = [
  { name: 'Anything', genres: [], target: [5, 5, 5, 5], blurb: 'The whole catalogue. Fate decides.' },
  { name: 'Comfort', genres: ['Comedy', 'Romance', 'Family'], target: [4, 2, 4, 4], blurb: 'Warm, easy, nobody gets hurt.' },
  { name: 'Gripping', genres: ['Thriller', 'Crime', 'Mystery'], target: [7, 7, 3, 5], blurb: 'Edge of both seats.' },
  { name: 'Wonder', genres: ['Science Fiction', 'Fantasy', 'Adventure'], target: [5, 5, 9, 6], blurb: 'Big worlds, big feelings.' },
  { name: 'Documentaries', genres: ['Documentary'], target: [4, 5, 1, 5], blurb: 'True stories, argued over.' },
];

export const DUO_GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Sci-fi', 'Fantasy', 'Animation', 'Crime', 'Mystery', 'War', 'Documentary'];
export const GID_OF: Record<string, string> = { 'Sci-fi': 'Science Fiction' };
export const DOC_SHELVES: { id: string; n: string }[] = [
  { id: 'docs_tc', n: 'TRUE CRIME' }, { id: 'docs_crazy', n: 'CRAZY STORIES' }, { id: 'docs_power', n: 'MONEY & POWER' },
  { id: 'docs_nature', n: 'NATURE & SCIENCE' }, { id: 'docs_music', n: 'MUSIC & CULTURE' }, { id: 'docs', n: 'ALL DOCS' },
];
const SHELF_KW: Record<string, RegExp> = {
  docs_tc: /murder|kill|crime|criminal|prison|heist|fraud|scam|trial|police|detective|victim|disappear|kidnap|con artist|serial|mafia|cartel|investigat|convict|cult/i,
  docs_power: /war|politic|econom|money|power|corrupt|government|president|finance|capital|society|history/i,
  docs_nature: /nature|animal|planet|ocean|space|science|wildlife|earth|climate|mountain/i,
  docs_music: /music|band|singer|concert|jazz|rock|hip-hop|rap|soul|album|artist/i,
  docs_crazy: /cult|insane|bizarre|scandal|conspir|wild|strange|obsess|hoax|eccentric/i,
};

const GN: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const GID: Record<string, number> = Object.fromEntries(Object.entries(GN).map(([k, v]) => [v, Number(k)]));

export const obscurity = (m: Movie) => m.r * 10 - Math.log10(Math.max(10, m.pop)) * 12;

export function filmOf(s: Pick<DuoRoom, 'extras'>, id: number): Movie | undefined {
  return BY_ID[id] || s.extras.find((m) => m.id === id);
}

/** Map both players' opinions into sync points, overlaps, lone keeps and the four-film finale. Pure and shared by route and tests. */
export function scoreSwipe(s: DuoRoom): void {
  const overlaps: number[] = [];
  const loners: number[][] = [[], []];
  let points = 0;
  for (const id of s.shelf) {
    const a = s.ops[0]?.[id], b = s.ops[1]?.[id];
    if (!a || !b) continue;
    if (a === 'keep' && b === 'keep') { points += 2; overlaps.push(id); }
    else if (a === b) points += 1;
    else if (a === 'keep') loners[0].push(id);
    else if (b === 'keep') loners[1].push(id);
  }
  const byRating = (x: number, y: number) => (filmOf(s, y)?.r || 0) - (filmOf(s, x)?.r || 0);
  overlaps.sort(byRating); loners[0].sort(byRating); loners[1].sort(byRating);
  const keptSet = new Set([...overlaps, ...loners[0], ...loners[1]]);
  const wildPool = s.shelf.filter((id) => !keptSet.has(id)).sort(byRating);
  const alternate: number[] = [];
  for (let i = 0; i < Math.max(loners[0].length, loners[1].length); i++) {
    if (loners[0][i] !== undefined) alternate.push(loners[0][i]);
    if (loners[1][i] !== undefined) alternate.push(loners[1][i]);
  }
  const ordered = [...overlaps, ...alternate, ...wildPool];
  s.finalists = [...new Set(ordered)].slice(0, 4);
  s.wilds = s.finalists.filter((id) => wildPool.includes(id));
  s.overlaps = overlaps; s.loners = loners;
  s.sync = points;
  s.seats.forEach((p) => { p.tokens += points; p.earned += points; });
}

/** Taste Duel deck: average both moods' taste targets, genre-lead, 14 cards. */
export function buildDuelDeck(code: string, moodA: string, moodB: string): { shelf: number[]; mood: string } {
  const ma = DUO_MOODS.find((m) => m.name === moodA) || DUO_MOODS[0];
  const mb = DUO_MOODS.find((m) => m.name === moodB) || DUO_MOODS[0];
  const target = ma.target.map((x, i) => Math.round((x + mb.target[i]) / 2));
  const genres = [...new Set([...ma.genres, ...mb.genres])];
  const ids = buildDeck(target, 'duo:' + code, [], { A: null, B: null }, { A: '', B: '' }, [], { A: {}, B: {} }, 'movie');
  const lead = genres.length ? [...ids.filter((id) => BY_ID[id].g.some((g) => genres.includes(g))), ...ids.filter((id) => !BY_ID[id].g.some((g) => genres.includes(g)))] : ids;
  const shelf = lead.slice(0, 14);
  // deterministic-enough interleave: keep first 4 as the strong openers, shuffle the rest cheaply by rating jitter
  const tail = shelf.slice(4).sort((a, b) => (BY_ID[a].r - BY_ID[b].r) * (((a + code.length) % 2) ? 1 : -1));
  const mood = moodA === moodB ? moodA : moodA + ' meets ' + moodB;
  return { shelf: [...shelf.slice(0, 4), ...tail], mood };
}

type TmdbT = { id: number; title: string; release_date?: string; vote_average: number; vote_count: number; overview: string; poster_path: string | null; genre_ids?: number[]; original_language?: string };

/** Discovery Duos shelf: local deep cuts + one compact TMDB deep dig, interleaved, cap 12. Zero spend (free key). */
export async function buildDiscoveryShelf(genres: string[], seed: number): Promise<{ shelf: number[]; extras: Movie[] }> {
  const YR = new Date().getFullYear();
  const docMode = genres.includes('Documentary');
  const shelfId = docMode ? (genres.find((g) => g.startsWith('docs')) || 'docs') : undefined;
  const kw = shelfId && shelfId !== 'docs' ? SHELF_KW[shelfId] : null;
  const localCat = shelfId && shelfId !== 'docs' ? 'doccat:' + shelfId.slice(5) : '';
  const wanted = genres.filter((g) => !g.startsWith('docs') && g !== 'Documentary').map((g) => GID_OF[g] || g);

  const local = MOVIES.filter((m) => (
    docMode
      ? m.g.includes('Documentary') && (!localCat || (m.kw || []).includes(localCat))
      : wanted.some((g) => m.g.includes(g)) && !m.g.includes('Documentary')
  ) && m.r >= 7 && m.pop >= 100 && m.pop <= 5000 && m.y >= 1960 && m.y <= YR - 2)
    .sort((a, b) => obscurity(b) - obscurity(a))
    .slice(0, 7);

  let remote: Movie[] = [];
  const key = process.env.TMDB_API_KEY;
  if (key) {
    for (let attempt = 0; attempt < 2 && remote.length < 3; attempt++) {
      const gids = docMode ? String(GID['Documentary']) : wanted.map((g) => GID[g]).filter(Boolean).join('|');
      const jobs: Record<string, string>[] = [
        { sort_by: 'vote_average.desc', 'vote_count.gte': '150', 'vote_average.gte': '7.3', page: String(1 + ((seed + attempt * 7) % 25)) },
        { sort_by: 'popularity.asc', 'vote_count.gte': '80', 'vote_count.lte': '2500', 'vote_average.gte': '7.0', page: String(1 + ((seed + attempt * 13) % 35)) },
        { sort_by: 'vote_average.desc', 'vote_count.gte': '60', 'vote_count.lte': '800', 'vote_average.gte': '7.0', page: String(1 + ((seed + attempt * 29) % 35)) },
        { sort_by: 'primary_release_date.asc', 'vote_count.gte': '300', 'vote_average.gte': '7.0', page: String(1 + ((seed + attempt * 3) % 25)) },
      ];
      const seen = new Set<number>(local.map((m) => m.id));
      const cand: Movie[] = [];
      await Promise.all(jobs.map(async (q) => {
        try {
          const params = new URLSearchParams({ api_key: key, language: 'en-US', include_adult: 'false', 'primary_release_date.gte': '1960-01-01', 'primary_release_date.lte': new Date().toISOString().slice(0, 10), ...(gids ? { with_genres: gids } : {}), ...q });
          const r = await fetch('https://api.themoviedb.org/3/discover/movie?' + params, { signal: AbortSignal.timeout(8000) });
          const d = (await r.json()) as { results?: TmdbT[] };
          for (const m of d.results || []) {
            if (!m.poster_path || !m.overview || seen.has(m.id)) continue;
            seen.add(m.id);
            cand.push({ id: m.id, t: String(m.title), y: Number((m.release_date || '0').slice(0, 4)) || 0, r: Math.round(m.vote_average * 10) / 10, g: (m.genre_ids || []).map((id) => GN[id]).filter(Boolean), o: m.overview, p: m.poster_path, w: false, pop: m.vote_count, ol: m.original_language } as Movie);
          }
        } catch { /* skip this dig */ }
      }));
      remote = cand
        .filter((m) => m.r >= 6.9 && m.pop >= 100 && m.pop <= 5000 && ((m as { ol?: string }).ol && (m as { ol?: string }).ol !== 'en' || m.y <= YR - 2) && (docMode ? m.g.includes('Documentary') && (!kw || kw.test(m.t + ' ' + m.o)) : !m.g.includes('Documentary')))
        .sort((a, b) => obscurity(b) - obscurity(a))
        .slice(0, 7);
    }
  }

  const mix: Movie[] = [];
  for (let i = 0; i < 7; i++) {
    if (local[i]) mix.push(local[i]);
    if (remote[i]) mix.push(remote[i]);
  }
  const final = mix.slice(0, 12);
  return { shelf: final.map((m) => m.id), extras: remote.filter((m) => final.includes(m)) };
}


/** Star Pairs (Jemma's game): verified constants. Audience score = real IMDb audience rating x10 (RT audience has no API; swap here if a source appears). One flip per round; false = flip per card at reveal. */
export const PAIRS_AUDIENCE_SOURCE = 'imdb' as const;
export const PAIRS_FLIP_PER_ROUND = true;
export const PAIRS_WIN = 20;
export const PAIRS_LOSE = 15;
export const PAIRS_MAX_WAGER = 10;
export const PAIRS_FLOORS = [50, 60, 70, 80];

export const pairsScores = (m: Movie): { critics: number | null; audience: number | null } => ({
  critics: m.rt ?? m.tmdb ?? null,
  audience: m.imdb != null ? Math.round(m.imdb * 10) : (m.tmdb ?? null),
});
export const countingScore = (m: Movie, flip: 'critics' | 'audience'): number | null => pairsScores(m)[flip];

const seedHash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

type TmdbCredit = { id: number; title?: string; release_date?: string; genre_ids?: number[]; overview?: string; poster_path?: string | null; vote_average?: number; vote_count?: number; popularity?: number };
type TmdbCredits = { cast?: TmdbCredit[] };
const TMDB_GENRES: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const creditToMovie = (c: TmdbCredit): Movie => {
  const cat = BY_ID[c.id];
  if (cat) return cat;
  return { id: c.id, t: c.title || 'Untitled', y: c.release_date ? +c.release_date.slice(0, 4) || 0 : 0, r: Math.round((c.vote_average || 0) * 10) / 10, g: (c.genre_ids || []).map((x) => TMDB_GENRES[x]).filter(Boolean), o: c.overview || '', p: c.poster_path || '', w: false, pop: c.popularity || 0, rt: null, imdb: null, tmdb: (c.vote_count || 0) > 0 ? Math.round((c.vote_average || 0) * 10) : null };
};
const criticsOf = (m: Movie): number | null => m.rt ?? m.tmdb ?? null;
const dealable = (m: Movie, c: TmdbCredit): boolean => !!m.p && criticsOf(m) != null && (m.imdb != null || m.tmdb != null) && (BY_ID[c.id] ? true : (c.vote_count || 0) >= 100);

/** Deal 5 films per actor from the catalogue, live-verified against TMDB credits, at or above the RT floor, both scores present. */
/** How many scored, poster-bearing films this actor has across their whole filmography. Null when the credits check is down. */
export async function actorHandCount(id: number): Promise<number | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.themoviedb.org/3/person/' + id + '/movie_credits?api_key=' + key, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json()) as TmdbCredits;
    const seen = new Set<number>();
    return (d.cast || []).filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      const m = creditToMovie(c);
      return dealable(m, c);
    }).length;
  } catch { return null; }
}

export async function buildPairsDeal(code: string, round: number, actors: { id: number; name: string }[], floor: number): Promise<{ cards?: { id: number; actor: number }[]; extras?: Movie[]; dipped?: string[]; error?: string }> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { error: 'Film credits check is unavailable. Retry shortly.' };
  const pools: Movie[][] = [];
  const dipped: string[] = [];
  const extras: Movie[] = [];
  for (const a of actors) {
    let credits: TmdbCredit[] = [];
    try {
      const r = await fetch('https://api.themoviedb.org/3/person/' + a.id + '/movie_credits?api_key=' + key, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw Error();
      const d = (await r.json()) as TmdbCredits;
      const seen = new Set<number>();
      credits = (d.cast || []).filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    } catch { return { error: 'Film credits check is unavailable. Retry shortly.' }; }
    const films = credits.map((c) => ({ m: creditToMovie(c), c })).filter((x) => dealable(x.m, x.c));
    let pool = films.filter((x) => (criticsOf(x.m) || 0) >= floor).map((x) => x.m);
    if (pool.length < 5) {
      const have = new Set(pool.map((m) => m.id));
      const below = films.filter((x) => !have.has(x.m.id)).sort((x, y) => (criticsOf(y.m) || 0) - (criticsOf(x.m) || 0)).map((x) => x.m);
      pool = [...pool, ...below.slice(0, 5 - pool.length)];
      if (pool.length >= 5) dipped.push(a.name);
    }
    if (pool.length < 5) return { error: a.name + ' has only ' + pool.length + ' scored films on record, too thin for a five-film hand. Swap that actor.' };
    for (const m of pool) if (!BY_ID[m.id] && !extras.some((e) => e.id === m.id)) extras.push(m);
    pools.push(pool);
  }
  const rng = mulberry(seedHash('pairs:' + code + ':' + round));
  const pick5 = (pool: Movie[]) => [...pool].sort(() => rng() - 0.5).slice(0, 5);
  const cards = [...pick5(pools[0]).map((m) => ({ id: m.id, actor: 0 })), ...pick5(pools[1]).map((m) => ({ id: m.id, actor: 1 }))];
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return { cards, extras, dipped };
}

/** Score the round: a card scores its counting score to its true actor's seat when placed correctly; a wrong pile sends the points to the other player (the bluff backfires). Discards score nothing. Then 20/15 and the wagers. */
export function resolvePairs(s: DuoRoom): void {
  const p = s.pairs!;
  const flip = p.flip || 'critics';
  const tot = [0, 0];
  p.cards.forEach((c, i) => {
    const pile = p.piles[i];
    if (pile == null || pile < 0) return;
    const m = filmOf(s, c.id);
    if (!m) return;
    const sc = countingScore(m, flip);
    if (sc == null) return;
    tot[pile === c.actor ? c.actor : 1 - pile] += sc;
  });
  p.totals = tot;
  const tied = tot[0] === tot[1];
  const base = tied ? [PAIRS_LOSE, PAIRS_LOSE] : tot[0] > tot[1] ? [PAIRS_WIN, PAIRS_LOSE] : [PAIRS_LOSE, PAIRS_WIN];
  p.points = [0, 1].map((i) => {
    const w = p.wagers[i] || 0;
    const delta = tied || !w ? 0 : tot[i] > tot[1 - i] ? w : -w;
    return Math.max(0, base[i] + delta);
  });
}

/** Star Match (Jemma's memory game): verified constants. Scores are the same verified critic score as Star Pairs (RT, or TMDB audience x10 when a film is outside the catalogue, labelled TMDB). Chips and points are pretend, tonight only, worth nothing. */
export const MATCH_CHIPS = 20;
export const MATCH_TURNS_MAX = 40;
export const MATCH_FLOOR = 60;
export const MATCH_PER_ACTOR = 6;
const MATCH_BANNED = /sci-?fi|science fiction|animation/i;

const fetchCredits = async (id: number): Promise<TmdbCredit[] | null> => {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.themoviedb.org/3/person/' + id + '/movie_credits?api_key=' + key, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json()) as TmdbCredits;
    const seen = new Set<number>();
    return (d.cast || []).filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  } catch { return null; }
};

/** Jemma's film pool: scored 60+, no sci-fi or animation, verified real films with posters and both score kinds. */
export async function matchPool(id: number): Promise<{ m: Movie; c: TmdbCredit }[] | null> {
  const credits = await fetchCredits(id);
  if (!credits) return null;
  return credits.map((c) => ({ m: creditToMovie(c), c }))
    .filter((x) => dealable(x.m, x.c))
    .filter((x) => (criticsOf(x.m) || 0) >= MATCH_FLOOR)
    .filter((x) => !x.m.g.some((g) => MATCH_BANNED.test(g)));
}

/** Deal 6 films per actor: their 5 best-scored plus 1 hidden gem (70+ but the least-seen of the rest), shuffled into one 12-card grid. */
export async function buildMatchDeal(code: string, actors: { id: number; name: string }[]): Promise<{ cards?: { id: number; actor: number }[]; extras?: Movie[]; error?: string }> {
  if (!process.env.TMDB_API_KEY) return { error: 'Film credits check is unavailable. Retry shortly.' };
  const extras: Movie[] = [];
  const picks: Movie[][] = [];
  for (const a of actors) {
    const pool = await matchPool(a.id);
    if (!pool) return { error: 'Film credits check is unavailable. Retry shortly.' };
    const sorted = [...pool].sort((x, y) => (criticsOf(y.m) || 0) - (criticsOf(x.m) || 0));
    const best = sorted.slice(0, MATCH_PER_ACTOR - 1);
    const rest = sorted.slice(MATCH_PER_ACTOR - 1);
    const votes = (x: { m: Movie; c: TmdbCredit }) => (BY_ID[x.m.id] ? x.m.pop : (x.c.vote_count || 0));
    const gem = rest.filter((x) => (criticsOf(x.m) || 0) >= 70).sort((x, y) => votes(x) - votes(y))[0] || rest[0];
    const hand = [...best.map((x) => x.m), ...(gem ? [gem.m] : [])].filter((m, i, arr) => arr.findIndex((z) => z.id === m.id) === i);
    if (hand.length < MATCH_PER_ACTOR) return { error: a.name + ' has only ' + hand.length + ' films that fit (scored ' + MATCH_FLOOR + '+, no sci-fi or animation). Pick another star.' };
    for (const m of hand) if (!BY_ID[m.id] && !extras.some((e) => e.id === m.id)) extras.push(m);
    picks.push(hand);
  }
  const rng = mulberry(seedHash('match:' + code));
  const cards = [...picks[0].map((m) => ({ id: m.id, actor: 0 })), ...picks[1].map((m) => ({ id: m.id, actor: 1 }))];
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return { cards, extras };
}

/** Running public totals: claimed cards show their scores as they land. */
export function matchLiveTotals(s: DuoRoom): number[] {
  const m = s.match!;
  const t = [0, 0];
  m.cards.forEach((c, i) => {
    const st = m.status[i];
    if (st !== 0 && st !== 1) return;
    const f = filmOf(s, c.id);
    const sc = f ? criticsOf(f) : null;
    if (sc != null) t[st] += sc;
  });
  return t;
}
export const matchRound = (m: MatchState) => Math.floor(m.turnsTaken / 2) + 1;
export const matchLeader = (t: number[]) => (t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1);

/** A safe-card lock is due at the top of each round when someone is ahead and at least two cards are still down. */
export function matchSafeNeeded(s: DuoRoom): boolean {
  const m = s.match!;
  if (m.safeRound >= matchRound(m)) return false;
  if (matchLeader(matchLiveTotals(s)) < 0) return false;
  return m.status.filter((st) => st === -1).length >= 2;
}
export const matchSafeActive = (m: MatchState) => m.safeIdx != null && m.safeRound === matchRound(m) ? m.safeIdx : null;

/** End of a turn: hand over, and when the grid is done (or the turn cap saves a stale night) burn what is left and total up. */
export function matchTurnEnd(s: DuoRoom): void {
  const m = s.match!;
  m.turnsTaken++; m.turn = 1 - m.turn;
  if (!m.status.some((st) => st === -1) || m.turnsTaken >= MATCH_TURNS_MAX) {
    m.status = m.status.map((st) => (st === -1 ? -2 : st));
    m.totals = matchLiveTotals(s);
  }
}

/** Challenge resolution (Jemma's added-up-score bidding): each side's bid power is the sum of the scores of their own claimed cards put behind the bid, plus chips. Backing cards stay with their owner; chips are spent either way. Tie goes to the claimer. */
export function resolveMatchBid(s: DuoRoom): void {
  const m = s.match!;
  const claim = m.claim!;
  const f = filmOf(s, m.cards[claim.card].id);
  const claimer = claim.by, challenger = 1 - claimer;
  const power = (seat: number) => {
    const bid = m.bids[seat];
    if (!bid) return { chips: 0, sum: 0, n: 0, total: 0 };
    const sum = bid.backing.reduce((a, i) => a + (criticsOf(filmOf(s, m.cards[i].id)!) || 0), 0);
    return { chips: bid.chips, sum, n: bid.backing.length, total: sum + bid.chips };
  };
  const c = power(claimer), x = power(challenger);
  m.chips[claimer] -= c.chips; m.chips[challenger] -= x.chips;
  const kept = c.total >= x.total;
  m.status[claim.card] = kept ? claimer : -2;
  m.lastEvent = s.seats[challenger].name + ' challenged ' + (f?.t || 'the claim') + ': ' + x.total + ' (' + x.sum + ' from ' + x.n + ' card' + (x.n === 1 ? '' : 's') + ' + ' + x.chips + ' chips) against ' + c.total + ' (' + c.sum + ' + ' + c.chips + ' chips). ' + (kept ? s.seats[claimer].name + ' keeps it.' : 'The film burns. Nobody gets it.');
  m.claim = null;
  m.bids = [null, null];
}

/** Higher total wins; ties break on more cards, then the single best card, then the host. */
export function matchWinnerSeat(s: DuoRoom): number {
  const m = s.match!;
  const t = m.totals || [0, 0];
  if (t[0] !== t[1]) return t[0] > t[1] ? 0 : 1;
  const count = (seat: number) => m.status.filter((x) => x === seat).length;
  if (count(0) !== count(1)) return count(0) > count(1) ? 0 : 1;
  const top = (seat: number) => Math.max(0, ...m.cards.map((c, i) => (m.status[i] === seat ? (criticsOf(filmOf(s, c.id)!) || 0) : 0)));
  return top(0) >= top(1) ? 0 : 1;
}

/** Ringside Orson: rule-based lines in his voice, one per transition. */
export function duoLine(s: DuoRoom, event: string, you?: number): string {
  const n = (i: number) => s.seats[i]?.name || 'P' + (i + 1);
  switch (event) {
    case 'lobby': return 'Two phones, one argument. Scan, join, and try to agree on something.';
    case 'mode-duel': return 'Taste Duel. Keep or pass the same cards in secret. Agreement is currency.';
    case 'mode-discovery': return 'Discovery Duos. A shelf of films neither of you would have found. Dig.';
    case 'mode-pairs': return "Star Pairs. Jemma's own con. Two actors, ten films, hidden scores. Lie well.";
    case 'mode-match': return 'Star Match. Jemma\'s memory game. Two casts face-down on the big screen. Remember everything, admit nothing.';
    case 'mCast': return 'Each player names one actor. Six of their best films hit the table face-down. Scores 60 and up, no sci-fi, no animation, one hidden gem each.';
    case 'mFlip': return 'Flip a card on your phone. Your actor: claim it. Theirs: remember where it sleeps.';
    case 'mClaim': return 'A claim is on the table. Spend chips to challenge it, or let it go.';
    case 'mBid': return 'Secret bids. Back your side with films you have already claimed — their scores add up — plus chips. A tie keeps the claim.';
    case 'mPitch': return 'One pitch each, written on your phone. Say anything. Bluffing is a virtue here.';
    case 'mReveal': return 'The totals. The winner shops both collections for tonight\'s film.';
    case 'mConfirm': return 'One film, two yeses. Nothing plays itself.';
    case 'actors': return 'Name your actors and set the floor. The deck is watching.';
    case 'deal': return 'Claim the card, bluff the card, or pass it and pray. Cast and scores stay hidden.';
    case 'wager': return 'The cards are down. Stake your points on whose taste is real. Secretly.';
    case 'pPick': return 'The winner raids their pile for tonight’s film.';
    case 'pConfirm': return 'One film, two yeses. Nothing plays itself.';
    case 'pReveal': return 'The truth, one card at a time. Some of you lied beautifully.';
    case 'genres': return 'Genres are being locked. Choose well; I have to watch the result too.';
    case 'shelf': return s.mode === 'discovery' ? `Twelve deep cuts. Keep up to five. I have opinions about all of them.` : 'Fourteen cards, one at a time. Keep, pass, or admit you have seen it.';
    case 'reveal': {
      const max = s.shelf.length * 2; const pct = Math.round((s.sync / Math.max(1, max)) * 100);
      if (s.overlaps.length >= 4) return `You agreed on ${s.overlaps.length} films. ${pct}% in sync. Either love or shared account passwords.`;
      if (s.overlaps.length === 0) return `Zero overlap. ${pct}% in sync. I have hosted divorces with more common ground.`;
      return `${s.overlaps.length} shared keep${s.overlaps.length === 1 ? '' : 's'}, ${pct}% in sync. The tug will settle the rest.`;
    }
    case 'bout': return 'Spend sync tokens to pull. Everything spent is spent, win or lose.';
    case 'tie': return 'A dead heat. Agree on one, or both trust the wheel.';
    case 'done': return 'A film both of you chose, more or less. The projector awaits.';
    case 'double': return `${n(you ?? 0)} doubles the pull. Confidence, or panic.`;
    case 'steal': return `${n(you ?? 0)} reaches into the other pocket. Legal here.`;
    case 'switch': return `${n(you ?? 0)} switches sides mid-bout. Principles, abandoned.`;
    default: return 'Orson is watching.';
  }
}

/** Public projector: strips secrets, keeps the pre-reveal shelf private, exposes join QR only when asked. */
export function duoPub(s: DuoRoom, you: number, spectator = false): PublicDuo {
  const { inviteHash, receipts, seats, ops, tvInvite, ...rest } = s;
  void inviteHash; void receipts;
  const revealed = !['lobby', 'mode', 'genres', 'swipe'].includes(s.phase);
  const pRevealed = s.phase === 'pReveal' || s.phase === 'done';
  const pubPairs = rest.pairs ? {
    ...rest.pairs,
    cards: rest.pairs.cards.map((c) => (pRevealed ? c : { id: c.id, actor: -1 })),
    wagers: pRevealed ? rest.pairs.wagers : rest.pairs.wagers.map((w, i) => (i === you && !spectator ? w : null)),
    wagersLocked: rest.pairs.wagers.map((w) => w != null),
  } : null;
  const mRevealed = s.phase === 'mReveal' || s.phase === 'mConfirm' || s.phase === 'done';
  const mBidsIn = rest.match ? rest.match.bids.every((b) => b != null) : false;
  const mPitchesIn = rest.match ? rest.match.pitches.every((p) => p != null) : false;
  const pubMatch = rest.match ? {
    ...rest.match,
    cards: rest.match.cards.map((c, i) => (rest.match!.status[i] !== -1 || rest.match!.faceUp === i || mRevealed ? c : { id: 0, actor: -1 })),
    bids: mBidsIn || mRevealed ? rest.match.bids : rest.match.bids.map((b, i) => (i === you && !spectator ? b : null)),
    pitches: mPitchesIn || mRevealed ? rest.match.pitches : rest.match.pitches.map((p, i) => (i === you && !spectator ? p : null)),
  } : null;
  return {
    ...rest,
    pairs: pubPairs as PublicDuo['pairs'],
    match: pubMatch as PublicDuo['match'],
    you,
    seats: seats.map(({ hash, ...p }) => { void hash; return p; }),
    progress: ops.map((o) => Object.keys(o).length),
    ...(you >= 0 && !spectator ? { ownOps: ops[you] || {} } : {}),
    ...(revealed ? { opsRevealed: ops } : {}),
    ...(s.phase === 'lobby' && tvInvite ? { tvInvite } : {}),
  };
}
