'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Film = { id: number; t: string; y: number; g: string[]; p: string };
type Phase = 'intro' | 'round1' | 'read1' | 'round2' | 'read2' | 'portrait' | 'grid' | 'context';

const LANES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Sci-fi', 'Fantasy', 'Animation', 'Crime', 'Mystery'];
const LANE_FULL: Record<string, string> = { 'Sci-fi': 'Science Fiction' };
const SERVICES = ['Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'BBC iPlayer', 'ITVX', 'Channel 4', 'Now', 'Paramount+', 'Sky Go'];
const PARTIES = ['Home alone', 'Couples night', 'Kids in bed', 'Film crew'];
const POSTER = (p: string) => `https://image.tmdb.org/t/p/w342${p}`;

function Orson({ line }: { line: string }) {
  return (
    <div className="sc-stage">
      <div className="sc-spot" />
      <svg className="sc-orson" viewBox="0 0 120 200" aria-label="Orson, your host" role="img">
        <ellipse cx="60" cy="188" rx="34" ry="7" fill="rgba(0,0,0,.45)" />
        <rect x="40" y="16" width="40" height="26" rx="3" fill="#141018" /> {/* top hat */}
        <rect x="32" y="40" width="56" height="6" rx="3" fill="#141018" /> {/* brim */}
        <circle cx="60" cy="60" r="17" fill="#e8c877" /> {/* head */}
        <circle cx="53" cy="57" r="4.5" fill="none" stroke="#141018" strokeWidth="2" />
        <circle cx="67" cy="57" r="4.5" fill="none" stroke="#141018" strokeWidth="2" />
        <rect x="57" y="59" width="6" height="2" fill="#141018" /> {/* glasses */}
        <path d="M50 68 Q60 74 70 68" stroke="#141018" strokeWidth="2" fill="none" /> {/* smile */}
        <path d="M60 78 L52 86 L60 92 L68 86 Z" fill="#8c1d2f" /> {/* bow tie */}
        <path d="M42 86 Q60 78 78 86 L84 160 Q60 170 36 160 Z" fill="#141018" /> {/* suit */}
        <path d="M36 160 L30 184 L48 172 L60 184 L72 172 L90 184 L84 160" fill="#141018" /> {/* coattails */}
        <rect x="84" y="110" width="4" height="58" rx="2" fill="#6b5a33" transform="rotate(8 86 140)" /> {/* cane */}
      </svg>
      <div className="sc-line"><span className="sc-orsonname">ORSON</span>{line}</div>
    </div>
  );
}

export default function SceneSetting() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [flash, setFlash] = useState(false);
  const [films, setFilms] = useState<Film[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [picks, setPicks] = useState<Film[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [struck, setStruck] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [party, setParty] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ban, setBan] = useState<number[]>([]);

  const go = (p: Phase) => { setFlash(true); setTimeout(() => setFlash(false), 450); setPhase(p); };

  const deal = async (round: 1 | 2, pickedIds: number[]) => {
    setBusy(true);
    try {
      const res = await fetch('/api/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ round, pickedIds, ban, seed: Date.now() }) });
      const d = await res.json();
      setFilms(d.films || []);
      setSel([]);
    } finally { setBusy(false); }
  };

  useEffect(() => { if (phase === 'round1') deal(1, []); }, [phase]); // eslint-disable-line

  const addPicks = (chosen: Film[], w: Record<string, number>) => {
    const nw = { ...w };
    for (const f of chosen) for (const g of f.g) nw[g] = (nw[g] || 0) + 1;
    return nw;
  };

  const confirmRound = () => {
    const chosen = films.filter((f) => sel.includes(f.id));
    const np = [...picks, ...chosen];
    setPicks(np);
    setWeights(addPicks(chosen, weights));
    if (phase === 'round1') go('read1'); else go('read2');
  };

  const roundGenres = useMemo(() => Array.from(new Set(picks.slice(0, 2).flatMap((f) => f.g))), [picks]);
  const shared = useMemo(() => {
    if (picks.length < 2) return [] as string[];
    return picks[0].g.filter((g) => picks[1].g.includes(g));
  }, [picks]);

  const read1Line = () => {
    const [a, b] = picks;
    if (!a || !b) return 'Tell me which way to lean.';
    return shared.length
      ? `You reached for ${a.t} and ${b.t}. ${shared.slice(0, 2).join(' and ')} both times. Am I getting warmer?`
      : `${a.t} and ${b.t} - no shared lane there, which tells me something too: you are not a one-lane viewer. Am I getting warmer?`;
  };

  const read2Line = () => {
    const r2 = picks.slice(2);
    const confirmed = r2.some((f) => f.g.some((g) => roundGenres.includes(g)));
    return confirmed
      ? 'Well, well, well. I thought these might be your picks. The math guys are very pleased with themselves.'
      : 'Those are quite surprising. Let me take it back to the math guys - recalibrating.';
  };

  const answerRead = (yes: boolean) => {
    if (phase === 'read1') {
      const nw = { ...weights };
      for (const g of roundGenres) nw[g] = Math.max(0.5, (nw[g] || 0) * (yes ? 2 : 0.5));
      setWeights(nw);
      setPhase('round2');
      deal(2, picks.map((f) => f.id));
    } else {
      const nw = { ...weights };
      const r2g = Array.from(new Set(picks.slice(2).flatMap((f) => f.g)));
      for (const g of r2g) nw[g] = Math.max(0.5, (nw[g] || 0) * (yes ? 2 : 0.5));
      setWeights(nw);
      if (picks.length === 0) { setBan([...ban, ...films.map((f) => f.id)]); setPhase('round1'); deal(1, []); } else go('portrait');
    }
  };

  const portrait = useMemo(() => {
    const top = Object.entries(weights).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 4);
    return top;
  }, [weights]);

  const gridTap = (lane: string) => {
    const full = LANE_FULL[lane] || lane;
    const shown = [...portrait, ...added];
    if (shown.includes(full) && !struck.includes(full)) { setStruck([...struck, full]); }
    else if (struck.includes(full)) { setStruck(struck.filter((x) => x !== full)); }
    else if (!added.includes(full)) { setAdded([...added, full]); }
  };

  const finalLanes = useMemo(() => [...portrait, ...added].filter((g) => !struck.includes(g)), [portrait, added, struck]);

  const finish = () => {
    // corrections steer which picks seed recommendations; they never ban a genre outright
    let loved = picks.filter((f) => f.g.some((g) => finalLanes.includes(g)));
    if (!loved.length) loved = picks;
    try {
      localStorage.setItem('cs-taste', JSON.stringify({ loved: loved.map((f) => ({ id: f.id, t: f.t, y: f.y, g: f.g, p: f.p })), services, hardNos: [], capMin: null }));
      localStorage.setItem('cs-party', JSON.stringify({ party, lanes: finalLanes }));
    } catch { /* private mode */ }
    router.push('/tonight');
  };

  const toggleService = (s: string) => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s]);

  return (
    <div className="sc-root">
      {flash && <div className="sc-flash" />}

      {phase === 'intro' && (
        <div className="sc-dark">
          <Orson line="I'm Orson. I find films. Show me a few you love and I'll learn the shape of your taste, then bring back tonight's film - and a few spares. Put down your popcorn. It's movie time." />
          <button className="sc-gold" onClick={() => go('round1')}>SET THE SCENE</button>
          <div className="sc-hint">Two short rounds of posters. No typing, no account, nothing leaves this device.</div>
        </div>
      )}

      {(phase === 'round1' || phase === 'round2') && (
        <div className="sc-light">
          <div className="sc-kicker">{phase === 'round1' ? 'SCENE SETTING · ROUND ONE' : 'SCENE SETTING · ROUND TWO'}</div>
          <h1 className="sc-h1">{phase === 'round1' ? 'Pick the two you would actually watch.' : 'I dealt these to test my theory. Pick two.'}</h1>
          <div className="sc-sub">Choose two - or none. Recognising a poster is not the same as loving the film.</div>
          {busy ? <div className="sc-dealing">Dealing…</div> : (
            <div className="sc-grid4">
              {films.map((f) => (
                <button key={f.id} className={'sc-card' + (sel.includes(f.id) ? ' is-picked' : '')} onClick={() => setSel(sel.includes(f.id) ? sel.filter((x) => x !== f.id) : sel.length < 2 ? [...sel, f.id] : sel)}>
                  <img src={POSTER(f.p)} alt={`${f.t} poster`} />
                  <div className="sc-cardmeta"><b>{f.t}</b><span>{f.y} · {f.g.slice(0, 2).join(' / ')}</span></div>
                  {sel.includes(f.id) && <div className="sc-tick">✓</div>}
                </button>
              ))}
            </div>
          )}
          <div className="sc-actions">
            <button className="sc-gold" disabled={sel.length !== 2 || busy} onClick={confirmRound}>THESE TWO</button>
            <button className="sc-quiet" disabled={busy} onClick={() => {
              if (phase === 'round1') { setBan([...ban, ...films.map((f) => f.id)]); deal(1, []); }
              else { go('read2'); }
            }}>none of these</button>
          </div>
        </div>
      )}

      {(phase === 'read1' || phase === 'read2') && (
        <div className="sc-dark">
          <Orson line={phase === 'read1' ? read1Line() : read2Line()} />
          <div className="sc-actions">
            <button className="sc-gold" onClick={() => answerRead(true)}>YES, WARMER</button>
            <button className="sc-quiet sc-quiet-dark" onClick={() => answerRead(false)}>not quite</button>
          </div>
        </div>
      )}

      {phase === 'portrait' && (
        <div className="sc-dark">
          <Orson line="Here is my read on your taste. Four lanes. Tell me I have you - or correct me." />
          <div className="sc-lanes">
            {portrait.map((g, i) => <div key={g} className="sc-lane" style={{ animationDelay: `${i * 180}ms` }}>{g}</div>)}
          </div>
          <div className="sc-actions">
            <button className="sc-gold" onClick={() => go('context')}>FEELS RIGHT</button>
            <button className="sc-quiet sc-quiet-dark" onClick={() => go('grid')}>not quite me</button>
          </div>
        </div>
      )}

      {phase === 'grid' && (
        <div className="sc-light">
          <div className="sc-kicker">CORRECT ME</div>
          <h1 className="sc-h1">Strike what I got wrong. Add what I missed.</h1>
          <div className="sc-sub">Striking says "not a favourite" - never "never show me". Your picks still steer.</div>
          <div className="sc-gridall">
            {LANES.map((l) => {
              const full = LANE_FULL[l] || l;
              const isIn = [...portrait, ...added].includes(full);
              const isStruck = struck.includes(full);
              return <button key={l} className={'sc-cell' + (isStruck ? ' is-struck' : isIn ? ' is-in' : '')} onClick={() => gridTap(l)}>{l}{isStruck ? ' ✕' : isIn ? ' ✓' : ''}</button>;
            })}
          </div>
          <div className="sc-actions">
            <button className="sc-gold" onClick={() => go('context')}>THAT'S ME</button>
          </div>
        </div>
      )}

      {phase === 'context' && (
        <div className="sc-light">
          <div className="sc-kicker">LAST SCENE BEFORE THE FILM</div>
          <h1 className="sc-h1">Who's watching tonight?</h1>
          <div className="sc-chips">{PARTIES.map((p) => <button key={p} className={'sc-chip' + (party === p ? ' is-on' : '')} onClick={() => setParty(party === p ? null : p)}>{p}</button>)}</div>
          <div className="sc-note">Recorded for later - tonight still runs on your picks alone. Couple, kids and group blending are not built yet.</div>
          <h2 className="sc-h2">Where can you watch? <span className="sc-opt">optional</span></h2>
          <div className="sc-chips">{SERVICES.map((s) => <button key={s} className={'sc-chip' + (services.includes(s) ? ' is-on' : '')} onClick={() => toggleService(s)}>{s}</button>)}</div>
          <div className="sc-actions">
            <button className="sc-gold" onClick={finish}>FIND MY FILMS</button>
          </div>
        </div>
      )}
    </div>
  );
}
