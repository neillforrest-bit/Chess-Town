'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

export default function Home() {
  const r = useRouter();
  const [name, setName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('cs-name') || '' : ''));
  const [code, setCode] = useState('');
  const go = (path: string) => { localStorage.setItem('cs-name', name.trim()); r.push(path); };
  return (
    <main className="cs-home">
      <div className="cs-logo">CINE<b>SYNC</b></div>
      <p className="cs-tag">Two phones. Thirty films. One winner. No more couch gridlock.</p>
      <input className="cs-input" placeholder="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="cs-btn cs-btn--gold" onClick={() => go(`/play/${makeCode()}?p=A&n=${encodeURIComponent(name.trim())}`)}>START A ROOM</button>
      <div className="cs-or">or join your partner</div>
      <div className="cs-row">
        <input className="cs-input cs-input--code" placeholder="CODE" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="cs-btn" disabled={code.length < 4} onClick={() => go(`/play/${code}?p=B&n=${encodeURIComponent(name.trim())}`)}>JOIN</button>
      </div>
      <p className="cs-small">Got a TV? Open the room code on it at <b>/tv/CODE</b> and cast the screen.</p>
    </main>
  );
}
