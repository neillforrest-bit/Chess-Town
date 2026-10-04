'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { BY_ID, QUESTION_SETS, reactionFor, ROUND_LABEL, DRAFT_SIZE, RESPONSE_GATE, type PID } from '@/lib/game';
import { Poster, secs, useNow, Meter, BUILD, Typing, Confetti, buzz, ledgerLine, receipts, shareReceipts } from './shared';

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

  const mt = s && s.phase === 'bracket' ? s.br.matches[s.br.cur] : null;
  useEffect(() => { const k = mt?.tap ? mt.id : ''; if (k !== tapKey.current) { tapKey.current = k; setTapN(0); if (k) buzz([30, 40, 30]); } }, [mt?.id, mt?.tap]);
  useEffect(() => { if (!s || s.phase !== 'final' || !s.fin.pitchEnds) return; const t = setTimeout(() => send({ t: 'pitch', pid, text: pitchText }), 600); return () => clearTimeout(t); }, [pitchText]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s?.phase === 'final' && s.fin.rematchUsed) setPitchText(''); }, [s?.fin.rematchUsed, s?.phase]);

  if (!s) return <main className="cs-play"><div className="cs-wait">{online ? 'Looking for the room...' : 'Connecting...'}</div></main>;
  const me = s.players[pid], them = s.players[other];
  const head = <header className="cs-head"><b>CINE<em>SYNC</em></b><span>{me.name} · {code}</span></header>;
  const foot = <footer className="cs-foot"><Meter cost={s.cost} /><i>{BUILD}</i></footer>;
  const shell = (body: React.ReactNode, cls = '') => <main className="cs-play">{head}<section className={'cs-body ' + cls}>{body}</section>{foot}</main>;
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
      <button className="cs-btn" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'COPIED' : 'COPY INVITE LINK'}</button>
      <p className="cs-small">TV: open <b>/tv/{code}</b></p>
    </div>);
  }

  // ---- PHASE 1: vibe, one question at a time
  if (s.phase === 'vibe') {
    const qs = QUESTION_SETS[s.vibe.set];
    const mine = s.vibe.ans[pid]; const nextQ = mine.findIndex((x) => x === null);
    if (nextQ >= 0) {
      const q = qs[nextQ];
      const intro = nextQ === 0 ? (qs[0].q.startsWith('LIGHTNING') ? 'Lightning round. No thinking. Instinct only.' : 'Four questions, in private. I am hunting for 60% common ground, and I do not scold.') : reactionFor(s.roast, (mine[nextQ - 1] as number) + nextQ * 3);
      return shell(<div className="cs-ask">
        <div className="cs-dots4">{[0, 1, 2, 3].map((i) => <i key={i} className={i < nextQ ? 'is-done' : i === nextQ ? 'is-now' : ''} />)}</div>
        <div className="cs-orson">ORSON</div>
        <p className="cs-aside">{intro}</p>
        <h2 className="cs-q">{q.q}</h2>
        <div className="cs-chips">{q.opts.map((o, k) => <button key={k} className="cs-chip" onClick={() => { buzz(12); send({ t: 'ans', pid, q: nextQ, val: k }); }}>{o}</button>)}</div>
      </div>);
    }
    if (s.vibe.score === null) return shell(<div className="cs-center"><div className="cs-orson">ORSON</div><p className="cs-say">Locked. Waiting for {them.name} to finish. No peeking.</p><Typing text="Orson is polishing his monocle" /></div>);
    if (s.vibe.doneAt && now - s.vibe.doneAt < DRUMROLL_MS) return shell(<div className="cs-center cs-drum"><div className="cs-orson">THE GATE</div><div className="cs-drumring" /><Typing text="Orson is judging your taste" /></div>);
    // playback of their own words
    const theirs = s.vibe.ans[other]; let bi = 0, bd = -1; for (let i = 0; i < 4; i++) { const d = Math.abs((mine[i] as number) - (theirs[i] as number)); if (d > bd) { bd = d; bi = i; } }
    const playback = bd > 0 ? `On "${qs[bi].q.replace('LIGHTNING. ', '')}" you said "${qs[bi].opts[mine[bi] as number]}". ${them.name} said "${qs[bi].opts[theirs[bi] as number]}".` : 'You answered like a single organism. Suspicious.';
    return shell(<div className="cs-center">
      {s.vibe.passed && <Confetti />}
      <div className={'cs-result ' + (s.vibe.passed ? 'cs-result--ok' : 'cs-result--no')}>
        <div className="cs-score">{Math.round((s.vibe.score as number) * 100)}%</div>
        <p className="cs-say">{s.vibe.passed ? 'In sync. I am almost moved.' : `${Math.round(RESPONSE_GATE * 100)}% was the bar and you missed it. That is my cue, not your failure.`}</p>
        <p className="cs-small">{playback}</p>
        {s.vibe.passed ? <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'begin' })}>BEGIN THE DRAFT</button> : <button className="cs-btn" onClick={() => send({ t: 'retry' })}>TRY ANOTHER ANGLE</button>}
      </div></div>);
  }

  // ---- PHASE 2: draft
  if (s.phase === 'draft') {
    const picks = s.draft.picks[pid]; const idx = s.draft.idx[pid]; const id = s.draft.deck[idx];
    if (s.draft.loading) return shell(<div className="cs-center"><div className="cs-spin" /><Typing text="Orson is writing a pitch for every film. He is dramatic about it" /></div>);
    if (picks.length >= DRAFT_SIZE) return shell(<div className="cs-center"><p className="cs-say">Ten drafted and locked. Your picks stay secret.</p><p className="cs-small">{s.draft.picks[other].length >= DRAFT_SIZE ? 'Both done.' : `${them.name} has ${s.draft.picks[other].length}/${DRAFT_SIZE}.`}</p></div>);
    if (id === undefined) return shell(<div className="cs-center">Out of films.</div>);
    const m = BY_ID[id];
    const go = (yes: boolean) => { buzz(yes ? 18 : 8); send({ t: 'swipe', pid, id, yes }); };
    return shell(<div className="cs-draft"
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => { if (startX.current === null) return; const dx = e.clientX - startX.current; startX.current = null; if (Math.abs(dx) > 70) go(dx > 0); }}>
      <div className="cs-count">DRAFTED {picks.length}/{DRAFT_SIZE}</div>
      <div className="cs-deal" key={id}>
        <Poster id={id} big />
        <div className="cs-deal-info"><b>{m.t}</b><span>{m.y} · {m.r.toFixed(1)}/10 · {m.g.slice(0, 2).join(' · ')}</span><p>{s.draft.pitches[id] || m.o}</p></div>
      </div>
      <div className="cs-swipes"><button className="cs-btn cs-btn--no" onClick={() => go(false)}>PASS</button><button className="cs-btn cs-btn--gold" onClick={() => go(true)}>DRAFT</button></div>
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
      <button key={id} className={'cs-match-card' + (myVote === id ? ' is-mine' : '') + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '')}
        disabled={mt.winner !== null || myVote !== undefined} onClick={() => { buzz(15); send({ t: 'vote', pid, pick: id }); }}>
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
      {s.br.round === 3 && mt.winner === null && s.br.bullets[pid] && !tap && <div className="cs-bullets">
        <p className="cs-small">SILVER BULLET · one per round · instantly kills a film here</p>
        <div className="cs-row">{[mt.a, mt.b].map((id) => <button key={id} className="cs-btn cs-btn--bullet" onClick={() => { buzz([90, 40, 160]); send({ t: 'bullet', pid, id }); }}>KILL {BY_ID[id].t.slice(0, 14)}</button>)}</div>
      </div>}
      {s.br.round === 3 && !s.br.bullets[pid] && mt.winner === null && !tap && <p className="cs-small">Your Silver Bullet is spent.</p>}
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
