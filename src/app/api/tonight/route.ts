import { NextResponse } from 'next/server';
import { BY_ID } from '@/lib/game';

export const maxDuration = 30;
const GN: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const GID: Record<string, number> = Object.fromEntries(Object.entries(GN).map(([k, v]) => [v, Number(k)]));

type TM = { id: number; title: string; release_date?: string; vote_average: number; vote_count: number; overview: string; poster_path: string | null; genre_ids?: number[]; popularity: number };
type Pick = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; pop: number; rn: number | null; rt: number | null; imdb: number | null; mc: number | null; why: string; whyKind: 'loved' | 'mood' | 'wild'; providers: string[]; trailer: string | null; wild: boolean };

const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Tonight Mode engine: provider-filtered TMDB discovery, ranked against the household's loved films. TMDB free key only - no paid calls. */
export async function POST(req: Request) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return NextResponse.json({ picks: [], error: 'no key' });
  const body = await req.json().catch(() => ({})) as {
    moodGenres?: string[]; moodLabel?: string; lovedIds?: number[]; services?: string[]; hardNos?: string[];
    capMin?: number | null; ban?: number[]; seed?: number; pivot?: boolean;
  };
  const seed = Number.isFinite(body.seed) ? Number(body.seed) : Date.now(); const rnd = rng(seed);
  const moodIds = (body.moodGenres || []).map((g) => GID[g]).filter(Boolean);
  const noIds = (body.hardNos || []).map((g) => GID[g]).filter(Boolean);
  const ban = new Set<number>([...(body.ban || []), ...(body.lovedIds || [])]);

  // loved-film genre memory for ranking + WHY lines (catalogue knows these titles)
  const loved = (body.lovedIds || []).map((id) => BY_ID[id]).filter(Boolean).slice(0, 8);
  const lovedGenres = new Map<string, string>(); // genre -> a loved title carrying it
  for (const m of loved) for (const g of m.g) if (!lovedGenres.has(g)) lovedGenres.set(g, m.t);

  // resolve the user's service names to TMDB provider ids from the live GB provider list (no hardcoded ids)
  let providerIds: number[] = []; let matchedServices: string[] = [];
  const wanted = (body.services || []).map((s) => s.toLowerCase());
  if (wanted.length) {
    try {
      const pr = await fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${key}&watch_region=GB`, { signal: AbortSignal.timeout(6000) });
      const pd = await pr.json() as { results?: { provider_id: number; provider_name: string }[] };
      for (const p of pd.results || []) {
        const n = p.provider_name.toLowerCase();
        if (wanted.some((w) => n.includes(w) || w.includes(n))) { providerIds.push(p.provider_id); matchedServices.push(p.provider_name); }
      }
    } catch { /* provider filter skipped; chips still shown per pick */ }
  }

  const base = (): Record<string, string> => {
    const q: Record<string, string> = {
      language: 'en-US', include_adult: 'false', watch_region: 'GB',
      'vote_count.gte': '150', 'vote_average.gte': '6.5',
      sort_by: 'vote_average.desc', page: String(Math.floor(rnd() * 4) + 1),
    };
    if (providerIds.length) { q.with_watch_providers = providerIds.join('|'); q.with_watch_monetization_types = 'flatrate|free|ads'; }
    if (noIds.length) q.without_genres = noIds.join(',');
    if (body.capMin) { q['with_runtime.lte'] = String(body.capMin); q['with_runtime.gte'] = '60'; }
    return q;
  };
  const g = (path: string, q: Record<string, string>) => fetch(`https://api.themoviedb.org/3/${path}?` + new URLSearchParams({ api_key: key, ...q }), { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).catch(() => ({}));

  // main pool: mood-led; pivot reshuffles with a different sort/page
  const mainQ = base();
  if (moodIds.length) mainQ.with_genres = moodIds.join('|');
  if (body.pivot) { mainQ.sort_by = 'popularity.desc'; mainQ.page = String(Math.floor(rnd() * 6) + 1); }
  // wildcard pool: outside the loved genres, still inside services and hard nos
  const wildQ = base(); {
    const lovedIds2 = Array.from(lovedGenres.keys()).map((x) => GID[x]).filter(Boolean);
    const exclude = Array.from(new Set([...noIds, ...lovedIds2, ...moodIds]));
    if (exclude.length) wildQ.without_genres = exclude.join(',');
    wildQ.page = String(Math.floor(rnd() * 5) + 1);
  }
  const [mainD, wildD] = await Promise.all([g('discover/movie', mainQ), g('discover/movie', wildQ)]);

  const score = (m: TM): { s: number; why: string; whyKind: 'loved' | 'mood' } => {
    const gs = (m.genre_ids || []).map((x) => GN[x]).filter(Boolean);
    let s = m.vote_average * 2 + Math.log10(Math.max(10, m.vote_count));
    let best: string | null = null;
    for (const x of gs) { if (lovedGenres.has(x)) { s += 2.5; best = best || lovedGenres.get(x)!; } }
    if (best) return { s, why: `Because you loved ${best}.`, whyKind: 'loved' };
    return { s, why: body.moodLabel ? `Fits tonight's ${body.moodLabel.toLowerCase()} mood.` : 'Fresh ground for the household.', whyKind: 'mood' };
  };

  const seen = new Set<number>(ban);
  const cand = ((mainD as { results?: TM[] }).results || []).filter((m) => m.poster_path && m.overview && !seen.has(m.id));
  for (const m of cand) seen.add(m.id);
  const ranked = cand.map((m) => ({ m, ...score(m) })).sort((a, b) => b.s - a.s).slice(0, 3);
  const wildC = ((wildD as { results?: TM[] }).results || []).find((m) => m.poster_path && m.overview && !seen.has(m.id));

  // enrich finalists: runtime, GB providers, YouTube trailer - 3 calls per pick, free key
  const enrich = async (m: TM, why: string, whyKind: Pick['whyKind'], wild: boolean): Promise<Pick> => {
    const [det, prov, vid] = await Promise.all([
      g(`movie/${m.id}`, { 'language': 'en-US' }) as Promise<{ runtime?: number; genres?: { id: number }[] }>,
      g(`movie/${m.id}/watch/providers`, {}) as Promise<{ results?: Record<string, { flatrate?: { provider_name: string }[]; ads?: { provider_name: string }[]; free?: { provider_name: string }[] }> }>,
      g(`movie/${m.id}/videos`, { language: 'en-US' }) as Promise<{ results?: { type: string; site: string; key: string }[] }>,
    ]);
    const gb = prov.results?.GB;
    const providers = Array.from(new Set([...(gb?.flatrate || []), ...(gb?.ads || []), ...(gb?.free || [])].map((x) => x.provider_name))).slice(0, 4);
    const vids = vid.results || [];
    const t = vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube');
    const cat = BY_ID[m.id];
    const gs = (det.genres || []).map((x) => GN[x.id]).filter(Boolean);
    return {
      id: m.id, t: m.title, y: Number((m.release_date || '0').slice(0, 4)), r: Math.round(m.vote_average * 10) / 10,
      g: gs.length ? gs : (m.genre_ids || []).map((x) => GN[x]).filter(Boolean), o: m.overview, p: m.poster_path as string, pop: m.vote_count,
      rn: det.runtime ?? cat?.rn ?? null, rt: cat?.rt ?? null, imdb: cat?.imdb ?? null, mc: cat?.mc ?? null,
      why, whyKind, providers, trailer: t ? t.key : null, wild,
    };
  };
  const picks = await Promise.all([
    ...ranked.map((x) => enrich(x.m, x.why, x.whyKind, false)),
    ...(wildC ? [enrich(wildC, 'The wildcard: outside your usual taste, on purpose. Ignore it freely.', 'wild' as const, true)] : []),
  ]);
  return NextResponse.json({ picks, matchedServices, providerFiltered: providerIds.length > 0, seed });
}
