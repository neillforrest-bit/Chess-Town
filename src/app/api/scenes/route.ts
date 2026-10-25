import { NextResponse } from 'next/server';
import { BY_ID, MOVIES } from '@/lib/game';

// Scene-setting rounds: serve four recognisable poster films per round.
// Round 1 spreads across distinct genre lanes; round 2 tests the read (2 in the guessed lanes, 2 in untried lanes).
// Catalogue only - no paid calls.

const LANES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Science Fiction', 'Fantasy', 'Animation', 'Crime', 'Mystery'];

const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

type F = { id: number; t: string; y: number; g: string[]; p: string; pop: number };

const slim = (m: F) => ({ id: m.id, t: m.t, y: m.y, g: m.g, p: m.p });

// pick a recognisable film whose genres do not overlap films already chosen this round - clean signal per pick
function takeDistinct(pool: F[], chosen: F[], lane: string | null, r: () => number): F | null {
  const c = pool
    .filter((m) => (!lane || m.g.includes(lane)) && !chosen.some((x) => x.g.some((g) => m.g.includes(g))))
    .sort((a, b) => b.pop - a.pop);
  if (!c.length) return null;
  return c[Math.floor(r() * Math.min(5, c.length))];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { round?: number; pickedIds?: number[]; ban?: number[]; seed?: number };
  const round = body.round === 2 ? 2 : 1;
  const r = rng(Number.isFinite(body.seed) ? (body.seed as number) : Date.now());
  const ban = new Set<number>([...(body.ban || []), ...(body.pickedIds || [])]);
  const pool = MOVIES.filter((m) => m.p && m.o && !ban.has(m.id) && m.pop >= 200 && m.r >= 6.5) as F[];

  let picks: F[] = [];
  if (round === 1) {
    const lanes = [...LANES].sort(() => r() - 0.5);
    for (const l of lanes) {
      const f = takeDistinct(pool, picks, l, r);
      if (f) picks.push(f);
      if (picks.length === 4) break;
    }
  } else {
    const picked = (body.pickedIds || []).map((id) => BY_ID[id]).filter(Boolean) as F[];
    const guessed = Array.from(new Set(picked.flatMap((m) => m.g))).filter((g) => LANES.includes(g));
    for (const l of guessed.sort(() => r() - 0.5)) {
      const f = takeDistinct(pool, picks, l, r);
      if (f) picks.push(f);
      if (picks.length === 2) break;
    }
    const probe = LANES.filter((l) => !guessed.includes(l)).sort(() => r() - 0.5);
    for (const l of probe) {
      const f = takeDistinct(pool, picks, l, r);
      if (f) picks.push(f);
      if (picks.length === 4) break;
    }
    // backfill if lanes were too thin
    while (picks.length < 4) { const f = takeDistinct(pool, picks, null, r); if (!f) break; picks.push(f); }
    picks = picks.sort(() => r() - 0.5);
  }
  return NextResponse.json({ films: picks.map(slim) });
}
