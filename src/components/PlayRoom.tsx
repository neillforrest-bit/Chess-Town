'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { BY_ID, QUESTION_SETS, reactionFor, ROUND_LABEL, DRAFT_SIZE, RESPONSE_GATE, CLASH, AXES, fitPct, heatOf, TASTES, tasteHits, PASS_WHY, YES_WHY, type PID } from '@/lib/game';
import { Heat, Scores, OrsonBar, Poster, secs, useNow, Meter, BUILD, Typing, Confetti, buzz, ledgerLine, receipts, shareReceipts } from './shared';

const DRUMROLL_MS = 2800;

export default function PlayRoom({ code }: { code: string }) {
  const sp = useSearchParams();
  const pid = (sp.get('p') === 'B' ? 'B' : 'A') as PID;
  const name = sp.get('n') || '';
  const { state: s, send, skew, online } = useRoom(code, pid, name);
  const now = useNow(skew);
  const other: PID = pid === 'A' ? 'B' : 'A';
  const [copied, setCopied] = useState(false);
  const [pitchText, setPitchText] = useState('');
  const [tapN, setTapN] = useState(0);
  const [swap, setSwap] = useState<number | null>(null);
  const lastTapSend = useRef(0);
  const tapKey = useRef('');
  const startX = useRef<number | null>(null);
  const [sl, setSl] = useState(5);
  const [cont, setCont] = useState(false);
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
  useEffect(() => { setBp(''); }, [mt?.id]);
  useEffect(() => { if (s?.phase === 'final' && s.fin.rematchUsed) setPitchText(''); }, [s?.fin.rematchUsed, s?.phase]);

  if (!s) return <main className="cs-play"><div className="cs-wait">{online ? 'Looking for the room...' : 'Connecting...'}</div></main>;
  const me = s.players[pid], them = s.players[other];
  const head = <header className="cs-head"><b>CINE<em>SYNC</em></b>{s.vibe.score !== null && s.vibe.passed && <Heat h={heatOf(s)} />}<span>{me.name} · {code}</span></header>;
  const foot = <footer className="cs-foot"><Meter cost={s.cost} /><i>{BUILD}</i></footer>;
  const shell = (body: React.ReactNode, cls = '') => <main className="cs-play">{head}<OrsonBar o={s.orson} /><section className={'cs-body ' + cls}>{body}</section>{foot}</main>;
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
    const mine = s.vibe.ans[pid]; const nextQ = mine.findIndex((x) => x === null);
    if (nextQ >= 0) {
      const q = QUESTION_SETS[s.vibe.sets[nextQ]][nextQ];
      const redo = s.vibe.attempts > 0;
      const intro = redo && mine.filter((x) => x === null).length === 4 - mine.filter((x) => x !== null).length && nextQ === mine.findIndex((x) => x === null) && !mine.slice(0, nextQ).some((x, i) => x === null) && mine.filter((x) => x === null).length < 4 && mine.slice(0, nextQ).every((x) => x !== null) && nextQ === Math.min(...mine.map((x, i) => (x === null ? i : 9))) && !(mine.slice(0, nextQ).length === 0 && false) ? 'Only the questions where you two clash come back. The rest stay locked.' : nextQ === 0 && !redo ? (q.q.startsWith('LIGHTNING') ? 'Lightning round. No thinking. Instinct only.' : 'Four sliders, in private. I am hunting for common ground, and I do not scold.') : reactionFor(s.roast, ((mine[nextQ - 1] as number) ?? 0) + nextQ * 3);
      return shell(<div className="cs-ask" key={nextQ + ':' + s.vibe.set}>
        <div className="cs-dots4">{[0, 1, 2, 3].map((i) => <i key={i} className={mine[i] !== null ? 'is-done' : i === nextQ ? 'is-now' : ''} />)}</div>
        <div className="cs-orson">ORSON · {AXES[nextQ].toUpperCase()}</div>
        <p className="cs-aside">{intro}</p>
        <h2 className="cs-q">{q.q}</h2>
        <div className="cs-slider">
          <div className="cs-sval">{sl}</div>
          <input type="range" min={0} max={10} step={1} value={sl} onChange={(e) => { setSl(Number(e.target.value)); buzz(6); }} aria-label={q.q} />
          <div className="cs-sends"><span>{q.lo}</span><span>{q.hi}</span></div>
        </div>
        <button className="cs-btn cs-btn--gold" onClick={() => { buzz(14); send({ t: 'ans', pid, q: nextQ, val: sl }); setSl(5); }}>LOCK IT IN</button>
      </div>);
    }
    if (s.vibe.score === null) return shell(<div className="cs-center"><div className="cs-orson">ORSON</div><p className="cs-say">Locked. Waiting for {them.name} to finish. No peeking.</p><Typing text="Orson is polishing his monocle" /></div>);
    if (s.vibe.doneAt && now - s.vibe.doneAt < DRUMROLL_MS) return shell(<div className="cs-center cs-drum"><div className="cs-orson">THE GATE</div><div className="cs-drumring" /><Typing text="Orson is judging your taste" /></div>);
    const theirs = s.vibe.ans[other]; let bi = 0, bd = -1; for (let i = 0; i < 4; i++) { const d = Math.abs((mine[i] as number) - (theirs[i] as number)); if (d > bd) { bd = d; bi = i; } }
    const sc = s.vibe.score as number;
    if (s.vibe.passed && s.vibe.tastes[pid] === null && cont) {
      const tog = (t: string) => { if (tg.includes(t)) { setTg(tg.filter((y) => y !== t)); setNos([...nos, t]); } else if (nos.includes(t)) setNos(nos.filter((y) => y !== t)); else setTg([...tg, t]); };
      return shell(<div className="cs-ask cs-ask--tight">
        <div className="cs-orson">ORSON · THE TASTE MAP</div>
        <p className="cs-aside">Private. Tap once to CRAVE, twice to BAN, three times to clear. A ban is a hard no for the whole night.</p>
        <div className="cs-tmap">{TASTES.map((t) => <button key={t} className={'cs-tchip' + (tg.includes(t) ? ' is-crave' : nos.includes(t) ? ' is-ban' : '')} onClick={() => { buzz(8); tog(t); }}>{nos.includes(t) ? '✕ ' : tg.includes(t) ? '★ ' : ''}{t}</button>)}</div>
        <input className="cs-input" maxLength={30} placeholder="An actor you want to see (optional)" value={actor} onChange={(e) => setActor(e.target.value)} />
        <button className="cs-btn cs-btn--gold" onClick={() => { buzz(14); send({ t: 'taste', pid, tags: tg, nos, actor }); }}>LOCK MY TASTE</button>
      </div>);
    }
    if (s.vibe.passed && s.vibe.tastes[pid] !== null && s.vibe.tastes[other] === null) return shell(<div className="cs-center"><div className="cs-orson">ORSON</div><p className="cs-say">Your taste is locked. Waiting for {them.name} to confess theirs.</p><Typing text="Orson is reading over a shoulder" /></div>);
    const playback = bd > 0 ? `Widest gap, ${AXES[bi].toLowerCase()}: you said ${mine[bi]}, ${them.name} said ${theirs[bi]}.` : 'You answered like a single organism. Suspicious.';
    return shell(<div className="cs-center">
      {s.vibe.passed && <Confetti />}
      <div className={'cs-result ' + (s.vibe.passed ? 'cs-result--ok' : 'cs-result--no')}>
        <div className="cs-score">{Math.round(sc * 100)}%</div>
        <Heat h={Math.round(sc * 100)} big />
        <div className="cs-axes">{AXES.map((nm, i) => { const d = Math.abs((mine[i] as number) - (theirs[i] as number)); return <div key={nm} className={'cs-axis' + (d >= CLASH ? ' is-clash' : '')}><span>{nm}</span><div className="cs-atrack"><i className="me" style={{ left: `${(mine[i] as number) * 10}%` }} /><i className="them" style={{ left: `${(theirs[i] as number) * 10}%` }} /></div><b>{d >= CLASH ? 'CLASH' : d <= 1 ? 'in sync' : ''}</b></div>; })}</div>
        <p className="cs-say">{s.vibe.passed ? 'In sync. I am almost moved.' : `${Math.round(RESPONSE_GATE * 100)}% was the bar and you missed it. That is my cue, not your failure.`}</p>
        <p className="cs-small">{playback} <span className="cs-legend">gold = you</span></p>
        {s.vibe.passed ? (s.vibe.tastes.A && s.vibe.tastes.B ? <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'begin' })}>BEGIN THE DRAFT</button> : <button className="cs-btn cs-btn--gold" onClick={() => setCont(true)}>CONTINUE · TASTE MAP</button>) : <button className="cs-btn" onClick={() => send({ t: 'retry' })}>RE-ASK THE CLASHES</button>}
      </div></div>);
  }

  // ---- PHASE 2: draft
  if (s.phase === 'draft') {
    const picks = s.draft.picks[pid]; const idx = s.draft.idx[pid]; const id = s.draft.inbox[pid][0] ?? s.draft.q[pid][0];
    if (s.draft.loading) return shell(<div className="cs-center"><div className="cs-spin" /><Typing text="Orson is writing a pitch for every film. He is dramatic about it" /></div>);
    if (picks.length >= DRAFT_SIZE) return shell(<div className="cs-center"><p className="cs-say">Ten drafted and locked. Your picks stay secret.</p><p className="cs-small">{s.draft.picks[other].length >= DRAFT_SIZE ? 'Both done.' : `${them.name} has ${s.draft.picks[other].length}/${DRAFT_SIZE}.`}</p></div>);
    if (id === undefined) return shell(<div className="cs-center">Out of films.</div>);
    const m = BY_ID[id]; const sur = s.draft.inbox[pid][0] === id ? s.draft.sur[id] : undefined;
    const ask = (yes: boolean) => { buzz(yes ? 18 : 8); setArm(''); setWhy([]); setPend(yes); };
    const go = (yes: boolean, w: string[] = []) => { setPend(null); setWhy([]); send({ t: 'swipe', pid, id, yes, why: w }); };
    const pw = s.pw[pid]; const fit = fitPct(m, s.vibe.target || [5, 5, 5, 5]);
    const critic = m.rt != null ? (m.rt >= 85 ? 'Critics raved' : m.rt >= 70 ? 'Critics liked it' : m.rt >= 50 ? 'Critics were split' : 'Critics were not kind') : m.mc != null ? (m.mc >= 70 ? 'Critics liked it' : m.mc >= 50 ? 'Critics were mixed' : 'Critics were not kind') : null;
    const runtime = m.rn ? `${Math.floor(m.rn / 60)}h ${String(m.rn % 60).padStart(2, '0')}m` : '';
    const press = (kind: 'veto' | 'surprise') => { const key = kind + ':' + id; if (arm === key) { buzz([40, 30, 60]); setArm(''); send({ t: kind, pid, id }); } else setArm(key); };
    return shell(<div className="cs-draft"
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) { startX.current = null; return; } startX.current = e.clientX; }}
      onPointerUp={(e) => { if (startX.current === null) return; const dx = e.clientX - startX.current; startX.current = null; if (Math.abs(dx) > 70 && pend === null) ask(dx > 0); }}>
      <div className="cs-count"><span>DRAFTED {picks.length}/{DRAFT_SIZE}</span><span className="cs-fit">{fit}% TONIGHT&apos;S MOOD</span></div>
      <div className="cs-card" key={id}>
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
        <p className="cs-why"><em>WHY YOU&apos;LL LIKE IT</em> {s.draft.pitches[id] || m.o}</p>
      </div>
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

  // ---- PHASE 3: bracket
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
    const myVote = mt.votes[pid]; const bothVoted = mt.votes.A !== undefined && mt.votes.B !== undefined;
    const tap = mt.tap; const left = tap ? secs(tap.until, now) : 0;
    const card = (id: number) => (
      <button key={id} className={'cs-match-card' + (myVote === id ? ' is-mine' : '') + (bp && mt.winner === null ? ' is-target' : '') + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '')}
        disabled={mt.winner !== null || (bp ? !!tap : myVote !== undefined)} onClick={() => { if (bp) { buzz([90, 40, 160]); send({ t: bp === 'bullet' ? 'bullet' : 'bveto', pid, id }); setBp(''); } else { buzz(15); send({ t: 'vote', pid, pick: id }); } }}>
        <Poster id={id} /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}</span>
      </button>);
    return shell(<div className="cs-bracket" key={mt.id}>
      <div className="cs-round">{label}<i>{s.br.cur + 1}/{n}</i></div>
      {s.br.round === 2 && s.br.golden && <div className="cs-golden">GOLDEN BYE · {BY_ID[s.br.golden].t}</div>}
      <div className="cs-vs cs-titlecard">{card(mt.a)}<div className="cs-vs-mid">VS</div>{card(mt.b)}</div>
      {mt.winner !== null && <div className="cs-won">{BY_ID[mt.winner].t} advances <small>{mt.via}</small></div>}
      {mt.winner === null && !tap && <p className="cs-small">{myVote === undefined ? 'Pick the one you would rather watch.' : bothVoted ? '' : `Locked. Waiting for ${them.name}.`}</p>}
      {tap && mt.winner === null && <div className="cs-tap">
        <div className="cs-tapfight">TAP BATTLE · back {BY_ID[myVote as number]?.t.slice(0, 22)} · {left}s</div>
        <button className="cs-tapbtn" onPointerDown={() => { buzz(8); const n2 = tapN + 1; setTapN(n2); const t = Date.now(); if (t - lastTapSend.current > 180) { lastTapSend.current = t; send({ t: 'tapcount', pid, n: n2 }); } }}>TAP<br />{tapN}</button>
      </div>}
      {tap && <TapSync n={tapN} send={send} pid={pid} />}
      {mt.winner === null && !tap && <div className="cs-powers">
        <button className={'cs-pw cs-pw--bullet' + (bp === 'bullet' ? ' is-armed' : '')} disabled={!s.pw[pid].bullet} onClick={() => setBp(bp === 'bullet' ? '' : 'bullet')}>{!s.pw[pid].bullet ? 'BULLET SPENT' : bp === 'bullet' ? 'TAP A FILM TO KILL IT' : 'SILVER BULLET'}</button>
        <button className={'cs-pw' + (bp === 'veto' ? ' is-armed' : '')} disabled={!s.pw[pid].veto} onClick={() => setBp(bp === 'veto' ? '' : 'veto')}>{!s.pw[pid].veto ? 'VETO SPENT' : bp === 'veto' ? 'TAP A FILM TO VETO' : 'VETO · wildcard swaps in'}</button>
      </div>}
    </div>);
  }

  // ---- FINAL
  if (s.phase === 'final') {
    const f = s.fin; const myChoice = f.choice[pid];
    if (!f.pitchEnds) return shell(<div className="cs-bracket"><div className="cs-round">THE FINAL TWO</div>
      <div className="cs-vs cs-titlecard">{[f.a, f.b].map((id) => <button key={id} className={'cs-match-card' + (myChoice === id ? ' is-mine' : '')} disabled={myChoice !== undefined} onClick={() => send({ t: 'fchoice', pid, id })}><Poster id={id} /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y}</span></button>)}</div>
      <p className="cs-small">{myChoice === undefined ? 'Pick the film you will fight for.' : `Locked. Waiting for ${them.name}.`}</p></div>);
    if (f.judging) return shell(<div className="cs-center"><div className="cs-orson">THE JUDGE</div><Typing text="Orson is deliberating. Please do not breathe on the judge" /></div>);
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
  return shell(<div className="cs-done">
    <Confetti />
    <div className="cs-orson">TONIGHT YOU WATCH</div>
    {w && <><Poster id={w.id} big cls="cs-poster--win" /><h2>{w.t}</h2></>}
    {s.fin.verdict?.reason && <p className="cs-verdict">{s.fin.verdict.reason}</p>}
    {!s.fin.tie && s.fin.loser && <p className="cs-small cs-gold">{s.players[s.fin.loser].name} owes the popcorn. {led || ''}</p>}
    <div className="cs-receipts">
      <div><b>{r.overlap}/{DRAFT_SIZE}</b><span>drafts overlapped</span></div>
      <div><b>{r.wildWins}/{r.wildBouts}</b><span>wildcard wins</span></div>
      <div><b>{r.cavedA}·{r.cavedB}</b><span>caved {s.players.A.name.slice(0, 5)}·{s.players.B.name.slice(0, 5)}</span></div>
    </div>
    <div className="cs-row">
      {iLost && !s.fin.rematchUsed && !s.fin.tie && <button className="cs-btn cs-btn--bullet" onClick={() => { buzz(60); send({ t: 'rematch' }); }}>REMATCH</button>}
      <button className="cs-btn" onClick={() => shareReceipts(s)}>SHARE</button>
      <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'reset' })}>AGAIN</button>
    </div>
  </div>);
}

function TapSync({ n, send, pid }: { n: number; send: (i: { t: 'tapcount'; pid: PID; n: number }) => void; pid: PID }) {
  useEffect(() => { const t = setTimeout(() => send({ t: 'tapcount', pid, n }), 120); return () => clearTimeout(t); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
