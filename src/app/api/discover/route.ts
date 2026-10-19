import { NextResponse } from 'next/server';
import { cleanCons, validateBatch, supHit, NEW_FROM, type Cons, type Sup } from '@/lib/cons';

export const maxDuration = 30;
const GN: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const GID: Record<string, number> = Object.fromEntries(Object.entries(GN).map(([k, v]) => [v, Number(k)]));
type T = { id: number; title: string; release_date?: string; vote_average: number; vote_count: number; overview: string; poster_path: string | null; genre_ids?: number[]; genres?: { id: number }[]; popularity: number; runtime?: number | null; ol?: string };
type Out = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; w: boolean; pop: number; rt: null; rn?: number; ol?: string };

/** Small seeded RNG so the page offsets depend on the clock (seed = request timestamp): back-to-back nights never open on the same page. */
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

type Job = { path: string; q: Record<string, string>; label: string };

/**
 * "The Vibe Check" + v2.0 gap-fill discovery. Strict rules go to TMDB as hard filters (with_genres / without_genres / with_runtime / date range),
 * then a validation layer re-checks every film against the same rules before anything is returned. Eight endpoint flavours, high-variance
 * sorts instead of a Top-N list, and page offsets seeded from the request timestamp.
 */
export async function POST(req: Request) {
  const key = process.env.TMDB_API_KEY;
  const body = await req.json().catch(() => ({})) as { sl?: number[]; ban?: number[]; cons?: Partial<Cons>; mode?: string; avoid?: string[]; sup?: Sup[]; seed?: number; n?: number; tastes?: string[]; actors?: string[] };
  if (!key) return NextResponse.json({ movies: [], error: 'no key' });
  const cons = cleanCons(body.cons); const sl = (body.sl || [50, 50, 50]).map((x) => Math.max(0, Math.min(100, Number(x) || 50)));
  const seed = Number.isFinite(body.seed) ? Number(body.seed) : Date.now(); const rnd = rng(seed); const pg = (max: number) => Math.floor(rnd() * max) + 1;
  const pivot = body.mode === 'pivot'; const deep = body.mode === 'deep'; const avoid = body.avoid || [];
  const [lightness, bb, brainOff] = sl;
  // slider vibes -> genre pools (OR). Strict genre rules override them: "must have" genres replace the vibe pools, exclusions are always applied.
  const g1 = lightness < 40 ? '53|80|27|9648' : lightness > 60 ? '35|16|10751|10749' : ''; const g2 = brainOff < 40 ? '878|9648|53|14' : brainOff > 60 ? '28|35|12|16' : '';
  const strictIn = cons.ig.map((g) => GID[g]).filter(Boolean).join('|');
  const xgIds = new Set<number>(cons.xg.map((g) => GID[g]).filter(Boolean));
  for (const a of avoid) { const [g] = a.split('|'); if (g && g !== '*' && GID[g]) xgIds.add(GID[g]); }
  const without = Array.from(xgIds).join(',');
  // locked Vibe Matrix tropes -> genre pools (OR within a pool, one pool per 2-3 genres) so TMDB discovery is led by the room's actual mood, not the sliders
  const tIds = Array.from(new Set((body.tastes || []).map((g) => GID[g] ?? GID[g === 'Sci-fi' ? 'Science Fiction' : g]).filter(Boolean))).filter((id) => !xgIds.has(id));
  const tPools: string[] = []; for (let i = 0; i < tIds.length; i += 2) tPools.push(tIds.slice(i, i + 2).join('|'));
  const pools = strictIn ? [strictIn] : tPools.length ? tPools : [g1, g2, ''].filter((x, i, a) => x || a.indexOf(x) === i);
  const dateLo = cons.era === 'new' ? `${NEW_FROM}-01-01` : cons.era === 'pre2000' ? '1960-01-01' : deep ? '1960-01-01' : '1990-01-01'; const dateHi = cons.era === 'pre2000' ? '1999-12-31' : '';
  const blockbuster = bb > 65, indie = bb < 35; const minAvg = indie ? '6.8' : blockbuster ? '6.0' : '6.4';
  const base = (): Record<string, string> => { const q: Record<string, string> = { language: 'en-US', include_adult: 'false', 'primary_release_date.gte': dateLo }; if (!deep) q.with_original_language = 'en'; if (dateHi) q['primary_release_date.lte'] = dateHi; else if (deep) q['primary_release_date.lte'] = new Date().toISOString().slice(0, 10); if (without) q.without_genres = without; if (cons.rt === 'u2') { q['with_runtime.lte'] = '120'; q['with_runtime.gte'] = '60'; } return q; };
  const jobs: Job[] = [];
  const disc = (sort: string, extra: Record<string, string>, genres: string, maxPage: number, label: string) => { const q: Record<string, string> = { ...base(), sort_by: sort, page: String(pg(maxPage)), ...extra }; if (genres) q.with_genres = genres; jobs.push({ path: 'discover/movie', q, label }); };
  const gp = (i: number) => pools[i % pools.length];
  if (deep) {
    disc('vote_average.desc', { 'vote_count.gte': '150', 'vote_average.gte': '7.3' }, gp(0), 30, 'deep acclaimed');
    disc('popularity.asc', { 'vote_count.gte': '80', 'vote_count.lte': '2500', 'vote_average.gte': '7.0' }, gp(1), 40, 'deep hidden gems');
    disc('vote_average.desc', { 'vote_count.gte': '60', 'vote_count.lte': '800', 'vote_average.gte': '7.0' }, gp(2), 40, 'deep niche');
    disc('primary_release_date.asc', { 'vote_count.gte': '300', 'vote_average.gte': '7.0' }, gp(0), 30, 'deep oldies');
    disc('popularity.desc', { 'vote_count.gte': '200', 'vote_average.gte': '7.0' }, gp(1), 20, 'deep known');
  } else {
  disc('popularity.desc', { 'vote_count.gte': '500', 'vote_average.gte': minAvg }, gp(0), 12, 'discover popularity');
  disc('vote_average.desc', { 'vote_count.gte': '1500', 'vote_average.gte': '7.2' }, gp(1), 14, 'discover acclaimed');
  disc('revenue.desc', { 'vote_count.gte': '800' }, gp(2), 10, 'discover box office');
  disc('vote_count.desc', { 'vote_average.gte': '6.5' }, gp(0), 16, 'discover most voted');
  disc('primary_release_date.desc', { 'vote_count.gte': '250', 'vote_average.gte': '6.3', 'primary_release_date.lte': new Date(seed).toISOString().slice(0, 10) }, gp(1), 6, 'discover recent');
  disc('popularity.asc', { 'vote_count.gte': '600', 'vote_count.lte': '4000', 'vote_average.gte': '6.8' }, gp(2), 12, 'discover hidden gems');
  }
  // trending / top_rated / now_playing have no runtime or genre filters: they only run when no strict hard filters would be needed server-side; validation still re-checks everything
  // deep: no top_rated endpoint - it has no vote floor, so pre-release blockbusters sneak in as fake 'hidden gems'
  if (!deep && cons.rt !== 'u2') { jobs.push({ path: 'trending/movie/week', q: { page: String(pg(5)) }, label: 'trending' }); jobs.push({ path: 'movie/top_rated', q: { page: String(pg(20)), language: 'en-US' }, label: 'top rated' }); }
  if (!deep && (cons.era === 'new' || cons.era === 'any')) jobs.push({ path: 'movie/now_playing', q: { page: String(pg(3)), language: 'en-US' }, label: 'now playing' });
  // Batch 7 actor input (his 18 Oct add): first actor name -> TMDB person -> with_cast on half the jobs,
  // so actor films surface without starving the mood-led pool. 1-2 extra TMDB calls per room, free key.
  let castId: number | null = null;
  const actorName = (body.actors || []).map((x) => String(x).split(',')[0].trim()).find((x) => x.length > 2);
  if (actorName) {
    try {
      const pr = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${key}&query=${encodeURIComponent(actorName)}&page=1`, { signal: AbortSignal.timeout(6000) });
      const pd = await pr.json() as { results?: { id: number }[] };
      castId = pd.results?.[0]?.id ?? null;
    } catch { /* actor filter is best-effort */ }
  }
  if (castId !== null) jobs.forEach((j, i) => { if (i % 2 === 0 && j.path === 'discover/movie') j.q.with_cast = String(castId); });
  const run = pivot ? jobs.slice(0, 8) : jobs;
  const seen = new Set<number>(body.ban || []); const cand: T[] = []; const calls: string[] = [];
  await Promise.all(run.map(async (j) => {
    const q = new URLSearchParams({ api_key: key, ...j.q }); calls.push(`${j.label} p${j.q.page}`);
    try { const r = await fetch(`https://api.themoviedb.org/3/${j.path}?` + q, { signal: AbortSignal.timeout(8000) }); const d = await r.json() as { results?: T[] };
      for (const m of d.results || []) { if (!m.poster_path || !m.overview || seen.has(m.id)) continue; seen.add(m.id); cand.push(m); }
    } catch { /* skip this call */ }
  }));
  // shuffle (seeded), take a generous slice, enrich with exact runtime so the runtime rule can be verified instead of assumed
  const order = cand.map((m) => ({ m, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.m).slice(0, 40);
  const detailed = await Promise.all(order.map(async (m) => { try { const r = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${key}&language=en-US`, { signal: AbortSignal.timeout(6000) }); const d = await r.json() as T & { original_language?: string }; return { ...m, runtime: d.runtime ?? null, genre_ids: (d.genres || []).map((x) => x.id), ol: d.original_language } as T; } catch { return m; } }));
  const all: Out[] = detailed.map((m) => ({ id: m.id, t: m.title, y: Number((m.release_date || '0').slice(0, 4)), r: Math.round(m.vote_average * 10) / 10, g: (m.genre_ids || []).map((x) => GN[x]).filter(Boolean), o: m.overview, p: m.poster_path as string, w: false, pop: m.vote_count, rt: null, ...(m.runtime ? { rn: m.runtime } : {}), ...(m.ol && m.ol !== 'en' ? { ol: m.ol } : {}) }));
  const v = validateBatch(all, cons); const sups: Sup[] = [...(body.sup || []).map((x) => ({ k: x.k, until: 1e9 })), ...avoid.map((k) => ({ k, until: 1e9 }))]; const clear = v.ok.filter((m) => !supHit(m, sups, 0));
  const want = body.n || (pivot ? 14 : 10 + Math.floor(rnd() * 6));
  const movies = clear.slice(0, want);
  return NextResponse.json({ movies, calls, seed, validated: { in: all.length, kept: v.ok.length, rejected: v.rejected, served: movies.length, allValid: validateBatch(movies, cons).rejected === 0 } });
}
