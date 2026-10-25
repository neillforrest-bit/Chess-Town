'use client';
/** ORSON'S REVEAL (Movie Time V2, finale): with scores sealed all night, the final two face two calls -
 *  which film wins with CRITICS (RT Tomatometer) and which with AUDIENCES (IMDb). Both players call both
 *  lines, then the host fetches the live numbers and the envelopes open. 10 chips per correct call; a
 *  missing comparable score voids that line (nobody wins by a missing number); a tie is a push.
 *  Skipping is always available and plainly labelled - it ends the ceremony for both players. */
import { useEffect, useRef, useState } from 'react';
import { BY_ID, type Intent, type Movie, type PID, type State } from '@/lib/game';
import { Poster, OrsonFace, Typing, buzz } from './shared';

export default function Reveal({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const f = s.fin; const them = s.players[pid === 'A' ? 'B' : 'A'];
  const [cr, setCr] = useState<number | null>(null);
  const [au, setAu] = useState<number | null>(null);
  const settling = useRef(false);
  // The host (player A) fetches the live scores once both calls are in, then settles. Catalogue numbers
  // back-stop an OMDb outage per film; a genuinely missing comparable score stays null and voids the line.
  useEffect(() => {
    if (pid !== 'A' || !f.calls.A || !f.calls.B || f.revealed || f.verdict || settling.current) return;
    settling.current = true;
    const one = (id: number): Promise<{ rt: number | null; imdb: number | null }> => {
      const m = BY_ID[id];
      return fetch('/api/omdb', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: m.t, y: m.y }) })
        .then((r) => r.json())
        .then((d) => ({ rt: typeof d.rt === 'number' ? d.rt : null, imdb: typeof d.imdb === 'number' ? d.imdb : null }))
        .catch(() => ({ rt: null, imdb: null }))
        .then((live) => ({ rt: live.rt ?? (m.rt ?? null), imdb: live.imdb ?? (m.imdb ?? null) }));
    };
    Promise.all([one(f.a), one(f.b)]).then(([a, b]) => send({ t: 'fsettle', a, b }));
  }, [pid, f.calls.A, f.calls.B, f.revealed, f.verdict, f.a, f.b]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = (id: number, picked: boolean, onPick: () => void) => { const m: Movie = BY_ID[id]; return (
    <button className={'cs-match-card cs-rev-card' + (picked ? ' is-mine' : '')} onClick={() => { buzz(10); onPick(); }}>
      <Poster id={id} /><b>{m.t}</b><span>{m.y}</span>
    </button>); };
  if (f.calls.A && f.calls.B) return <div className="cs-center"><div className="cs-intro-face"><OrsonFace mood="scheme" talking /></div>
    <p className="cs-say">Both calls are in. Orson is opening the envelopes...</p><Typing text="Drumroll" /></div>;
  if (f.calls[pid]) return <div className="cs-center"><div className="cs-orson">CALLS SEALED</div>
    <p className="cs-say">Your calls are in the envelope. {them.name} is still deciding. No take-backs - I checked.</p></div>;
  return <div className="cs-rev">
    <div className="cs-orson">ORSON&apos;S REVEAL</div>
    <p className="cs-say">Two films. Two scoreboards. Before you fight, tell me: which one takes the critics, and which one takes the crowd? Ten chips a call. Wrong costs the same.</p>
    <div className="cs-rev-line"><em>CRITICS · Rotten Tomatoes</em>
      <div className="cs-rev-cards">{card(f.a, cr === f.a, () => setCr(f.a))}{card(f.b, cr === f.b, () => setCr(f.b))}</div></div>
    <div className="cs-rev-line"><em>AUDIENCES · IMDb</em>
      <div className="cs-rev-cards">{card(f.a, au === f.a, () => setAu(f.a))}{card(f.b, au === f.b, () => setAu(f.b))}</div></div>
    <button className="cs-btn cs-btn--gold" disabled={cr === null || au === null} onClick={() => { buzz(18); if (cr !== null && au !== null) send({ t: 'fcall', pid, cr, au }); }}>SEAL MY CALLS</button>
    <button className="cs-fine" onClick={() => send({ t: 'fskip', pid })}>SKIP THE CEREMONY FOR BOTH OF US</button>
  </div>;
}
