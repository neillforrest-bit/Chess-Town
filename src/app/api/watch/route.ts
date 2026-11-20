import { NextResponse } from 'next/server';

/** Where to stream the locked winner. TMDB watch providers only (no AI), UK first then US. Never depends on Gemini. */
type P = { provider_name: string };
type R = { flatrate?: P[]; rent?: P[]; buy?: P[]; ads?: P[]; free?:P[]; link?:string };
export async function POST(req: Request) {
  const key = process.env.TMDB_API_KEY;
  const { id, tv, region: requestedRegion } = await req.json().catch(() => ({})) as { id?: number; tv?: boolean;region?:string };
  if (!key || !Number.isSafeInteger(id) || !id || id<1) return NextResponse.json({ ok: false, error: key ? 'no id' : 'no key' });
  try {
    const response = await fetch(`https://api.themoviedb.org/3/${tv ? 'tv' : 'movie'}/${id}/watch/providers?api_key=${key}`, { signal: AbortSignal.timeout(8000),next:{revalidate:3600} }); if(!response.ok)throw Error('source'); const j=await response.json() as { results?: Record<string, R> };
    const names = (a?: P[]) => (a || []).slice(0, 5).map((x) => x.provider_name);
    for (const region of requestedRegion==='GB'?['GB']:['GB', 'US']) {
      const r = j.results?.[region]; if (!r) continue;
      const stream = names(r.flatrate), free = [...new Set([...names(r.free),...names(r.ads)])], rent = names(r.rent), buy = names(r.buy);
      if (stream.length || free.length || rent.length || buy.length) return NextResponse.json({ ok: true, region, stream, free, rent, buy, link:r.link?.startsWith('https://www.themoviedb.org/')?r.link:undefined });
    }
    return NextResponse.json({ ok: true, region: 'GB', stream: [], free: [], rent: [], buy: [] });
  } catch { return NextResponse.json({ ok: false, error: 'fetch failed' }); }
}
