import { NextRequest, NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export async function guardAiRequest(req: NextRequest, maxBytes = 24_000, limit = 20) {
  // Shared across aliases so switching URLs cannot mint another allowance.
  limit = Math.min(20, limit);
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!buckets.has(ip) && buckets.size >= 10000) return NextResponse.json({ error: 'Chester is busy. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  const bucket = buckets.get(ip);
  if (bucket && bucket.resetAt > now && bucket.count >= limit) return NextResponse.json({ error: 'Chester needs a short breather. Try again in a minute.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))) } });
  if (!bucket || bucket.resetAt <= now) buckets.set(ip, { count: 1, resetAt: now + 60000 }); else bucket.count++;
  if (Number(req.headers.get('content-length') || 0) > maxBytes) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  // Content-Length may be absent or false. Inspect a clone before JSON parsing.
  const reader = req.clone().body?.getReader(); let bytes = 0;
  if (reader) {
    try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > maxBytes) { void reader.cancel(); return NextResponse.json({ error: 'Request is too large.' }, { status: 413 }); } } }
    catch { return NextResponse.json({ error: 'Request could not be read.' }, { status: 400 }); }
    finally { reader.releaseLock(); }
  }
  return null;
}

export function safeAiError(label: string, error: unknown) {
  console.error(`[${label}] request failed`, error);
  return NextResponse.json({ error: 'Chester could not answer just now. Please try again.' }, { status: 500 });
}
