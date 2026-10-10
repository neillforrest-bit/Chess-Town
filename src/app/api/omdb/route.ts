import { NextResponse } from 'next/server';

export const maxDuration = 15;
/** OMDB lookup for Orson Takes the Wheel. Needs OMDB_API_KEY in the server env; without it returns 503 and the client falls back to catalogue scores. */
export async function POST(req: Request) {
  const key = process.env.OMDB_API_KEY; if (!key) return NextResponse.json({ error: 'no key' }, { status: 503 });
  const b = await req.json().catch(() => ({})) as { imdb?: string; t?: string; y?: number };
  const q = /^tt\d{6,9}$/.test(b.imdb || '') ? `i=${b.imdb}` : `t=${encodeURIComponent(b.t || '')}&y=${Number(b.y) || ''}`;
  try {
    const d = await (await fetch(`https://www.omdbapi.com/?apikey=${key}&${q}`)).json() as { Response?: string; Metascore?: string; imdbRating?: string; Ratings?: { Source: string; Value: string }[] };
    if (d.Response !== 'True') return NextResponse.json({ error: 'not found' }, { status: 404 });
    const num = (x?: string) => { const n = parseFloat(String(x || '')); return Number.isFinite(n) ? n : null; };
    const rt = num((d.Ratings || []).find((r) => /rotten/i.test(r.Source))?.Value);
    return NextResponse.json({ rt, mc: num(d.Metascore), imdb: num(d.imdbRating) });
  } catch { return NextResponse.json({ error: 'fetch failed' }, { status: 502 }); }
}
