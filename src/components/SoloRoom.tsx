'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BY_ID, buildDeck, pickWildcards, qsets, ASK_ORDER, AXQ_NAME, fitPct, type Kind } from '@/lib/game';
import { Poster, Scores, Meter, Confetti, buzz } from '@/components/shared';

type Card = { hook: string; loved: string; catch: string; providers: { region: string; names: string[] } | null; usd?: number; inTok?: number; outTok?: number };
const GAUNTLET_S = 180; const MAX_PICKS = 4;
const post = (body: unknown) => fetch('/api/orson', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function SoloRoom() {
  const sp = useSearchParams();
  const [kind, setKind] = useState<Kind>(sp.get('k') === 'series' ? 'series' : 'movie');
  const [name, setName] = useState(sp.get('n') || '');
  useEffect(() => { if (!name) setName(localStorage.getItem('cs-name') || ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<'setup' | 'sliders' | 'play' | 'final' | 'done'>('setup');
  const [qi, setQi] = useState(0); const [sl, setSl] = useState(5); const [ans, setAns] = useState<number[]>([5, 5, 5, 5]);
  const [deck, setDeck] = useState<number[]>([]); const [di, setDi] = useState(0); const [picks, setPicks] = useState<number[]>([]);
  const [adv, setAdv] = useState<{ id: number; line: string } | null>(null);
  const [t0, setT0] = useState(0); const [left, setLeft] = useState(GAUNTLET_S); const [took, setTook] = useState(0);
  const [orson, setOrson] = useState('I am Orson. You against me, and the clock. Choose a mood and I will argue with it.');
  const [cost, setCost] = useState({ calls: 0, inTok: 0, outTok: 0, usd: 0 });
  const [cards, setCards] = useState<Record<number, Card | 'wait' | 'err'>>({});
  const [fin, setFin] = useState<{ mine: number; wild: number; win: number | null } | null>(null);
  const target = useMemo(() => ASK_ORDER.reduce((a, i) => { a[i] = ans[i]; return a; }, [5, 5, 5, 5]), [ans]);
  const addCost = (d: { usd?: number; inTok?: number; outTok?: number }) => setCost((c) => ({ calls: c.calls + 1, inTok: c.inTok + (d.inTok || 0), outTok: c.outTok + (d.outTok || 0), usd: c.usd + (d.usd || 0) }));
  const loadCard = (id: number) => {
    if (cards[id]) return; const m = BY_ID[id]; setCards((c) => ({ ...c, [id]: 'wait' }));
    post({ type: 'card', movie: { id: m.id, t: m.t, y: m.y, g: m.g, o: m.o, c: m.c, rt: m.rt, mc: m.mc, imdb: m.imdb, r: m.r, aw: m.aw, kw: m.kw, tag: m.tag, k: m.k, sr: m.sr } })
      .then((d: Card) => { if (d && d.hook) { addCost(d); setCards((c) => ({ ...c, [id]: d })); } else setCards((c) => ({ ...c, [id]: 'err' })); }).catch(() => setCards((c) => ({ ...c, [id]: 'err' })));
  };
  const cur = deck[di];
  useEffect(() => { if (phase === 'play' && cur !== undefined) { loadCard(cur); if (deck[di + 1] !== undefined) loadCard(deck[di + 1]); } }, [phase, cur]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'final' && fin) { loadCard(fin.mine); loadCard(fin.wild); } if (phase === 'done' && fin?.win != null) loadCard(fin.win); }, [phase, fin]); // eslint-disable-line react-hooks/exhaustive-deps
  const toFinal = (pk: number[]) => {
    const list = pk.length ? pk : [deck[0]]; const best = [...list].sort((a, b) => fitPct(BY_ID[b], target) - fitPct(BY_ID[a], target))[0];
    const wild = pickWildcards(new Set([...deck, ...list]), target, 1, name + 'solo', kind)[0];
    setTook(Math.min(GAUNTLET_S, Math.round((Date.now() - t0) / 1000))); setFin({ mine: best, wild, win: null }); setPhase('final');
    setOrson(`Your champion is ${BY_ID[best].t}. Mine is ${BY_ID[wild].t}. One of us is about to be embarrassed.`);
  };
  useEffect(() => {
    if (phase !== 'play') return;
    const i = setInterval(() => { const l = GAUNTLET_S - Math.round((Date.now() - t0) / 1000); setLeft(Math.max(0, l)); if (l <= 0) { clearInterval(i); toFinal(picks); } }, 500);
    return () => clearInterval(i);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { localStorage.setItem('cs-name', name.trim()); setPhase('sliders'); setQi(0); setSl(5); };
  const lockSlider = () => {
    const axis = ASK_ORDER[qi]; const a = [...ans]; a[axis] = sl; setAns(a); buzz(14);
    if (qi < 3) { setQi(qi + 1); setSl(5); return; }
    const tg = ASK_ORDER.reduce((x, i) => { x[i] = a[i]; return x; }, [5, 5, 5, 5]);
    setDeck(buildDeck(tg, name + 'solo' + Date.now(), [], { A: null, B: null }, { A: '', B: '' }, [], { A: {}, B: {} }, kind).slice(0, 40)); setDi(0); setPicks([]); setT0(Date.now()); setLeft(GAUNTLET_S); setPhase('play');
    setOrson('Three minutes. Swipe. Every film you draft, I argue against. Stand by it or fold.');
  };
  const advance = (pk: number[]) => { if (pk.length >= MAX_PICKS || di + 1 >= deck.length) { toFinal(pk); return; } setDi(di + 1); };
  const draft = () => {
    buzz(18); const m = BY_ID[cur]; setAdv({ id: cur, line: 'Orson is sharpening his argument...' });
    const fb = `${m.t}? Rated ${m.r.toFixed(1)} by people who had nothing better to do. Are you sure?`;
    post({ type: 'quip', names: name || 'Player', event: `${name || 'The player'} just drafted "${m.t}" (${m.y}, ${m.g.slice(0, 3).join('/')}, rated ${m.r}). You are the DEVIL'S ADVOCATE: argue against this pick in two sharp sentences using one real fact about it, then challenge them to stand by it.`, ctx: m.o.slice(0, 220), roast: false })
      .then((d) => { if (d.line) { addCost(d); setAdv({ id: m.id, line: d.line }); } else setAdv({ id: m.id, line: fb }); }).catch(() => setAdv({ id: m.id, line: fb }));
  };
  const stand = () => { if (!adv) return; const pk = [...picks, adv.id]; setPicks(pk); setAdv(null); buzz(25); advance(pk); };
  const fold = () => { setAdv(null); advance(picks); };
  const choose = (id: number) => {
    if (!fin) return; buzz(30); const w = id; setFin({ ...fin, win: w }); setPhase('done');
    setOrson(w === fin.wild ? 'You chose MY film. I have never been prouder of a human.' : 'You picked your own. Fine. I will pretend I let you.');
  };
  const win = fin?.win != null ? BY_ID[fin.win] : null; const wc = win ? cards[win.id] : null;
  const summary = win ? `${name || 'I'} settled on ${win.t} in ${took >= 150 ? '3 minutes' : fmt(took)}, ${fitPct(win, target)}% aligned` : '';
  const share = async () => { const url = location.origin + '/solo?k=' + kind; try { if (navigator.share) await navigator.share({ title: 'CineSync Solo Gauntlet', text: summary + '. Beat me:', url }); else { await navigator.clipboard.writeText(`${summary}. Beat me: ${url}`); alert('Copied to clipboard'); } } catch { /* cancelled */ } };

  const head = <div className="cs-solohead"><span>CINE<b>SYNC</b> SOLO</span><span>{kind === 'series' ? 'SERIES' : 'MOVIE'}</span></div>;
  const bar = <p className="cs-solo-orson"><em>ORSON</em> {orson}</p>;
  const reset = () => { setPhase('setup'); setFin(null); setCards({}); setCost({ calls: 0, inTok: 0, outTok: 0, usd: 0 }); setAns([5, 5, 5, 5]); };

  if (phase === 'setup') return <main className="cs-home">{head}
    <div className="cs-logo">THE GAUNTLET</div><p className="cs-tag">You against Orson and a 3-minute clock. He argues against every pick. The last film standing faces his wildcard.</p>
    <input className="cs-input" placeholder="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
    <div className="cs-kind"><button className={kind === 'movie' ? 'is-on' : ''} onClick={() => setKind('movie')}>MOVIE</button><button className={kind === 'series' ? 'is-on' : ''} onClick={() => setKind('series')}>SERIES</button></div>
    <button className="cs-btn cs-btn--gold" onClick={start}>START THE GAUNTLET</button></main>;

  if (phase === 'sliders') { const axis = ASK_ORDER[qi]; const q = qsets(kind)[0][axis]; return <main className="cs-play">{head}{bar}<section className="cs-body"><div className="cs-ask" key={qi}>
    <div className="cs-orson">QUESTION {qi + 1} OF 4 · {AXQ_NAME[axis].toUpperCase()}</div><h2 className="cs-q">{q.q}</h2>
    <div className="cs-slider"><div className="cs-sval">{sl}<small>{sl <= 3 ? q.lo : sl >= 7 ? q.hi : 'right in the middle'}</small></div>
      <input type="range" min={0} max={10} step={1} value={sl} onChange={(e) => { setSl(Number(e.target.value)); buzz(6); }} aria-label={q.q} />
      <div className="cs-ticks">{Array.from({ length: 11 }, (_, i) => <i key={i} className={i === sl ? 'is-on' : ''} />)}</div>
      <div className="cs-sends"><span><b>0</b> {q.lo}</span><span>{q.hi} <b>10</b></span></div></div>
    <button className="cs-btn cs-btn--gold" onClick={lockSlider}>LOCK IT IN</button></div></section></main>; }

  if (phase === 'play' && cur !== undefined) { const m = BY_ID[cur]; const ci = cards[cur]; const ok = ci && ci !== 'wait' && ci !== 'err' ? ci : null;
    const meta = m.sr ? `${m.sr.s} season${m.sr.s === 1 ? '' : 's'} · ${m.sr.e} eps · ~${m.rn} min` : m.rn ? `${Math.floor(m.rn / 60)}h ${String(m.rn % 60).padStart(2, '0')}m` : '';
    return <main className="cs-play">{head}{bar}<section className="cs-body"><div className="cs-count"><span>STOOD BY {picks.length}/{MAX_PICKS}</span><span className={'cs-timer' + (left <= 30 ? ' is-hot' : '')}>{fmt(left)}</span><span className="cs-fit">{fitPct(m, target)}% YOUR MOOD</span></div>
      <div className="cs-cardwrap"><div className="cs-card" key={cur}>
        <div className="cs-card-top"><Poster id={cur} big /><div className="cs-card-info"><b>{m.t}</b><span className="cs-meta">{[m.y, meta, m.k].filter(Boolean).join(' · ')}</span><span className="cs-genres">{m.g.slice(0, 3).map((g) => <i key={g}>{g}</i>)}</span>{m.c && m.c.length > 0 && <span className="cs-cast"><em>Starring</em> {m.c.slice(0, 3).join(', ')}</span>}</div></div>
        <Scores m={m} />
        <div className="cs-story-inline"><p className="cs-hook">{ok ? ok.hook : m.o}</p>{ok ? <><p><em>WHY CRITICS LOVED IT</em> {ok.loved}</p><p><em>THE CATCH</em> {ok.catch}</p>{ok.providers && ok.providers.names.length > 0 && <p><em>WATCH</em> {ok.providers.names.join(', ')}<span className="cs-jw"> Streaming data by JustWatch</span></p>}</> : ci === 'wait' ? <p className="cs-small">Orson is reading up on it...</p> : null}</div>
      </div></div>
      {adv ? <div className="cs-why-sheet"><p className="cs-solo-adv"><em>ORSON, DEVIL&apos;S ADVOCATE</em> {adv.line}</p><div className="cs-swipes"><button className="cs-btn cs-btn--no" onClick={fold}>FOLD</button><button className="cs-btn cs-btn--gold" onClick={stand}>STAND BY IT</button></div></div>
        : <div className="cs-swipes"><button className="cs-btn cs-btn--no" onClick={() => { buzz(8); advance(picks); }}>PASS</button><button className="cs-btn cs-btn--gold" onClick={draft}>DRAFT</button></div>}
      <Meter cost={{ ...cost }} /></section></main>; }

  if (phase === 'final' && fin) return <main className="cs-play">{head}{bar}<section className="cs-body"><div className="cs-round">THE FINAL · YOUR CHAMPION VS ORSON&apos;S WILDCARD</div>
    <div className="cs-tgrid cs-tgrid--two">{[fin.mine, fin.wild].map((id, i) => { const m = BY_ID[id]; const ci = cards[id]; const ok = ci && ci !== 'wait' && ci !== 'err' ? ci : null; return <div key={id} className={'cs-tcard' + (i === 1 ? ' is-orson' : '')}><i className="cs-who">{i === 0 ? 'YOURS' : 'ORSON'}</i><Poster id={id} /><b>{m.t}</b><span>{m.y} · {m.r.toFixed(1)}</span><p className="cs-mini">{ok ? ok.hook.slice(0, 150) + (ok.hook.length > 150 ? '...' : '') : m.o.slice(0, 120) + '...'}</p><button className="cs-btn cs-btn--gold cs-pickbtn" onClick={() => choose(id)}>THIS ONE</button></div>; })}</div>
    <Meter cost={{ ...cost }} /></section></main>;

  if (phase === 'done' && win) return <main className="cs-play">{head}{bar}<section className="cs-body"><div className="cs-done"><Confetti /><div className="cs-orson">TONIGHT YOU WATCH</div><Poster id={win.id} big cls="cs-poster--win" /><h2>{win.t}</h2>
    {wc && wc !== 'wait' && wc !== 'err' && wc.providers && wc.providers.names.length > 0 && <p className="cs-small cs-watch"><em>WATCH ON</em> {wc.providers.names.slice(0, 4).join(' · ')} <span className="cs-jw">({wc.providers.region}) Streaming data by JustWatch</span></p>}
    <p className="cs-verdict">{summary}.</p>
    <div className="cs-row"><button className="cs-btn" onClick={share}>SHARE</button><button className="cs-btn cs-btn--gold" onClick={reset}>AGAIN</button></div><Meter cost={{ ...cost }} /></div></section></main>;
  return null;
}
