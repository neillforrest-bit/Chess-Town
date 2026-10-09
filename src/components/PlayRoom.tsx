'use client';
import { rrLive } from '@/lib/b8';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { TROPE_NAMES, BY_ID, qsets, subDeck, subOf, ASK_ORDER, AXQ_NAME, reactionFor, ROUND_LABEL, DRAFT_SIZE, RESPONSE_GATE, CLASH, AXES, fitPct, heatOf, TASTES, tasteHits, PASS_WHY, YES_WHY, type PID, type Intent } from '@/lib/game';
import { HitScreen, BracketScreen, RerollScreen } from './B8Screens';
import { Heat, Scores, OrsonBar, Poster, secs, useNow, Meter, BUILD, Typing, Takeover, Confetti, buzz, ledgerLine, receipts, shareReceipts } from './shared';

const DRUMROLL_MS = 1200;


type CardInfo = { hook: string; loved: string; catch: string; providers: { region: string; names: string[] } | null } | 'err' | 'wait';
function DraftTimer({ k, paused, onZero }: { k: number; paused: boolean; onZero: () => void }) {
  const [t, setT] = useState(10); const z = useRef(onZero); z.current = onZero;
  useEffect(() => { setT(10); }, [k]);
  useEffect(() => { if (paused) return; const i = setInterval(() => setT((x) => { if (x <= 1) { clearInterval(i); setTimeout(() => z.current(), 0); return 0; } return x - 1; }), 1000); return () => clearInterval(i); }, [k, paused]);
  return <span className={'cs-timer' + (t <= 3 ? ' is-hot' : '')}>{t}s</span>;
}
function ScrollCard({ children }: { children: React.ReactNode }) {
  const r = useRef<HTMLDivElement>(null); const [more, setMore] = useState(false);
  const chk = () => { const e = r.current; if (e) setMore(e.scrollHeight - e.scrollTop - e.clientHeight > 12); };
  useEffect(() => { chk(); const i = setInterval(chk, 700); return () => clearInterval(i); }, []);
  return <div className="cs-cardwrap"><div className="cs-card" ref={r} onScroll={chk}>{children}</div>{more && <div className="cs-more">SCROLL FOR MORE ▼</div>}</div>;
}

const CARD_CACHE = new Map<number, CardInfo>();

function loadCard(id: number, send: (i: Intent) => void, bump: () => void) {
  if (CARD_CACHE.has(id)) return; const m = BY_ID[id]; if (!m) return; CARD_CACHE.set(id, 'wait');
  fetch('/api/orson', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'card', movie: { id: m.id, t: m.t, y: m.y, g: m.g, o: m.o, c: m.c, rt: m.rt, mc: m.mc, imdb: m.imdb, r: m.r, aw: m.aw, kw: m.kw, tag: m.tag, k: m.k, sr: m.sr } }) })
    .then((r) => r.json()).then((d) => { if (d && d.hook) { CARD_CACHE.set(id, d); if (d.usd) send({ t: 'cost', inTok: d.inTok || 0, outTok: d.outTok || 0, usd: d.usd }); } else CARD_CACHE.set(id, 'err'); bump(); })
    .catch(() => { CARD_CACHE.set(id, 'err'); bump(); });
}

function SubCard({ name, onGo }: { name: string; onGo: (yes: boolean) => void }) {
  const x = useMotionValue(0); const rot = useTransform(x, [-160, 160], [-12, 12]); const sub = subOf(name); const busy = useRef(false);
  const fly = (yes: boolean) => { if (busy.current) return; busy.current = true; buzz(yes ? 16 : 8); animate(x, yes ? 460 : -460, { duration: 0.2, onComplete: () => onGo(yes) }); };
  return <div className="cs-subwrap2">
    <motion.div className="cs-subcard" style={{ x, rotate: rot }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.9} onDragEnd={(_, i) => { if (i.offset.x > 90) fly(true); else if (i.offset.x < -90) fly(false); else animate(x, 0); }}>
      <h2>{sub.n}</h2><p>{sub.tag}</p>
    </motion.div>
    <div className="cs-subbtns"><button className="cs-btn" onClick={() => fly(false)}>NOPE</button><button className="cs-btn cs-btn--gold" onClick={() => fly(true)}>YES</button></div>
  </div>;
}

function SubDeck({ deck, mine, other, onSwipe, themName }: { deck: string[]; mine: Record<string, boolean>; other: Record<string, boolean>; onSwipe: (n: string, yes: boolean) => void; themName: string }) {
  const idx = Object.keys(mine).length; const name = deck[idx];
  const locks = deck.filter((n) => mine[n] && other[n]); const [flash, setFlash] = useState(''); const seen = useRef(0);
  useEffect(() => { if (locks.length > seen.current) { setFlash(locks[locks.length - 1]); const t = setTimeout(() => setFlash(''), 1700); seen.current = locks.length; return () => clearTimeout(t); } seen.current = locks.length; }, [locks.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!name) return null;
  return <div className="cs-ask cs-ask--tight cs-subd">
    <div className="cs-dots4 cs-dots10">{deck.map((n, i) => <i key={n} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''} />)}</div>
    <div className="cs-orson">STAGE 1 · PICK YOUR SUBGENRES · {idx + 1} OF {deck.length}</div>
    <p className="cs-aside">Swipe right for yes, left for no. If you and {themName} both swipe right, it locks.</p>
    <SubCard key={name} name={name} onGo={(yes) => onSwipe(name, yes)} />
    {(() => { const both = deck.filter((n) => n in mine && n in other); const agree = both.filter((n) => mine[n] === other[n]).length; const pc = both.length ? Math.round((agree / both.length) * 100) : null; return <div className="cs-board"><div className="cs-bar"><i style={{ width: `${pc ?? 0}%` }} /></div><span><b>{pc === null ? '--' : pc + '%'}</b> ALIGNED · {themName} has done {Object.keys(other).length}/{deck.length}</span><div className="cs-chips">{locks.map((n) => <i key={n} className="lk">{n}</i>)}{deck.filter((n) => n in mine && n in other && !mine[n] && !other[n]).map((n) => <i key={n} className="dead">{n}</i>)}</div></div>; })()}
    {flash && <div className="cs-lock cs-lock--top">GENRE LOCK!<span>{flash}</span></div>}
  </div>;
}

export default function PlayRoom({ code }: { code: string }) {
  const sp = useSearchParams();
  const pid = (sp.get('p') === 'B' ? 'B' : 'A') as PID;
  const name = sp.get('n') || '';
  const { state: s, send, skew, online } = useRoom(code, pid, name, sp.get('k') === 'series' ? 'series' : 'movie');
  const now = useNow(skew);
  useEffect(() => { const n2 = sp.get('n2'); if (pid === 'A' && n2) { const t = setTimeout(() => send({ t: 'preset', pid: 'B', name: n2 }), 1200); return () => clearTimeout(t); } }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const other: PID = pid === 'A' ? 'B' : 'A';
  const [copied, setCopied] = useState(false);
  const [pitchText, setPitchText] = useState('');
  const [tkDone, setTkDone] = useState('');
  const [tapN, setTapN] = useState(0);
  const [slv, setSlv] = useState<number[]>([50, 50, 50]);
  const [swap, setSwap] = useState<number | null>(null);
  const lastTapSend = useRef(0);
  const tapKey = useRef('');
  const startX = useRef<number | null>(null);
  const [sl, setSl] = useState(5);
  const [trSel, setTrSel] = useState<string[]>([]);
  const [sl4, setSl4] = useState<number[]>([5, 5, 5, 5]);
  const [go, setGo] = useState(0);
  const [cd, setCd] = useState(0);
  const [cont, setCont] = useState(false);
  const [det, setDet] = useState<number | null>(null);
  const [alloc, setAlloc] = useState<number[]>([0, 0, 0]);
  const [more, setMore] = useState<number | null>(null);
  const [, bump] = useState(0);
  const [tg, setTg] = useState<string[]>([]);
  const [nos, setNos] = useState<string[]>([]);
  const [pend, setPend] = useState<boolean | null>(null);
  const [why, setWhy] = useState<string[]>([]);
  const [actor, setActor] = useState('');
  const [arm, setArm] = useState('');
  const [bp, setBp] = useState<'' | 'bullet' | 'veto'>('');

  const mt = s && s.phase === 'bracket' ? s.br.matches[s.br.cur] : null;
  useEffect(() => { const k = mt?.tap ? mt.id : ''; if (k !== tapKey.current) { tapKey.current = k; setTapN(0); if (k) buzz([30, 40, 30]); } }, [mt?.id, mt?.tap]);
  useEffect(() => { if (!s || s.phase !== 'final' || !s.fin.pitchEnds) return; const t = setTimeout(() => send({ t: 'pitch', pid, text: pitchText }), 600); return () => clearTimeout(t); }, [pitchText]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s?.phase === 'done' && s.winner !== null) loadCard(s.winner, send as (i: Intent) => void, () => bump((x) => x + 1)); }, [s?.phase, s?.winner]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (det !== null) loadCard(det, send as (i: Intent) => void, () => bump((x) => x + 1)); }, [det]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setBp(''); setAlloc([0, 0, 0]); }, [mt?.id]);
  useEffect(() => { if (!s || s.phase !== 'draft' || s.draft.loading) return; const q = [...s.draft.inbox[pid], ...s.draft.q[pid]]; q.slice(0, 2).forEach((i) => loadCard(i, send as (i: Intent) => void, () => bump((x) => x + 1))); }, [s?.phase, s?.draft.idx?.[pid], s?.draft.loading, s?.draft.inbox?.[pid]?.[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s?.phase === 'final' && s.fin.rematchUsed) setPitchText(''); }, [s?.fin.rematchUsed, s?.phase]);

  if (!s) return <main className="cs-play"><div className="cs-wait">{online ? 'Looking for the room...' : 'Connecting...'}</div></main>;
  const me = s.players[pid], them = s.players[other];
  const head = <header className="cs-head"><b>CINE<em>SYNC</em></b>{s.vibe.score !== null && s.vibe.passed && <Heat h={heatOf(s)} />}<span>{me.name} · {code}</span></header>;
  const foot = <footer className="cs-foot"><Meter cost={s.cost} /><i>{BUILD}</i></footer>;
  const stage = s.phase === 'lobby' || s.phase === 'vibe' ? 0 : s.phase === 'draft' ? 1 : s.phase === 'hitlist' || s.phase === 'bracket' ? 2 : 3;
  const journey = <nav className="cs-journey">{['VIBE', 'DRAFT', 'BRACKET', 'WATCH'].map((x, i) => <i key={x} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}>{i + 1} {x}</i>)}</nav>;
  const shell = (body: React.ReactNode, cls = '') => <main className="cs-play">{head}{journey}<OrsonBar o={s.orson} /><section className={'cs-body ' + cls}>{body}</section>{foot}</main>;
  const led = ledgerLine(s);

  // ---- LOBBY
  if (s.phase === 'lobby') {
    const link = typeof window !== 'undefined' ? `${location.origin}/play/${code}?p=B` : '';
    return shell(<div className="cs-center">
      <div className="cs-orson">ORSON</div>
      <p className="cs-say">{them.joined ? `${them.name} has arrived. Splendid. Two humans, one disagreement.` : 'Welcome. I am Orson, your host. I require two humans and one disagreement.'}</p>
      <div className="cs-code">{code}</div>
      {!them.joined && <p className="cs-small">Give your partner this code on the join screen, or send the link.</p>}
      {s.mem.last && <p className="cs-small">Last time: {s.mem.last}. I remember everything.</p>}
      {led && <p className="cs-small cs-gold">{led}</p>}
      {pid === 'A' && <button className={'cs-toggle' + (s.roast ? ' is-on' : '')} onClick={() => send({ t: 'roast', on: !s.roast })}>ROAST MODE · {s.roast ? 'ON' : 'OFF'}</button>}
      <button className="cs-btn" onClick={() => { const msg = `Join my CineSync movie night! Room code: ${code}\n${link}`; if (navigator.share) { navigator.share({ text: msg }).catch(() => navigator.clipboard?.writeText(msg)); } else navigator.clipboard?.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'COPIED' : 'COPY INVITE LINK'}</button>
      <p className="cs-small">TV: open <b>/tv/{code}</b></p>
    </div>);
  }

  // ---- PHASE 1: vibe, one question at a time
  if (s.phase === 'vibe') {
    const mine = s.vibe.ans[pid]; const nextQ = (() => { const k = ASK_ORDER.find((i) => mine[i] === null); return k === undefined ? -1 : k; })(); const stepN = ASK_ORDER.indexOf(nextQ);
    const fresh = s.vibe.attempts === 0 && mine.every((x) => x === null);
    if (fresh && go < 2) return shell(go === 0 ? <div className="cs-intro">
      <div className="cs-orson">HOW TONIGHT WORKS</div>
      <h2 className="cs-q">Find a movie you both want. Make it fun.</h2>
      <ol className="cs-map">
        <li className="is-now"><b>1 · THE VIBE CHECK</b><span>Three sliders, then 3 tropes each. Orson searches live TMDB with your answers.</span></li>
        <li><b>2 · THE DRAFT</b><span>Swipe films. Each of you picks 10 in secret.</span></li>
        <li><b>3 · THE BRACKET</b><span>Your picks fight head to head.</span></li>
        <li><b>4 · TONIGHT YOU WATCH</b><span>One winner. Maybe one you would never have chosen.</span></li>
      </ol>
      
      <button className="cs-btn cs-btn--gold" onClick={() => { setGo(2); setCd(0); }}>I AM READY</button>
    </div> : <div className="cs-center cs-rsg"><div className="cs-orson">STAGE 1 · THE GATE</div><div className="cs-rsg-w" key={cd}>{['', 'READY', 'STEADY', 'GO!'][cd]}</div></div>, 'cs-body--intro');
    // THE VIBE CHECK (v2.0): three sliders feed live TMDB discovery; the trope matrix stays as the flavour layer.
    if (!s.vibe.sl?.[pid]) { const LB = [['Dark / Gritty', 'Light / Fun'], ['Indie / Auteur', 'Blockbuster'], ['Brain-Bending', 'Turn-Brain-Off']];
      return shell(<div className="cs-ask cs-ask--tight"><div className="cs-orson">THE VIBE CHECK · 3 SLIDERS</div>
        {LB.map((l, i) => <div key={i} className="cs-sl"><div className="cs-sl-l"><span>{l[0]}</span><span>{l[1]}</span></div><input type="range" min={0} max={100} value={slv[i]} onChange={(e) => { const v = [...slv]; v[i] = Number(e.target.value); setSlv(v); }} /><em>{slv[i]}</em></div>)}
        <button className="cs-btn cs-btn--gold" onClick={() => { buzz(14); send({ t: 'sliders', pid, v: slv }); }}>LOCK MY VIBE</button></div>); }
    // THE VIBE MATRIX: 24 tropes, exactly 3 each (secondary flavour layer).
    const mineT = s.vibe.tropes?.[pid] || null;
    if (!mineT) return shell(<div className="cs-ask cs-ask--tight">
      <div className="cs-orson">THE VIBE MATRIX · PICK EXACTLY 3</div>
      <div className="cs-tmap cs-tmap--tropes">{TROPE_NAMES.map((x) => <button key={x} className={'cs-tchip' + (trSel.includes(x) ? ' is-crave' : '')} onClick={() => { buzz(8); setTrSel((a) => a.includes(x) ? a.filter((y) => y !== x) : a.length >= 3 ? a : [...a, x]); }}>{trSel.includes(x) ? '★ ' : ''}{x}</button>)}</div>
      <button className="cs-btn cs-btn--gold" disabled={trSel.length !== 3} onClick={() => { buzz(14); send({ t: 'tropes', pid, picks: trSel }); }}>LOCK MY 3 ({trSel.length}/3)</button>
    </div>);
    return shell(<div className="cs-center"><div className="cs-orson">ORSON</div><p className="cs-say">{s.vibe.pend ? 'Both locked. Orson is raiding the TMDB archives for fresh titles...' : `Your three are locked. Waiting for ${them.name} to commit to theirs.`}</p><Typing text="Orson is reading over a shoulder" /></div>);
  }

  // ---- PHASE 2: draft
  if (s.phase === 'draft') {
    const picks = s.draft.picks[pid]; const idx = s.draft.idx[pid]; const id = s.draft.inbox[pid][0] ?? s.draft.q[pid][0];
    if (s.draft.loading) return shell(<div className="cs-center"><div className="cs-spin" /><Typing text="Orson is writing a pitch for every film. He is dramatic about it" /></div>);
    if (s.draft.gren.id !== null) { const gm = BY_ID[s.draft.gren.id]; const mine = s.draft.gren.votes[pid];
      return shell(<div className="cs-gren"><div className="cs-orson">UNRESOLVED TENSION</div><p className="cs-say">I&apos;m seeing a lot of unresolved tension. Let&apos;s throw a grenade.</p>
        <div className="cs-gren-card"><Poster id={gm.id} /><b>{gm.t}</b><span>{gm.y} · {gm.r.toFixed(1)}{gm.rt != null ? ` · RT ${gm.rt}%` : ''}</span></div>
        {mine === undefined ? <div className="cs-row"><button className="cs-btn cs-btn--no" onClick={() => send({ t: 'grenvote', pid, yes: false })}>NOPE</button><button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'grenvote', pid, yes: true })}>I&apos;LL TAKE IT</button></div> : <p className="cs-small">Locked. Waiting for {them.name}.</p>}</div>); }
    if (picks.length >= DRAFT_SIZE) return shell(<div className="cs-center"><p className="cs-say">Ten drafted and locked. Your picks stay secret.</p><p className="cs-small">{s.draft.picks[other].length >= DRAFT_SIZE ? 'Both done.' : `${them.name} has ${s.draft.picks[other].length}/${DRAFT_SIZE}.`}</p></div>);
    if (id === undefined) return shell(<div className="cs-center">Out of films.</div>);
    const m = BY_ID[id]; const sur = s.draft.inbox[pid][0] === id ? s.draft.sur[id] : undefined;
    const ask = (yes: boolean) => { buzz(yes ? 18 : 8); setArm(''); setWhy([]); setPend(null); send({ t: 'swipe', pid, id, yes, why: [] }); };
    const go = (yes: boolean, w: string[] = []) => { setPend(null); setWhy([]); send({ t: 'swipe', pid, id, yes, why: w }); };
    const pw = s.pw[pid]; const fit = fitPct(m, s.vibe.target || [5, 5, 5, 5]);
    const critic = m.rt != null ? (m.rt >= 85 ? 'Critics raved' : m.rt >= 70 ? 'Critics liked it' : m.rt >= 50 ? 'Critics were split' : 'Critics were not kind') : m.mc != null ? (m.mc >= 70 ? 'Critics liked it' : m.mc >= 50 ? 'Critics were mixed' : 'Critics were not kind') : null;
    const runtime = m.sr ? `${m.sr.s} season${m.sr.s === 1 ? '' : 's'} · ${m.sr.e} eps · ~${m.rn} min` : m.rn ? `${Math.floor(m.rn / 60)}h ${String(m.rn % 60).padStart(2, '0')}m` : '';
    const press = (kind: 'veto' | 'surprise') => { const key = kind + ':' + id; if (arm === key) { buzz([40, 30, 60]); setArm(''); send({ t: kind, pid, id }); } else setArm(key); };
    return shell(<div className="cs-draft"
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) { startX.current = null; return; } startX.current = e.clientX; }}
      onPointerUp={(e) => { if (startX.current === null) return; const dx = e.clientX - startX.current; startX.current = null; if (Math.abs(dx) > 70 && pend === null) ask(dx > 0); }}>
      <div className="cs-count"><span>DRAFTED {picks.length}/{DRAFT_SIZE}</span><DraftTimer k={id} paused={pend !== null} onZero={() => go(false)} /><span className="cs-fit">{fit}% TONIGHT&apos;S MOOD</span></div>
      <ScrollCard key={id}>
        {sur && <div className="cs-surprise">SURPRISE FROM {s.players[sur].name.toUpperCase()}</div>}
        <div className="cs-card-top">
          <Poster id={id} big />
          <div className="cs-card-info">
            <b>{m.t}</b>
            <span className="cs-meta">{[m.y, runtime, m.k].filter(Boolean).join(' · ')}</span>
            <span className="cs-genres">{m.g.slice(0, 3).map((g) => <i key={g}>{g}</i>)}{tasteHits(m, s.vibe.tastes, s.vibe.actors).slice(0, 3).map((g) => <i key={g} className="hit">{g}</i>)}</span>
            {m.c && m.c.length > 0 && <span className="cs-cast"><em>Starring</em> {m.c.slice(0, 3).join(', ')}</span>}
            {m.aw && <span className="cs-award">{m.aw.replace(/\.? ?$/, '')}</span>}
          </div>
        </div>
        <Scores m={m} />
        {critic && <p className="cs-critics"><em>CRITICS SAID</em> {critic}{m.rt != null && m.mc != null ? `, ${m.rt}% fresh, Metacritic ${m.mc}` : ''}.</p>}
        {(() => { const ci = CARD_CACHE.get(id); const ok = ci && ci !== 'wait' && ci !== 'err' ? ci : null; return <div className="cs-story-inline">
          <p className="cs-hook">{ok ? ok.hook : (s.draft.pitches[id] || m.o)}</p>
          {ok ? <><p><em>WHY CRITICS LOVED IT</em> {ok.loved}</p><p><em>THE CATCH</em> {ok.catch}</p>{ok.providers && ok.providers.names.length > 0 && <p><em>WATCH</em> {ok.providers.names.join(', ')}<span className="cs-jw"> Streaming data by JustWatch</span></p>}</> : ci === 'wait' ? <p className="cs-small">Orson is reading up on it...</p> : null}
        </div>; })()}
      </ScrollCard>
      {pend === null ? <>
        <div className="cs-powers cs-powers--big">
          <button className={'cs-pw cs-pw--bullet' + (pw.bullet ? ' is-ready' : '') + (arm === 'veto:' + id ? ' is-armed' : '')} disabled={!pw.bullet} onClick={() => press('veto')}><b>{!pw.bullet ? 'BULLET SPENT' : arm === 'veto:' + id ? 'TAP TO FIRE' : 'SILVER BULLET'}</b><small>{pw.bullet ? 'erase this film for both of you' : 'one per game'}</small></button>
          <button className={'cs-pw cs-pw--surprise' + (pw.surprise ? ' is-ready' : '') + (arm === 'surprise:' + id ? ' is-armed' : '')} disabled={!pw.surprise} onClick={() => press('surprise')}><b>{!pw.surprise ? 'SURPRISE SPENT' : arm === 'surprise:' + id ? 'TAP TO SEND' : 'SURPRISE ' + them.name.slice(0, 8).toUpperCase()}</b><small>{pw.surprise ? 'gift this to their stack' : 'one per game'}</small></button>
        </div>
        <div className="cs-swipes"><button className="cs-btn cs-btn--no" onClick={() => ask(false)}>PASS</button><button className="cs-btn cs-btn--gold" onClick={() => ask(true)}>DRAFT</button></div>
      </> : <div className="cs-why-sheet">
        <div className="cs-why-q">{pend ? 'Why this one?' : 'Why pass?'}<button onClick={() => go(pend as boolean)}>skip</button></div>
        <div className="cs-why-chips">{(pend ? YES_WHY : PASS_WHY).map((w) => <button key={w} className={why.includes(w) ? 'is-on' : ''} onClick={() => { buzz(6); setWhy(why.includes(w) ? why.filter((x) => x !== w) : [...why, w].slice(0, 3)); }}>{w === 'Havent seen it' ? "Haven't seen it" : w}</button>)}</div>
        <button className={'cs-btn ' + (pend ? 'cs-btn--gold' : 'cs-btn--no')} onClick={() => go(pend as boolean, why)}>{pend ? 'DRAFT IT' : 'PASS IT'}</button>
      </div>}
    </div>);
  }

  // ---- PHASE 3: Hit List then the 8-seed bracket
  if (s.phase === 'hitlist') return shell(<HitScreen s={s} pid={pid} send={send} now={now} />);
  if (s.phase === 'bracket' && s.b8) return shell(<BracketScreen s={s} pid={pid} send={send} now={now} />);
  if (s.phase === 'bracket' && mt) {
    // Orson's private offer comes before the first vote
    if (s.tempt.stage === 'offer') {
      if (s.tempt.to !== pid) return shell(<div className="cs-center"><div className="cs-orson">ORSON</div><p className="cs-say">I am whispering to {them.name}. Do not ask what about.</p><Typing text="Orson is conspiring" /></div>);
      const cand = s.draft.picks[other].filter((x) => !s.draft.picks[pid].includes(x) && s.pool.includes(x));
      return shell(<div className="cs-tempt">
        <div className="cs-orson">THE TEMPTATION</div>
        <p className="cs-aside">Psst. Between us. Strike one of {them.name}&apos;s drafted films from the night, and I slip a wildcard in. They will never know who. Tap a film.</p>
        <div className="cs-grid5">{cand.map((id) => <button key={id} className={'cs-mini' + (swap === id ? ' is-on' : '')} onClick={() => setSwap(id)}><Poster id={id} /></button>)}</div>
        <p className="cs-small">{swap ? `Strike ${BY_ID[swap].t}?` : 'Or decline. Orson will not be offended. He will be disappointed.'}</p>
        <div className="cs-row"><button className="cs-btn" onClick={() => send({ t: 'tempt', pid, out: null })}>DECLINE</button><button className="cs-btn cs-btn--gold" disabled={!swap} onClick={() => { buzz(60); send({ t: 'tempt', pid, out: swap }); }}>TAKE THE DEAL</button></div>
      </div>);
    }
    const label = ROUND_LABEL[s.br.round]; const n = s.br.matches.length;
    const ids = [mt.a, mt.b, mt.c]; const mineW = mt.wg[pid]; const theirW = mt.wg[other]; const free = s.br.round === 1; const purse = s.purse?.[pid] ?? 0;
    const draftTot = alloc.reduce((x, y) => x + y, 0);
    const submit = () => { buzz(20); send({ t: 'wager', pid, alloc: free ? alloc : alloc }); setAlloc([0, 0, 0]); };
    const bump3 = (i: number, d: number) => { const nx = [...alloc]; nx[i] = Math.max(0, nx[i] + d); if (nx.reduce((x, y) => x + y, 0) > purse) return; setAlloc(nx); buzz(6); };
    const owner = (id: number | null) => (id === null ? '' : s.draft.picks.A.includes(id) && s.draft.picks.B.includes(id) ? 'BOTH' : s.draft.picks[pid].includes(id) ? 'YOURS' : s.draft.picks[other].includes(id) ? them.name.toUpperCase() : id === mt.c ? 'ORSON' : '');
    const tot = mt.winner !== null && mt.wg.A && mt.wg.B ? [0, 1, 2].map((i) => (mt.wg.A as number[])[i] + (mt.wg.B as number[])[i]) : null;
    const wc = mt.c !== null ? BY_ID[mt.c] : null;
    const card = (id: number | null, i: number) => id === null ? null : (
      <div key={id} className={'cs-tcard' + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '') + (i === 2 ? ' is-orson' : '')}>
        <i className="cs-who">{owner(id) || (i === 2 ? 'ORSON' : '')}</i>
        <button className="cs-info" onClick={() => setDet(id)}>i</button>
        <Poster id={id} /><b>{BY_ID[id].t}</b>
        <span>{BY_ID[id].y} · {BY_ID[id].rt != null ? BY_ID[id].rt + '% RT' : BY_ID[id].r.toFixed(1)}</span>
        {tot ? <em className="cs-tot">{tot[i]}</em> : mineW ? <em className="cs-tot">{free ? (mineW[i] ? 'YOU' : '') : mineW[i]}</em>
          : free ? <button className="cs-btn cs-btn--gold cs-pickbtn" onClick={() => { buzz(15); send({ t: 'wager', pid, alloc: [0, 1, 2].map((k) => (k === i ? 1 : 0)) }); }}>PICK</button>
          : <div className="cs-step"><button onClick={() => bump3(i, -1)}>-</button><span>{alloc[i]}</span><button onClick={() => bump3(i, 1)}>+</button></div>}
      </div>);
    const totSum = alloc[0] + alloc[1] + alloc[2] || 1;
    return shell(<div className="cs-bracket cs-triple" key={mt.id}>
      <div className="cs-round">{label}<i>{s.br.cur + 1}/{n}</i></div>
      {s.br.round === 2 && s.br.golden && <div className="cs-golden">GOLDEN BYE · {BY_ID[s.br.golden].t}</div>}
      <div className="cs-tgrid">{ids.map((id, i) => card(id, i))}</div>
      {wc && mt.winner === null && <p className="cs-roast"><em>ORSON</em> {`${wc.t} is mine. You two will pretend not to want it.`}</p>}
      {!free && mt.winner === null && !mineW && <>
        <div className="cs-tug">{[0, 1, 2].map((i) => <i key={i} className={'cs-tug' + i} style={{ flex: Math.max(alloc[i], 0.0001) / totSum }} />)}</div>
        <p className="cs-small cs-purse">PURSE <b>{purse - draftTot}</b> of 50 tokens left · spend {draftTot}</p>
        <button className="cs-btn cs-btn--gold" disabled={draftTot < 1} onClick={submit}>LOCK WAGER</button>
      </>}
      {mt.winner === null && mineW && <p className="cs-small">Locked. Waiting for {them.name}.{!free ? ` Purse left: ${purse}.` : ''}</p>}
      {free && mt.winner === null && !mineW && <p className="cs-small">Round 1 is free. Tap PICK on the film you want most. Tokens start in round 2 ({purse} each).</p>}
      {mt.winner !== null && <div className="cs-won">{BY_ID[mt.winner].t} advances <small>{mt.via}{mt.winner === mt.c ? ' · ORSON WINS A ROUND' : ''}</small></div>}
      {det !== null && (() => { const dm = BY_ID[det]; const ci = CARD_CACHE.get(det); const ok = ci && ci !== 'wait' && ci !== 'err' ? ci : null; return <div className="cs-sheet" onClick={() => setDet(null)}><div className="cs-sheet-in" onClick={(e) => e.stopPropagation()}><b>{dm.t}</b><span className="cs-meta">{[dm.y, dm.k, dm.rn ? `${dm.rn} min` : ''].filter(Boolean).join(' · ')}</span>{dm.c && dm.c.length > 0 && <span className="cs-cast"><em>Starring</em> {dm.c.slice(0, 3).join(', ')}</span>}<Scores m={dm} /><p className="cs-hook">{ok ? ok.hook : dm.o}</p>{ok ? <><p><em>WHY CRITICS LOVED IT</em> {ok.loved}</p><p><em>THE CATCH</em> {ok.catch}</p>{ok.providers && ok.providers.names.length > 0 && <p><em>WATCH</em> {ok.providers.names.join(', ')}<span className="cs-jw"> Streaming data by JustWatch</span></p>}</> : <p className="cs-small">Orson is reading up on it...</p>}<button className="cs-btn cs-btn--gold" onClick={() => setDet(null)}>CLOSE</button></div></div>; })()}
    </div>);
  }

  // ---- FINAL
  if (s.phase === 'final') {
    const f = s.fin; const myChoice = f.choice[pid];
    if (!f.pitchEnds) return shell(<div className="cs-bracket"><div className="cs-round">THE FINAL TWO</div>
      <div className="cs-vs cs-titlecard">{[f.a, f.b].map((id) => <button key={id} className={'cs-match-card' + (myChoice === id ? ' is-mine' : '')} disabled={myChoice !== undefined} onClick={() => send({ t: 'fchoice', pid, id })}><Poster id={id} /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y}</span></button>)}</div>
      <p className="cs-small">{myChoice === undefined ? 'Pick the film you will fight for.' : `Locked. Waiting for ${them.name}.`}</p></div>);
    if (f.judging) return <Takeover a={f.a} b={f.b} />;
    const left = secs(f.pitchEnds, now); const submitted = f.submitted[pid];
    return shell(<div className="cs-pitch"><div className="cs-round">{f.rematchUsed ? 'REMATCH · SIDES SWAPPED' : 'PITCH-OFF'}<i>{left}s</i></div>
      <p className="cs-aside">Defend <b>{BY_ID[myChoice as number]?.t}</b>. Sixty seconds. Make Orson believe.</p>
      <textarea className="cs-text" maxLength={600} disabled={submitted} placeholder="Why this film, tonight, for the two of you?" value={pitchText} onChange={(e) => setPitchText(e.target.value)} />
      <button className="cs-btn cs-btn--gold" disabled={submitted} onClick={() => send({ t: 'pitch', pid, text: pitchText, submit: true })}>{submitted ? 'SUBMITTED' : 'SUBMIT PITCH'}</button></div>);
  }

  // ---- DONE
  const w = s.winner !== null ? BY_ID[s.winner] : null;
  const r = receipts(s);
  const iLost = s.fin.loser === pid;
  const showTk = !!(s.fin.verdict?.lines?.length) && !s.fin.tie && tkDone !== 'x';
  if (rrLive(s) && !showTk && w) return shell(<RerollScreen s={s} pid={pid} send={send} />);
  if (showTk && w) return <Takeover a={s.fin.a} b={s.fin.b} lines={s.fin.verdict?.lines} winner={w.id} onDone={() => setTkDone('x')} />;
  return shell(<div className="cs-done">
    <Confetti />
    <div className="cs-orson">TONIGHT YOU WATCH</div>
    {w && <><Poster id={w.id} big cls="cs-poster--win" /><h2>{w.t}</h2></>}
    {w && (() => { const ci = CARD_CACHE.get(w.id); return ci && ci !== 'err' && ci !== 'wait' && ci.providers && ci.providers.names.length > 0 ? <p className="cs-small cs-watch"><em>WATCH ON</em> {ci.providers.names.slice(0, 4).join(' · ')} <span className="cs-jw">({ci.providers.region}) Streaming data by JustWatch</span></p> : null; })()}
    {s.fin.verdict?.reason && <p className="cs-verdict">{s.fin.verdict.reason}</p>}
    {!s.fin.tie && s.fin.loser && <p className="cs-small cs-gold">{s.players[s.fin.loser].name} owes the popcorn. {led || ''}</p>}
    <div className="cs-receipts">
      <div><b>{r.overlap}/{DRAFT_SIZE}</b><span>drafts overlapped</span></div>
      <div><b>{r.wildWins}/{r.wildBouts}</b><span>wildcard wins</span></div>
      <div><b>{r.cavedA}·{r.cavedB}</b><span>caved {s.players.A.name.slice(0, 5)}·{s.players.B.name.slice(0, 5)}</span></div>
    </div>
    <div className="cs-row">
      {!s.b8 && iLost && !s.fin.rematchUsed && !s.fin.tie && <button className="cs-btn cs-btn--bullet" onClick={() => { buzz(60); send({ t: 'rematch' }); }}>REMATCH</button>}
      <button className="cs-btn" onClick={() => shareReceipts(s)}>SHARE</button>
      <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'reset' })}>AGAIN</button>
    </div>
  </div>);
}

function TapSync({ n, send, pid }: { n: number; send: (i: { t: 'tapcount'; pid: PID; n: number }) => void; pid: PID }) {
  useEffect(() => { const t = setTimeout(() => send({ t: 'tapcount', pid, n }), 120); return () => clearTimeout(t); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
