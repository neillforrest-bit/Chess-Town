'use client';
/** THE COLD OPEN (Movie Time V2, Act I): five Orson-hosted beats that replace the old sliders + swiper as
 *  tonight's calibration. Every beat is presentation only - src/lib/coldopen.ts owns the mapping into the
 *  exact same intents the old flow produced (sliders vector, three trope picks, taste tags/actor), so the
 *  engine path is probe-covered end to end. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BY_ID, type Intent, type PID, type State } from '@/lib/game';
import { tonightSpectrum, tropePicks, tasteTags, orsonRead, swipeFilms, actorIndex, searchActors, type TrophyPick } from '@/lib/coldopen';
import { Poster, OrsonFace, buzz } from './shared';

const BEATS = ['STAR CALL', 'THE SPECTRUM', 'TROPHY OR TRASH', 'SWIPE THREE', "ORSON'S READ"];

export default function ColdOpen({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const code = s.code; const nights = s.mem?.nights || 0;
  const spec = useMemo(() => tonightSpectrum(code, nights), [code, nights]);
  const idx = useMemo(() => actorIndex(), []);
  const [beat, setBeat] = useState(0);
  const [actors, setActors] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState(50);
  const [trophy, setTrophy] = useState<TrophyPick | null>(null);
  const cards = useMemo(() => swipeFilms(code, nights, s.kind), [code, nights, s.kind]);
  const [swiped, setSwiped] = useState<Record<number, boolean>>({});
  const liked = useMemo(() => cards.filter((id) => swiped[id] === true), [cards, swiped]);
  const picks = useMemo(() => tropePicks(code, spec, pos, liked), [code, spec, pos, liked]);
  const tags = useMemo(() => tasteTags(spec, pos, trophy, liked), [spec, pos, trophy, liked]);
  const read = useMemo(() => orsonRead({ actors, spec, pos, trophy, likedIds: liked }), [actors, spec, pos, trophy, liked]);
  const locked = beat >= 5;
  const tasteSent = useRef(false);
  // Stage 2 of the handshake: the engine only accepts 'taste' once BOTH players' tropes are locked
  // (vibe.passed). Fire it the moment that gate opens, exactly once.
  useEffect(() => {
    if (locked && s.vibe.passed && !s.vibe.tasteReady?.[pid] && !tasteSent.current) {
      tasteSent.current = true;
      send({ t: 'taste', pid, tags, nos: [], actor: actors.join(', ').slice(0, 30) });
    }
  }, [locked, s.vibe.passed, s.vibe.tasteReady, pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const lockIn = () => {
    buzz(18);
    send({ t: 'sliders', pid, v: spec.slider(pos), actors: actors.join(', ').slice(0, 60) });
    send({ t: 'tropes', pid, picks });
    setBeat(5);
  };
  const head = <div className="cs-co-head"><div className="cs-orson">THE COLD OPEN · {locked ? 'LOCKED' : `${BEATS[beat]}`}</div><div className="cs-co-pips">{BEATS.map((b, i) => <i key={b} className={i < beat ? 'is-done' : i === beat && !locked ? 'is-now' : ''} />)}</div></div>;
  const next = () => { buzz(10); setBeat((b) => b + 1); };
  if (locked) {
    const waitingPicks = !s.vibe.passed; const waitingTaste = s.vibe.passed && !s.vibe.tasteReady?.[pid];
    return <div className="cs-co">{head}
      <div className="cs-center">
        <div className="cs-intro-face"><OrsonFace mood="smug" talking /></div>
        <p className="cs-say">{waitingPicks ? 'Your night is locked. Waiting for your partner to finish their Cold Open.' : waitingTaste || s.vibe.pend ? 'Both locked. Orson is raiding the TMDB archives for fresh titles...' : 'Orson is setting the table.'}</p>
        <div className="cs-co-chips">{picks.map((p) => <i key={p}>{p}</i>)}</div>
      </div></div>;
  }
  return <div className="cs-co">{head}
    <AnimatePresence mode="wait"><motion.div key={beat} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
      {beat === 0 && <div className="cs-co-beat">
        <p className="cs-say">Name one or two actors you would both watch in anything. Or tell me nobody. I respect a blank slate.</p>
        <div className="cs-co-chips">{actors.map((a) => <button key={a} className="cs-co-chip is-on" onClick={() => setActors(actors.filter((x) => x !== a))}>{a} ✕</button>)}</div>
        <input className="cs-co-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing a name..." maxLength={40} />
        <div className="cs-co-hits">{searchActors(idx, q).filter((h) => !actors.includes(h.name)).map((h) => <button key={h.name} className="cs-co-chip" onClick={() => { buzz(8); if (actors.length < 2) setActors([...actors, h.name]); setQ(''); }}>{h.name}<em>{h.n} films</em></button>)}</div>
        <div className="cs-row"><button className="cs-fine" onClick={next}>{actors.length ? 'NEXT' : 'NOBODY - SKIP'}</button></div>
      </div>}
      {beat === 1 && <div className="cs-co-beat">
        <p className="cs-say">One question settles more than twenty. Tonight: where do you two land?</p>
        <div className="cs-co-spectrum"><span>{spec.lo}</span><span>{spec.hi}</span></div>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="cs-co-range" />
        <p className="cs-co-lean">{pos <= 35 ? `Leaning ${spec.lo.toLowerCase()}` : pos >= 65 ? `Leaning ${spec.hi.toLowerCase()}` : 'Dead centre. Dangerous.'}</p>
        <div className="cs-row"><button className="cs-fine" onClick={next}>NEXT</button></div>
      </div>}
      {beat === 2 && <div className="cs-co-beat">
        <p className="cs-say">Tonight, are we chasing a trophy... or rolling in the trash?</p>
        <div className="cs-co-tt">
          {([['trophy', '🏆', 'TROPHY', 'Award magnets only'], ['trash', '🗑️', 'TRASH', 'Proudly no prestige'], ['both', '🎭', 'BOTH', 'Range. We contain multitudes.']] as [TrophyPick, string, string, string][]).map(([k, e, n, d]) =>
            <button key={k} className={'cs-mood' + (trophy === k ? ' is-on' : '')} onClick={() => { buzz(10); setTrophy(k); }}><i>{e}</i><b>{n}</b><em>{d}</em></button>)}
        </div>
        <div className="cs-row"><button className="cs-fine" onClick={next} disabled={!trophy}>NEXT</button></div>
      </div>}
      {beat === 3 && <div className="cs-co-beat">
        <p className="cs-say">Three posters. Gut calls only. Right means yes.</p>
        <div className="cs-co-swipe">{cards.filter((id) => swiped[id] === undefined).slice(0, 1).map((id) => { const m = BY_ID[id]; return m && <div key={id} className="cs-co-card">
          <Poster id={id} big /><b>{m.t}</b><span className="cs-meta">{m.y} · {m.g.slice(0, 2).join(' · ')}</span>
          <div className="cs-row"><button className="cs-vsw-no" onClick={() => { buzz(6); setSwiped({ ...swiped, [id]: false }); }}>✕ NO</button><button className="cs-vsw-yes" onClick={() => { buzz(14); setSwiped({ ...swiped, [id]: true }); }}>YES ✓</button></div>
        </div>; })}
        {cards.every((id) => swiped[id] !== undefined) && <div className="cs-center"><p className="cs-small">{liked.length ? `You swiped right on ${liked.map((id) => BY_ID[id]?.t).filter(Boolean).join(' and ')}.` : 'Nothing moved you. Noted. Coldly.'}</p><button className="cs-fine" onClick={next}>NEXT</button></div>}
        </div>
      </div>}
      {beat === 4 && <div className="cs-co-beat">
        <div className="cs-intro-face"><OrsonFace mood="smug" talking /></div>
        <p className="cs-say">{read}</p>
        <div className="cs-co-chips">{picks.map((p) => <i key={p} className="is-on">{p}</i>)}</div>
        <p className="cs-small">Your three vibes. They steer tonight&apos;s whole table.</p>
        <div className="cs-row"><button className="cs-btn cs-btn--gold" onClick={lockIn}>LOCK IT IN</button></div>
      </div>}
    </motion.div></AnimatePresence></div>;
}
