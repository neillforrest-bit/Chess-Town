'use client';
import { useEffect, useState } from 'react';
import { poster as posterUrl, type Movie } from '@/lib/game';
import { Confetti } from '@/components/shared';

type Loved = { id: number; t: string; y: number; g: string[] };
type Taste = { loved: Loved[]; services: string[]; hardNos: string[]; capMin: number | null };
type Pick = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; pop: number; rn: number | null; rt: number | null; imdb: number | null; mc: number | null; why: string; whyKind: 'loved' | 'mood' | 'wild'; providers: string[]; trailer: string | null; wild: boolean };
type Phase = 'mood' | 'working' | 'picks' | 'done';

const GID_OF: Record<string, string> = { 'Sci-fi': 'Science Fiction' };
const MOODS: { n: string; g: string[]; ic: string }[] = [
  { n: 'Cosy', ic: '🛋️', g: ['Comedy', 'Romance', 'Family', 'Animation'] },
  { n: 'Gripping', ic: '🕵️', g: ['Thriller', 'Crime', 'Mystery'] },
  { n: 'Laugh', ic: '😂', g: ['Comedy'] },
  { n: 'Thrill me', ic: '👻', g: ['Horror', 'Thriller'] },
  { n: 'Sweep me away', ic: '🌅', g: ['Drama', 'Romance', 'History'] },
  { n: 'Mind-bender', ic: '🧩', g: ['Mystery', 'Science Fiction'] },
  { n: 'Cry it out', ic: '😢', g: ['Drama'] },
  { n: 'Adrenaline', ic: '💥', g: ['Action', 'Adventure'] },
];
const REACTIONS = ['Loved it', 'Liked it', 'It was okay', "Didn't like it", 'Hated it'];
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; } };
const fmtRun = (rn: number | null) => rn ? `${Math.floor(rn / 60)}h ${rn % 60}m` : null;

export default function TonightRoom() {
  const [phase, setPhase] = useState<Phase>('working');
  const [taste, setTaste] = useState<Taste>({ loved: [], services: [], hardNos: [], capMin: null });
  const [mood, setMood] = useState<(typeof MOODS)[number] | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [kept, setKept] = useState<number[]>([]);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [coldCount, setColdCount] = useState(0);
  const [hotDone, setHotDone] = useState(false);
  const [winner, setWinner] = useState<Pick | null>(null);
  const [reactFor, setReactFor] = useState<number | null>(null);
  const [reactions, setReactions] = useState<{ id: number; r: string; ts: number }[]>([]);
  const [line, setLine] = useState('Pick a mood, or jump straight to the films. No setup needed.');
  const [err, setErr] = useState('');

  useEffect(() => {
    setSeenIds(load<number[]>('cs-seen', []));
    setReactions(load('cs-reactions', []));
    // Preferences from an earlier visit remain local, but never gate entry.
    const saved = load<Partial<Taste>>('cs-taste', {});
    setTaste({ loved: Array.isArray(saved?.loved) ? saved.loved : [], services: Array.isArray(saved?.services) ? saved.services : [], hardNos: Array.isArray(saved?.hardNos) ? saved.hardNos : [], capMin: typeof saved?.capMin === 'number' ? saved.capMin : null });
    setPhase('mood');
  }, []);

  const deal = async (pivot: boolean, banExtra: number[]) => {
    setPhase('working'); setErr('');
    setLine(pivot ? 'Cold it is. Turning the shelf...' : 'The engine is thinking. Kettle on?');
    try {
      const r = await fetch('/api/tonight', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          moodGenres: mood ? mood.g.map((x) => GID_OF[x] || x) : [], moodLabel: mood?.n || '',
          lovedIds: taste.loved.map((l) => l.id), services: taste.services, hardNos: taste.hardNos.map((x) => GID_OF[x] || x),
          capMin: taste.capMin, ban: [...seenIds, ...banExtra], seed: Date.now() % 2147483647, pivot,
        }),
      });
      const d = await r.json() as { picks?: Pick[]; error?: string };
      const ps = (d.picks || []).filter(Boolean);
      if (!r.ok || !ps.length) { setPhase('mood'); setErr(d.error ? 'Film picks are unavailable right now. Try again shortly.' : 'No picks this time. Try another mood or clear old preferences.'); return; }
      setPicks(ps); setKept([]); setReactFor(null); setPhase('picks');
      setLine(ps.some((p) => p.wild) ? 'Three for the mood, one wildcard. Hot or cold on the direction?' : 'Three for the mood. Hot or cold on the direction?');
    } catch { setPhase('mood'); setErr('The archives hiccuped. One more tap usually fixes it.'); }
  };

  const markSeen = (id: number) => {
    const n = [...seenIds, id]; setSeenIds(n); try { localStorage.setItem('cs-seen', JSON.stringify(n)); } catch { /* ignore */ }
    setPicks((p) => p.filter((x) => x.id !== id)); setReactFor(id);
  };
  const react = (id: number, r: string) => {
    const n = [...reactions.filter((x) => x.id !== id), { id, r, ts: Date.now() }]; setReactions(n);
    try { localStorage.setItem('cs-reactions', JSON.stringify(n)); } catch { /* ignore */ }
    setReactFor(null);
  };
  const pass = (id: number) => setPicks((p) => p.filter((x) => x.id !== id));
  const keep = (id: number) => setKept((k) => k.includes(id) ? k.filter((x) => x !== id) : [...k, id]);
  const crown = (m: Pick) => { setWinner(m); setPhase('done'); setReactFor(m.id); setLine(`Tonight it is: ${m.t}.`); };

  const head = <div className="cs-solohead"><span>CINE<b>SYNC</b> TONIGHT</span><span>{phase === 'done' ? 'SETTLED' : (mood?.n || 'YOUR CALL').toUpperCase()}</span></div>;
  const bar = <p className="cs-solo-orson"><em>ORSON</em> {line}</p>;
  const reactionRow = (id: number) => reactFor === id && (
    <div className="cs-treact" style={{ borderTop: 'none', paddingTop: 0 }}>
      <small>Log a reaction? One tap, optional. Stored on this device only - group sharing comes later.</small>
      <div className="cs-dgenres">{REACTIONS.map((r) => <button key={r} className="cs-chip cs-chip--mini" onClick={() => react(id, r)}>{r}</button>)}</div>
    </div>
  );
  const card = (m: Pick) => (
    <div key={m.id} className={'cs-tcard' + (m.wild ? ' cs-tcard--wild' : '')}>
      {m.wild && <div className="cs-twild">THE WILDCARD · outside your usual taste, free to ignore</div>}
      <div className="cs-tmain">
        <img className="cs-poster" src={posterUrl(m as unknown as Movie, 'w342')} alt={m.t} draggable={false} />
        <div className="cs-tinfo">
          <b>{m.t}</b>
          <small>{m.y} · {m.g.slice(0, 2).join(' / ')}{fmtRun(m.rn) ? ' · ' + fmtRun(m.rn) : ''}</small>
          <div className="cs-tscores">
            <span>TMDB {m.r.toFixed(1)}</span>
            {m.rt != null && <span>RT {m.rt}%</span>}
            {m.imdb != null && <span>IMDb {m.imdb.toFixed(1)}</span>}
          </div>
        </div>
      </div>
      <p className="cs-twhy">{m.why}</p>
      <div className="cs-tacts">
        {m.trailer
          ? <a className="cs-ttrailer" href={`https://www.youtube.com/watch?v=${m.trailer}`} target="_blank" rel="noreferrer">▶ WATCH TRAILER</a>
          : <span className="cs-tnotrailer">No trailer listed</span>}
        <span className="cs-tprov">{m.providers.length ? m.providers.join(' · ') : 'No GB subscription listing found'}</span>
      </div>
      <div className="cs-row">
        <button className="cs-btn cs-btn--sm" onClick={() => markSeen(m.id)}>SEEN IT</button>
        <button className="cs-btn cs-btn--sm" onClick={() => pass(m.id)}>PASS</button>
        <button className={'cs-btn cs-btn--sm' + (kept.includes(m.id) ? ' cs-btn--gold' : '')} onClick={() => keep(m.id)}>{kept.includes(m.id) ? 'KEPT ✓' : 'KEEP'}</button>
      </div>
      {kept.includes(m.id) && <button className="cs-btn cs-btn--gold" onClick={() => crown(m)}>WE&apos;RE WATCHING THIS</button>}
      {reactionRow(m.id)}
    </div>
  );

  return (
    <main className="cs-play">{head}{bar}<section className="cs-body">

      {phase === 'mood' && (
        <section className="cs-ask">
          <div className="cs-orson">TONIGHT&apos;S MOOD?</div>
          <div className="cs-dgenres">{MOODS.map((m) => <button key={m.n} className={'cs-chip' + (mood?.n === m.n ? ' is-on' : '')} onClick={() => setMood(mood?.n === m.n ? null : m)}>{m.ic} {m.n}</button>)}</div>
          {err && <p className="cs-small">{err}</p>}
          <button className="cs-btn cs-btn--gold" onClick={() => { setColdCount(0); setHotDone(false); deal(false, []); }}>SHOW TONIGHT&apos;S PICKS</button>
          <button className="cs-small cs-link" onClick={() => { setMood(null); setColdCount(0); setHotDone(false); deal(false, []); }}>just show me something</button>
          {(taste.loved.length > 0 || taste.services.length > 0 || taste.hardNos.length > 0 || taste.capMin !== null) && <button className="cs-small cs-link" onClick={() => { setTaste({ loved: [], services: [], hardNos: [], capMin: null }); try { localStorage.removeItem('cs-taste'); } catch { /* storage optional */ } setErr(''); setLine('Old preferences cleared. Every film is back in play.'); }}>Clear old preferences</button>}
        </section>
      )}

      {phase === 'working' && (
        <section className="cs-ask"><div className="cs-orson">THE LIGHTS GO DOWN...</div><p className="cs-small">Finding picks that stream on your services, in your mood, under your ceiling.</p></section>
      )}

      {phase === 'picks' && (
        <section className="cs-ask cs-ask--tight">
          {!hotDone && (
            <div className="cs-thc">
              <small>HOT OR COLD ON THIS DIRECTION?</small>
              <div className="cs-row">
                <button className="cs-btn cs-btn--sm" onClick={() => setHotDone(true)}>🔥 HOT</button>
                <button className="cs-btn cs-btn--sm" onClick={() => { const n = coldCount + 1; setColdCount(n); if (n >= 2) { setPhase('mood'); setColdCount(0); setLine('Twice cold - the mood is wrong, not the shelf. Pick a different one.'); } else deal(true, picks.map((p) => p.id)); }}>🧊 COLD{coldCount === 1 ? ' (once more offers a mood change)' : ''}</button>
              </div>
            </div>
          )}
          {reactFor !== null && !picks.some((p) => p.id === reactFor) && (
            <div className="cs-tcard">{reactionRow(reactFor)}</div>
          )}
          {picks.map(card)}
          {!picks.length && (
            <><p className="cs-small">Shelf cleared.</p>
            <button className="cs-btn cs-btn--gold" onClick={() => deal(false, [])}>DEAL A FRESH SHELF</button></>
          )}
          <button className="cs-small cs-link" onClick={() => setPhase('mood')}>back to moods</button>
        </section>
      )}

      {phase === 'done' && winner && (
        <section className="cs-ask">
          <Confetti />
          <div className="cs-orson">TONIGHT&apos;S FILM</div>
          <div className="cs-tcard">
            <div className="cs-tmain">
              <img className="cs-poster" src={posterUrl(winner as unknown as Movie, 'w500')} alt={winner.t} draggable={false} />
              <div className="cs-tinfo">
                <b>{winner.t}</b>
                <small>{winner.y} · {winner.g.slice(0, 2).join(' / ')}{fmtRun(winner.rn) ? ' · ' + fmtRun(winner.rn) : ''}</small>
                <div className="cs-tscores"><span>TMDB {winner.r.toFixed(1)}</span>{winner.rt != null && <span>RT {winner.rt}%</span>}{winner.imdb != null && <span>IMDb {winner.imdb.toFixed(1)}</span>}</div>
              </div>
            </div>
            <p className="cs-twhy">{winner.why}</p>
            {winner.providers.length ? <p className="cs-tprov"><b>STREAM</b> {winner.providers.join(' · ')}</p> : <p className="cs-small">No GB subscription listing found. Check your usual store.</p>}
            {winner.trailer && <a className="cs-ttrailer" href={`https://www.youtube.com/watch?v=${winner.trailer}`} target="_blank" rel="noreferrer">▶ WATCH TRAILER</a>}
            {reactionRow(winner.id)}
          </div>
          <button className="cs-btn cs-btn--gold" onClick={() => { setPhase('mood'); setWinner(null); setPicks([]); setLine('Another round, or an early night?'); }}>AGAIN</button>
        </section>
      )}
    </section></main>
  );
}
