// THE VERDICT - shareable report-card payload. The whole card travels inside the
// share URL itself (base64url JSON in ?c=), so a shared link works forever with
// no database and no login - perfect for pasting into group chats.

export type VerdictCard = {
  v: 1;
  g: string; // effort grade letter
  s: number; // score /100
  r: 'won' | 'lost' | 'drew';
  o: string; // opponent label, e.g. 'CLUB CHESTER'
  m: number; // game length in plies
  acc?: number; // accuracy %
  h: string; // Chester's headline
  tp: string; // the turning point
  fm: string; // the funniest moment
  l: string; // one lesson
};

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeVerdict(card: VerdictCard): string {
  return toBase64Url(JSON.stringify(card));
}

export function decodeVerdict(param: string | null | undefined): VerdictCard | null {
  if (!param || param.length > 4000) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(param)) as Partial<VerdictCard>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.g !== 'string' || typeof parsed.s !== 'number' || typeof parsed.h !== 'string') return null;
    if (parsed.r !== 'won' && parsed.r !== 'lost' && parsed.r !== 'drew') return null;
    const clip = (x: unknown, n: number) => (typeof x === 'string' ? x.slice(0, n) : '');
    return {
      v: 1,
      g: clip(parsed.g, 4) || '?',
      s: Math.max(0, Math.min(100, Math.round(parsed.s))),
      r: parsed.r,
      o: clip(parsed.o, 24) || 'CHESTER',
      m: typeof parsed.m === 'number' ? Math.max(0, Math.round(parsed.m)) : 0,
      acc: typeof parsed.acc === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.acc))) : undefined,
      h: clip(parsed.h, 160),
      tp: clip(parsed.tp, 240),
      fm: clip(parsed.fm, 240),
      l: clip(parsed.l, 240),
    };
  } catch {
    return null;
  }
}
