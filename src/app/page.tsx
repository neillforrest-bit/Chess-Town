'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BY_ID } from '@/lib/game';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

type NightId = 'classic' | 'series' | 'oscar' | 'rotten' | 'clash' | 'docs' | 'docs_tc' | 'docs_crazy' | 'docs_power' | 'docs_nature' | 'docs_music';
const NIGHTS: { id: NightId; ic: string; n: string; t: string }[] = [
  { id: 'classic', ic: '🎬', n: 'Movie night', t: 'Mood, draft, bracket. The full game.' },
  { id: 'series', ic: '📺', n: 'Series binge', t: 'Same game, TV shows.' },
  { id: 'oscar', ic: '🏆', n: 'Oscar Gauntlet', t: 'Award winners only. Gold theme.' },
  { id: 'rotten', ic: '🍅', n: 'Rotten Roll', t: 'Films under 60% RT. Glitchy.' },
  { id: 'clash', ic: '⚔️', n: 'Genre Clash', t: 'Two opposing genres fight it out.' },
  { id: 'docs', ic: '🎥', n: 'Doc Night', t: 'All documentaries. Every true story in the house.' },
  { id: 'docs_tc', ic: '🔪', n: 'True Crime Docs', t: 'Real cases, real chills.' },
  { id: 'docs_crazy', ic: '🤯', n: 'Crazy Stories', t: 'Stranger than fiction. Actually happened.' },
  { id: 'docs_power', ic: '🌍', n: 'Money & Power', t: 'Global politics, economies, who runs the world.' },
  { id: 'docs_nature', ic: '🌋', n: 'Nature & Science', t: 'The planet, space and the wild, explained.' },
  { id: 'docs_music', ic: '🎸', n: 'Music & Culture', t: 'Icons, movements and scenes.' },
];
export default function Home() {
  const r = useRouter();
  const [name, setName] = useState('');
  const [p2, setP2] = useState('Player 2'); const [modal, setModal] = useState(false);
  useEffect(() => { setName(localStorage.getItem('cs-name') || ''); setP2(localStorage.getItem('cs-p2') || 'Player 2'); if (!localStorage.getItem('cs-callsigns')) { setName((n) => n || 'Player 1'); setModal(true); } }, []);
  const saveCallsigns = () => { localStorage.setItem('cs-name', (name || 'Player 1').trim()); localStorage.setItem('cs-p2', (p2 || 'Player 2').trim()); localStorage.setItem('cs-callsigns', '1'); setName((name || 'Player 1').trim()); setModal(false); };
  const [code, setCode] = useState('');
  const [gv, setGv] = useState(false); const [grave, setGrave] = useState<number[]>([]);
  useEffect(() => { try { setGrave(JSON.parse(localStorage.getItem('cs-graveyard') || '[]')); } catch { setGrave([]); } }, [gv]);
  const resurrect = (id: number) => { const n = grave.filter((x) => x !== id); setGrave(n); try { localStorage.setItem('cs-graveyard', JSON.stringify(n)); } catch { /* ignore */ } };
  const [night, setNight] = useState<NightId>('classic'); const kind: 'movie' | 'series' = night === 'series' ? 'series' : 'movie'; const gm = night === 'oscar' || night === 'rotten' || night === 'clash' || night.startsWith('docs') ? night : '';
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
      <div className="cs-step"><span>1</span> Your name</div>
      <input className="cs-input" placeholder="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="cs-step"><span>2</span> Pick tonight&apos;s game</div>
      <div className="cs-nights">{NIGHTS.map((n) => <button key={n.id} className={night === n.id ? 'is-on' : ''} onClick={() => setNight(n.id)}><b>{n.ic} {n.n}</b><i>{n.t}</i></button>)}</div>
      <div className="cs-step"><span>3</span> Go</div>
      <button className="cs-btn cs-btn--gold" onClick={() => go(`/play/${makeCode()}?p=A&n=${encodeURIComponent(name.trim())}&n2=${encodeURIComponent(p2.trim())}${night === 'series' ? '&k=series' : gm ? '&gm=' + gm : ''}`)}>START {NIGHTS.find((x) => x.id === night)!.n.toUpperCase()} ROOM</button>
      <div className="cs-row"><input className="cs-input cs-input--code" placeholder="PARTNER CODE" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="cs-btn" disabled={code.length < 4} onClick={() => go(`/play/${code}?p=B&n=${encodeURIComponent(name.trim())}`)}>JOIN</button></div>
      <div className="cs-row"><button className="cs-btn cs-btn--gold" onClick={() => go(`/play/${makeCode()}?p=A&n=${encodeURIComponent(name.trim())}&solo=1${night === 'series' ? '&k=series' : gm ? '&gm=' + gm : ''}`)}>1V1 VS ORSON</button>
        <button className="cs-btn" onClick={() => go(`/solo?k=${kind}&n=${encodeURIComponent(name.trim())}`)}>SOLO VS ORSON</button>
        <button className="cs-btn" onClick={() => window.dispatchEvent(new CustomEvent('cs-setview', { detail: 'casual' }))}>📚 LIBRARY</button></div>
      {grave.length > 0 && <button className="cs-small" onClick={() => setGv(!gv)}>🪦 Graveyard · {grave.length} buried {gv ? '▴' : '▾'}</button>}
      {gv && <div className="cs-grave">{grave.map((id) => <button key={id} onClick={() => resurrect(id)}><span>{BY_ID[id]?.t || 'Film #' + id}</span><b>BRING BACK</b></button>)}</div>}
      <p className="cs-small">Got a TV? Open the room code on it at <b>/tv/CODE</b> and cast the screen.</p>
    </main>
  );
}
