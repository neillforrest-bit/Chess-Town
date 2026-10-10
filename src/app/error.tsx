'use client';
import { useEffect } from 'react';

/** Never dead-end: any client exception lands here with a one-tap rejoin that keeps the room URL, and the message is shown so it can be screenshotted. */
export default function Err({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { try { fetch('/api/clienterr', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ m: String(error?.message || '').slice(0, 300), s: String(error?.stack || '').slice(0, 600), u: location.pathname + location.search }) }).catch(() => {}); } catch { /* none */ } }, [error]);
  return <main className="cs-home" style={{ textAlign: 'center', alignItems: 'center' }}>
    <div className="cs-logo">CINE<b>SYNC</b></div>
    <p className="cs-tag">Orson dropped the reel. Your room is safe.</p>
    <button className="cs-btn cs-btn--gold" onClick={() => { try { reset(); } catch { /* none */ } location.reload(); }}>REJOIN THE ROOM</button>
    <a className="cs-btn" href="/" style={{ textAlign: 'center' }}>BACK TO START</a>
    <p className="cs-small" style={{ opacity: 0.6, wordBreak: 'break-word' }}>{String(error?.message || '').slice(0, 160)}</p>
  </main>;
}
