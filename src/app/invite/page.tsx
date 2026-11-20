'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/** v2.2 Callsign Invite Pipeline: an invite link lands here first. Player 2 must declare a callsign before they ever see the lobby. */
function Onboard() {
  const sp = useSearchParams(); const router = useRouter();
  const gameId = (sp.get('gameId') || sp.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const [callsign, setCallsign] = useState(''); const [host, setHost] = useState('');
  useEffect(() => { if (!gameId) return; fetch(`/api/room/${gameId}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => { const n = d?.players?.A?.name; if (n) setHost(n); }).catch(() => {}); }, [gameId]);
  const join = () => { const c = callsign.trim().slice(0, 14); if (!c || !gameId) return; try { localStorage.setItem('cs-name', c); } catch { /* private mode */ } router.push(`/play/${gameId}?p=B&n=${encodeURIComponent(c)}`); };
  if (!gameId) return <main className="cs-invite"><div className="cs-invite-in"><h1>No room in this link</h1><p>Ask your partner to send the invite again.</p></div></main>;
  return <main className="cs-invite"><div className="cs-invite-in">
    <div className="cs-logo">CINE<b>SYNC</b></div>
    <p className="cs-invite-sub">{host ? `${host} has summoned you to room ${gameId}.` : `You have been summoned to room ${gameId}.`}</p>
    <h1>Enter your callsign</h1>
    <input className="cs-invite-input" autoFocus maxLength={14} placeholder="e.g., Alex" value={callsign} onChange={(e) => setCallsign(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
    <button className="cs-btn cs-btn--gold" disabled={!callsign.trim()} onClick={join}>ENTER THE LOBBY</button>
    <p className="cs-small">Orson will use this name all night. Choose wisely.</p>
  </div></main>;
}
export default function Page() { return <Suspense fallback={null}><Onboard /></Suspense>; }
