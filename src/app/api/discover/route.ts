import { NextResponse } from 'next/server';

export const maxDuration = 30;
const GN: Record<number, string> = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western' };
type T = { id: number; title: string; release_date?: string; vote_average: number; vote_count: number; overview: string; poster_path: string | null; genre_ids: number[]; popularity: number };

/** "The Vibe Check": slider scores (0-100 each) become TMDB discover/movie queries. Page offset is random 1-5 on every call so the top results change every run. */
export async function POST(req: Request) {
  const key = process.env.TMDB_API_KEY; const body = await req.json().catch(() => ({})) as { sl?: number[]; ban?: number[] };
  const sl = (body.sl || [50, 50, 50]).map((x) => Math.max(0, Math.min(100, Number(x) || 50)));
  if (!key) return NextResponse.json({ movies: [], error: 'no key' });
  const [lightness, bb, brainOff] = sl;
  // slider 1 Dark/Gritty(0) <-> Light/Fun(100)  -> genres
  const g1 = lightness < 40 ? '53|80|27|9648' : lightness > 60 ? '35|16|10751|10749' : '';
  // slider 3 Brain-Bending(0) <-> Turn-Brain-Off(100) -> genres
  const g2 = brainOff < 40 ? '878|9648|53|14' : brainOff > 60 ? '28|35|12|16' : '';
  // slider 2 Indie/Auteur(0) <-> Blockbuster(100) -> vote_count / sort filters (TMDB discover has no budget filter)
  const vc = bb < 35 ? { gte: 200, lte: 3500, sort: 'vote_average.desc', minAvg: 7.0 } : bb > 65 ? { gte: 6000, lte: 0, sort: 'popularity.desc', minAvg: 6.3 } : { gte: 1200, lte: 0, sort: 'vote_average.desc', minAvg: 6.8 };
  const jobs: { genres: string; page: number }[] = [];
  const pg = () => Math.floor(Math.random() * 5) + 1;
  if (g1) jobs.push({ genres: g1, page: pg() }); if (g2) jobs.push({ genres: g2, page: pg() });
  jobs.push({ genres: g1 && g2 ? '' : g1 || g2, page: pg() }); jobs.push({ genres: g1 || g2, page: pg() });
  const seen = new Set<number>(body.ban || []); const out: { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; w: boolean; pop: number; rt: null }[] = [];
  const calls: string[] = [];
  await Promise.all(jobs.map(async (j) => {
    const q = new URLSearchParams({ api_key: key, language: 'en-US', include_adult: 'false', sort_by: vc.sort, page: String(j.page), 'vote_count.gte': String(vc.gte), 'vote_average.gte': String(vc.minAvg), 'primary_release_date.gte': '1990-01-01', with_original_language: 'en' });
    if (vc.lte) q.set('vote_count.lte', String(vc.lte)); if (j.genres) q.set('with_genres', j.genres);
    calls.push(`page ${j.page} genres ${j.genres || 'any'}`);
    try { const r = await fetch('https://api.themoviedb.org/3/discover/movie?' + q, { signal: AbortSignal.timeout(8000) }); const d = await r.json() as { results?: T[] };
      for (const m of d.results || []) { if (!m.poster_path || !m.overview || seen.has(m.id)) continue; seen.add(m.id);
        out.push({ id: m.id, t: m.title, y: Number((m.release_date || '0').slice(0, 4)), r: Math.round(m.vote_average * 10) / 10, g: m.genre_ids.map((x) => GN[x]).filter(Boolean), o: m.overview, p: m.poster_path, w: false, pop: m.vote_count, rt: null }); }
    } catch { /* skip this call */ }
  }));
  return NextResponse.json({ movies: out.sort(() => Math.random() - 0.5).slice(0, 30), calls });
}
