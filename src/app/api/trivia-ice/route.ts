import { NextResponse } from 'next/server';

// Trivia-only configuration. Never expose a provider API key to the browser.
// TRIVIA_TURN_SERVERS contains RTCIceServer entries, not provider API keys.
export async function GET() {
  const stun = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };
  let relay: RTCIceServer[] = [];
  try {
    const configured: unknown = JSON.parse(process.env.TRIVIA_TURN_SERVERS || '[]');
    if (Array.isArray(configured)) relay = configured.filter((entry): entry is RTCIceServer => {
      if (!entry || typeof entry !== 'object') return false;
      const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
      return urls.length > 0 && urls.length <= 6 && urls.every((url: unknown) => typeof url === 'string' && /^turns?:[^\s]+$/.test(url))
        && typeof entry.username === 'string' && Boolean(entry.username.trim())
        && typeof entry.credential === 'string' && Boolean(entry.credential.trim());
    }).slice(0, 6).map(({ urls, username, credential }) => ({ urls, username, credential }));
  } catch { /* Invalid configuration stays direct-only, with an honest UI warning. */ }
  return NextResponse.json({ iceServers: [stun, ...relay], relayConfigured: relay.length > 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
