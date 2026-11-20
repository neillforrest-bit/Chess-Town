import { NextResponse, after } from 'next/server';
import { getRoom, runIntent as run, effects } from '@/lib/engine';
import type { Intent } from '@/lib/game';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const ok = (c: string) => /^[A-Z0-9]{3,8}$/i.test(c);

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; if (!ok(code)) return NextResponse.json({ error: 'bad code' }, { status: 400 });
  return NextResponse.json(await getRoom(code.toUpperCase()), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params; if (!ok(raw)) return NextResponse.json({ error: 'bad code' }, { status: 400 });
  const code = raw.toUpperCase();
  const body = (await req.json()) as { it?: Intent };
  if (!body.it || typeof (body.it as { t?: string }).t !== 'string') return NextResponse.json({ error: 'bad intent' }, { status: 400 });
  const { state, changed } = await run(code, body.it);
  if (changed) { const origin = new URL(req.url).origin; after(async () => { await effects(code, origin); await effects(code, origin); }); }
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
