import { NextResponse } from 'next/server';

export const maxDuration = 20;
type Rv = { author: string; content: string; author_details?: { rating?: number | null } };

/** Tale of the Tape: the most polarised TMDB user review per film (rating furthest from 5.5; ties go to the longer text). TMDB only: no OMDB key exists. */
export async function POST(req: Request) {
  const key = process.env.TMDB_API_KEY; const { ids } = await req.json().catch(() => ({ ids: [] })) as { ids?: number[] };
  const out: Record<number, { a: string; q: string; r: number | null }> = {};
  if (!key) return NextResponse.json({ map: out, error: 'no key' });
  await Promise.all((ids || []).slice(0, 8).map(async (id) => {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/movie/${id}/reviews?api_key=${key}&language=en-US&page=1`, { signal: AbortSignal.timeout(8000) });
      const d = await r.json() as { results?: Rv[] }; const rs = (d.results || []).filter((x) => x.content && x.content.length > 40);
      if (!rs.length) return;
      const score = (x: Rv) => (x.author_details?.rating == null ? 0.5 : Math.abs(x.author_details.rating - 5.5)) * 1000 + Math.min(x.content.length, 900) / 10;
      const best = rs.sort((a, b) => score(b) - score(a))[0];
      let q = best.content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/[*_#>]/g, '').trim();
      const cut = q.slice(0, 170); const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      q = dot > 60 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, '') + '...';
      out[id] = { a: best.author.slice(0, 20), q, r: best.author_details?.rating ?? null };
    } catch { /* no review for this one */ }
  }));
  return NextResponse.json({ map: out });
}
