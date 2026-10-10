'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

export default function Home() {
  const r = useRouter();
  const [name, setName] = useState('');
  const [p2, setP2] = useState('Player 2'); const [modal, setModal] = useState(false);
  useEffect(() => { setName(localStorage.getItem('cs-name') || ''); setP2(localStorage.getItem('cs-p2') || 'Player 2'); if (!localStorage.getItem('cs-callsigns')) { setName((n) => n || 'Player 1'); setModal(true); } }, []);
  const saveCallsigns = () => { localStorage.setItem('cs-name', (name || 'Player 1').trim()); localStorage.setItem('cs-p2', (p2 || 'Player 2').trim()); localStorage.setItem('cs-callsigns', '1'); setName((name || 'Player 1').trim()); setModal(false); };
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'movie' | 'series'>('movie');
  const go = (path: string) => { localStorage.setItem('cs-name', name.trim()); r.push(path); };
  return (
    <main className="cs-home">
      {modal && <div className="cs-callsign"><div>
        <h2>Pre-flight: pick your callsigns</h2>
        <label>PLAYER 1 CALLSIGN</label><input className="cs-input" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
        <label>PLAYER 2 CALLSIGN</label><input className="cs-input" maxLength={14} value={p2} onChange={(e) => setP2(e.target.value)} />
        <button className="cs-btn cs-btn--gold" onClick={saveCallsigns}>CLEARED FOR TAKEOFF</button></div></div>}
      <div className="cs-logo">CINE<b>SYNC</b></div>
      <p className="cs-tag">Two phones. One winner. No more couch gridlock.</p>
      <input className="cs-input" placeholder="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="cs-kind"><button className={kind === 'movie' ? 'is-on' : ''} onClick={() => setKind('movie')}>MOVIE NIGHT</button><button className={kind === 'series' ? 'is-on' : ''} onClick={() => setKind('series')}>SERIES BINGE</button></div>
      <button className="cs-btn cs-btn--gold" onClick={() => go(`/play/${makeCode()}?p=A&n=${encodeURIComponent(name.trim())}&n2=${encodeURIComponent(p2.trim())}${kind === 'series' ? '&k=series' : ''}`)}>START A {kind === 'series' ? 'SERIES' : 'MOVIE'} ROOM</button>
      <button className="cs-btn" onClick={() => go(`/solo?k=${kind}&n=${encodeURIComponent(name.trim())}`)}>SOLO GAUNTLET · YOU VS ORSON</button>
      <div className="cs-or">or join your partner</div>
      <div className="cs-row">
        <input className="cs-input cs-input--code" placeholder="CODE" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="cs-btn" disabled={code.length < 4} onClick={() => go(`/play/${code}?p=B&n=${encodeURIComponent(name.trim())}`)}>JOIN</button>
      </div>
      <p className="cs-small">Got a TV? Open the room code on it at <b>/tv/CODE</b> and cast the screen.</p>
    </main>
  );
}
