import { NextResponse } from 'next/server';
/** Same-origin poster proxy so the browser canvas can read pixels for palette extraction (TMDB sends no CORS header). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('p') || '';
  if (!/^\/[A-Za-z0-9_-]{10,40}\.jpg$/.test(p)) return NextResponse.json({ error: 'bad path' }, { status: 400 });
  try {
    const r = await fetch(`https://image.tmdb.org/t/p/w92${p}`); if (!r.ok) return NextResponse.json({ error: 'upstream' }, { status: 502 });
    return new NextResponse(await r.arrayBuffer(), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch { return NextResponse.json({ error: 'fetch failed' }, { status: 502 }); }
}
