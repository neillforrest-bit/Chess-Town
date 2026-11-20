'use client';
import { useState } from 'react';
import s from '@/components/TvBig.module.css';

export default function TvHub() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [making, setMaking] = useState(false);

  async function startHere() {
    setMaking(true); setErr('');
    try {
      const rnd = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
      const c = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
      const r = await fetch('/api/duo/' + c, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'tvCreate', invite: rnd(32), round: 0, actionId: rnd(16) }) });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Could not create the room');
      location.assign('/tv/duo/' + c);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create the room. Try again.'); setMaking(false); }
  }

  async function open() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{8}$/.test(c)) { setErr('Room codes are 8 letters and numbers, shown on a player\'s phone.'); return; }
    setBusy(true); setErr('');
    try {
      const ticket = await fetch('/api/movie-tournament/' + c + '?spectate=1', { cache: 'no-store' });
      if (ticket.ok) { location.assign('/tv/ticket/' + c); return; }
      const duo = await fetch('/api/duo/' + c + '?spectate=1', { cache: 'no-store' });
      if (duo.ok) { location.assign('/tv/duo/' + c); return; }
      setErr('No live Movie Time room with that code. Check a player\'s phone and try again.');
    } catch { setErr('Connection trouble. Try again.'); }
    finally { setBusy(false); }
  }

  return <main className={s.page}>
    <header className={s.top}><span>MOVIE TIME · BIG SCREEN</span><span>PROJECTOR MODE</span></header>
    <section className={s.stage}>
      <p className={s.tag}>PHONES ARE THE CONTROLLERS · THIS SCREEN ONLY WATCHES</p>
      <h1 className={s.huge}>Movie Time, on the big screen.</h1>
      <p className={s.sub}>Start a Ticket Cup or Duo Night on a phone, then type its room code here. The room plays out live on this screen while both players keep their phones.</p>
      <input
        aria-label="Room code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
        maxLength={8}
        placeholder="ROOM CODE"
        style={{ fontSize: '6vmin', letterSpacing: '1.4vmin', textAlign: 'center', width: 'min(70%,60vmin)', padding: '1.6vmin', background: '#f8edff', color: '#2d0f55', border: '.3vmin solid #c9a6ff', borderRadius: '1.2vmin', fontWeight: 800 }}
      />
      <button onClick={open} disabled={busy} style={{ fontSize: '2.6vmin', padding: '1.6vmin 5vmin', borderRadius: '1.4vmin', border: 0, background: '#d9ee9c', color: '#271045', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'LOOKING…' : 'WATCH THIS ROOM →'}</button>
      {err && <p className={s.sub} role="alert">{err}</p>}
      <p className={s.tag} style={{ marginTop: '3vmin' }}>OR</p>
      <button onClick={startHere} disabled={making} style={{ fontSize: '3vmin', padding: '2vmin 6vmin', borderRadius: '1.4vmin', border: '.35vmin solid #d9ee9c', background: 'transparent', color: '#d9ee9c', fontWeight: 800, cursor: 'pointer' }}>{making ? 'SETTING THE TABLE…' : '🎬 START A GAME ON THIS SCREEN'}</button>
      <p className={s.sub}>Creates a Duo Night room right here: both players scan the big QR (or type the code on their phones) to take the two seats, then the game plays on this screen.</p>
      <p className={s.sub}>Works with a Ticket Cup room or a Duo Night room. The old CineSync big screen still lives at /tv/CODE with its own 4-letter code.</p>
    </section>
    <footer className={s.foot}><span>Full screen this browser for the projector (F11 on most remotes).</span><span>ORSON ON RULES · NO PAID AI</span></footer>
  </main>;
}
