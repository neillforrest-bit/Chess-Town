import { NextResponse } from 'next/server';
/** Client crash reports land in the server log (Vercel runtime logs) so a dead page can be traced. */
export async function POST(req: Request) { const b = await req.json().catch(() => ({})); console.error('CLIENT_ERR', JSON.stringify(b).slice(0, 900)); return NextResponse.json({ ok: true }); }
