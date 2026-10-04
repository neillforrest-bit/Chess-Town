'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { BY_ID, QUESTION_SETS, ORSON_REACTIONS, ROUND_LABEL, DRAFT_SIZE, RESPONSE_GATE, type PID } from '@/lib/game';
import { Poster, secs, useNow, Meter, BUILD } from './shared';

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
  const lastTapSend = useRef(0);
  const tapKey = useRef('');
  const startX = useRef<number | null>(null);

  const mt = s && s.phase === 'bracket' ? s.br.matches[s.br.cur] : null;
  // reset local tap counter when a new tap battle starts
  useEffect(() => { const k = mt?.tap ? mt.id : ''; if (k !== tapKey.current) { tapKey.current = k; setTapN(0); } }, [mt?.id, mt?.tap]);
  // debounce pitch text to host
  useEffect(() => { if (!s || s.phase !== 'final' || !s.fin.pitchEnds) return; const t = setTimeout(() => send({ t: 'pitch', pid, text: pitchText }), 600); return () => clearTimeout(t); }, [pitchText]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <main className="cs-play"><div className="cs-wait">{online ? 'Looking for the room...' : 'Connecting...'}</div></main>;
  const me = s.players[pid], them = s.players[other];
  const head = <header className="cs-head"><b>CINESYNC</b><span>{me.name} · room {code}</span></header>;
  const foot = <footer className="cs-foot"><Meter cost={s.cost} /><i>build {BUILD}</i></footer>;

  const shell = (body: React.ReactNode) => <main className="cs-play">{head}<section className="cs-body">{body}</section>{foot}</main>;

  // ---- LOBBY
  if (s.phase === 'lobby') {
    const link = typeof window !== 'undefined' ? `${location.origin}/play/${code}?p=B` : '';
    return shell(<div className="cs-center">
      <div className="cs-orson">ORSON</div>
      <p className="cs-say">Welcome. I am Orson, your host. I need two humans and one disagreement.</p>
      <div className="cs-code">{code}</div>
      <p className="cs-small">{them.joined ? `${them.name} is here.` : 'Waiting for your partner. Give them this code on the join screen, or send the link.'}</p>
      <button className="cs-btn" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'COPIED' : 'COPY INVITE LINK'}</button>
      <p className="cs-small">TV: open <b>/tv/{code}</b> on the big screen.</p>
    </div>);
  }

  // ---- PHASE 1: vibe chat
  if (s.phase === 'vibe') {
    const qs = QUESTION_SETS[s.vibe.set];
    const mine = s.vibe.ans[pid]; const nextQ = mine.findIndex((x) => x === null);
    const bothDone = s.vibe.score !== null;
    return shell(<div className="cs-chat">
      <div className="cs-bubble cs-bubble--o">Four questions, answered in private. You each need to land at least {Math.round(RESPONSE_GATE * 100)}% aligned or we do this again.</div>
      {qs.map((q, i) => mine[i] === null && i !== nextQ ? null : (
        <div key={i}>
          <div className="cs-bubble cs-bubble--o">{q.q}</div>
          {mine[i] !== null
            ? <><div className="cs-bubble cs-bubble--me">{q.opts[mine[i] as number]}</div><div className="cs-bubble cs-bubble--o cs-dim">{ORSON_REACTIONS[(i + (mine[i] as number)) % ORSON_REACTIONS.length]}</div></>
            : <div className="cs-chips">{q.opts.map((o, k) => <button key={k} className="cs-chip" onClick={() => send({ t: 'ans', pid, q: i, val: k })}>{o}</button>)}</div>}
        </div>))}
      {nextQ === -1 && !bothDone && <div className="cs-bubble cs-bubble--o">Locked. Waiting for {them.name} to finish. No peeking.</div>}
      {bothDone && <div className={'cs-result ' + (s.vibe.passed ? 'cs-result--ok' : 'cs-result--no')}>
        <div className="cs-score">{Math.round((s.vibe.score as number) * 100)}%</div>
        <p>{s.vibe.passed ? 'Aligned. Orson approves this marriage of tastes.' : 'Not aligned enough. Your tastes are what scientists call "a situation". New questions coming.'}</p>
        {s.vibe.passed ? <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'begin' })}>BEGIN THE DRAFT</button> : <button className="cs-btn" onClick={() => send({ t: 'retry' })}>TRY AGAIN</button>}
      </div>}
    </div>);
  }

  // ---- PHASE 2: draft
  if (s.phase === 'draft') {
    const picks = s.draft.picks[pid]; const idx = s.draft.idx[pid]; const id = s.draft.deck[idx];
    if (s.draft.loading) return shell(<div className="cs-center"><div className="cs-spin" /><p className="cs-say">Orson is writing a pitch for every film. Give him a moment. He is dramatic about it.</p></div>);
    if (picks.length >= DRAFT_SIZE) return shell(<div className="cs-center"><p className="cs-say">Ten drafted and locked. Your picks stay secret.</p><p className="cs-small">{s.draft.picks[other].length >= DRAFT_SIZE ? 'Both done.' : `${them.name} has ${s.draft.picks[other].length}/${DRAFT_SIZE}.`}</p></div>);
    if (id === undefined) return shell(<div className="cs-center">Out of films.</div>);
    const m = BY_ID[id];
    return shell(<div className="cs-draft"
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => { if (startX.current === null) return; const dx = e.clientX - startX.current; startX.current = null; if (Math.abs(dx) > 70) send({ t: 'swipe', pid, id, yes: dx > 0 }); }}>
      <div className="cs-count">DRAFTED {picks.length}/{DRAFT_SIZE} · card {idx + 1}</div>
      <div className="cs-card"><Poster id={id} big /><div className="cs-card-info"><b>{m.t}</b> <span>{m.y} · {m.r.toFixed(1)}/10</span><em>{m.g.slice(0, 3).join(' · ')}</em><p>{s.draft.pitches[id] || m.o}</p></div></div>
      <div className="cs-swipes"><button className="cs-btn cs-btn--no" onClick={() => send({ t: 'swipe', pid, id, yes: false })}>PASS</button><button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'swipe', pid, id, yes: true })}>DRAFT</button></div>
      <p className="cs-small">Swipe right to draft, left to pass. Or tap.</p>
    </div>);
  }

  // ---- PHASE 3: bracket
  if (s.phase === 'bracket' && mt) {
    const label = ROUND_LABEL[s.br.round]; const n = s.br.matches.length;
    const myVote = mt.votes[pid]; const bothVoted = mt.votes.A !== undefined && mt.votes.B !== undefined;
    const tap = mt.tap; const left = tap ? secs(tap.until, now) : 0;
    const poolPick = (id: number) => (
      <button key={id} className={'cs-match-card' + (myVote === id ? ' is-mine' : '') + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '')}
        disabled={mt.winner !== null || myVote !== undefined} onClick={() => send({ t: 'vote', pid, pick: id })}>
        <Poster id={id} /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}</span>
      </button>);
    return shell(<div className="cs-bracket">
      <div className="cs-round">{label}<i>match {s.br.cur + 1}/{n}</i></div>
      {s.br.round === 2 && s.br.golden && <div className="cs-golden">GOLDEN BYE: {BY_ID[s.br.golden].t}</div>}
      <div className="cs-vs">{poolPick(mt.a)}<div className="cs-vs-mid">VS</div>{poolPick(mt.b)}</div>
      {mt.winner !== null && <div className="cs-won">{BY_ID[mt.winner].t} advances <small>{mt.via}</small></div>}
      {mt.winner === null && !tap && (myVote === undefined ? <p className="cs-small">Pick the one you would rather watch.</p> : <p className="cs-small">{bothVoted ? '' : `Locked. Waiting for ${them.name}.`}</p>)}
      {tap && mt.winner === null && <div className="cs-tap">
        <div className="cs-tapfight">TAP BATTLE! You split. Back your pick: {BY_ID[myVote as number]?.t}</div>
        <div className="cs-time">{left}s</div>
        <button className="cs-tapbtn" onPointerDown={() => { const n2 = tapN + 1; setTapN(n2); const t = Date.now(); if (t - lastTapSend.current > 180) { lastTapSend.current = t; send({ t: 'tapcount', pid, n: n2 }); } }}>TAP<br />{tapN}</button>
      </div>}
      {tap && <TapSync n={tapN} send={send} pid={pid} />}
      {s.br.round === 3 && mt.winner === null && s.br.bullets[pid] && !tap && <div className="cs-bullets">
        <p className="cs-small">SILVER BULLET (one per player, whole round): instantly kill a film in this match.</p>
        <div className="cs-row">{[mt.a, mt.b].map((id) => <button key={id} className="cs-btn cs-btn--bullet" onClick={() => send({ t: 'bullet', pid, id })}>KILL {BY_ID[id].t.slice(0, 16)}</button>)}</div>
      </div>}
      {s.br.round === 3 && !s.br.bullets[pid] && <p className="cs-small">Your Silver Bullet is spent.</p>}
    </div>);
  }

  // ---- FINAL
  if (s.phase === 'final') {
    const f = s.fin; const myChoice = f.choice[pid];
    if (!f.pitchEnds) return shell(<div className="cs-bracket"><div className="cs-round">THE FINAL TWO</div>
      <div className="cs-vs">{[f.a, f.b].map((id) => <button key={id} className={'cs-match-card' + (myChoice === id ? ' is-mine' : '')} disabled={myChoice !== undefined} onClick={() => send({ t: 'fchoice', pid, id })}><Poster id={id} /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y}</span></button>)}</div>
      <p className="cs-small">{myChoice === undefined ? 'Pick the film you will fight for.' : `Locked. Waiting for ${them.name}.`}</p></div>);
    if (f.judging) return shell(<div className="cs-center"><div className="cs-spin" /><p className="cs-say">Orson is deliberating. Please do not breathe on the judge.</p></div>);
    const left = secs(f.pitchEnds, now); const submitted = f.submitted[pid];
    return shell(<div className="cs-pitch"><div className="cs-round">PITCH-OFF<i>{left}s</i></div>
      <p className="cs-say">Defend <b>{BY_ID[myChoice as number]?.t}</b>. 60 seconds. Make Orson believe.</p>
      <textarea className="cs-text" maxLength={600} disabled={submitted} placeholder="Why this film, tonight, for the two of you?" value={pitchText} onChange={(e) => setPitchText(e.target.value)} />
      <button className="cs-btn cs-btn--gold" disabled={submitted} onClick={() => send({ t: 'pitch', pid, text: pitchText, submit: true })}>{submitted ? 'SUBMITTED' : 'SUBMIT PITCH'}</button></div>);
  }

  // ---- DONE
  const w = s.winner !== null ? BY_ID[s.winner] : null;
  return shell(<div className="cs-center cs-winner">
    <div className="cs-orson">TONIGHT YOU WATCH</div>
    {w && <><Poster id={w.id} big cls="cs-poster--win" /><h2>{w.t}</h2><p className="cs-small">{w.y} · {w.r.toFixed(1)}/10 · {w.g.slice(0, 3).join(' · ')}</p></>}
    {s.fin.verdict?.reason && <p className="cs-say">{s.fin.verdict.reason}</p>}
    <button className="cs-btn" onClick={() => send({ t: 'reset' })}>PLAY AGAIN</button>
  </div>);
}

// sends the final tap total shortly after the last tap so the host never misses the last few taps
function TapSync({ n, send, pid }: { n: number; send: (i: { t: 'tapcount'; pid: PID; n: number }) => void; pid: PID }) {
  useEffect(() => { const t = setTimeout(() => send({ t: 'tapcount', pid, n }), 120); return () => clearTimeout(t); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
