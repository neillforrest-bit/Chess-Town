import { NextRequest, NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function guardAiRequest(req: NextRequest, maxBytes = 24_000, limit = 20) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  const now = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = `${req.nextUrl.pathname}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  if (bucket.count >= limit) {
    return NextResponse.json({ error: 'Chester needs a short breather. Try again in a minute.' }, { status: 429 });
  }
  bucket.count += 1;
  return null;
}

export function safeAiError(label: string, error: unknown) {
  console.error(`[${label}] request failed`, error);
  return NextResponse.json({ error: 'Chester could not answer just now. Please try again.' }, { status: 500 });
}
