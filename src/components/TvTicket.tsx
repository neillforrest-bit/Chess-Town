'use client';
import { useEffect, useState } from 'react';
import type { PublicTour } from '@/lib/movie-tournament';
import { gameCards, GENRE_SPIN_MS } from '@/lib/movie-tournament';
import GenreWheel from './GenreWheel';
import { poster } from '@/lib/game';
import Qr from './Qr';
import s from './TvBig.module.css';

export default function TvTicket({ code }: { code: string }) {
  const [room, setRoom] = useState<PublicTour | null>(null);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(Date.now());
  const [qsize, setQsize] = useState(280);
  useEffect(() => { const f = () => setQsize(Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.3)); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/movie-tournament/' + code + '?spectate=1', { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) { if (!stop) setErr(j.error || 'Room not found'); return; }
        if (!stop) { setErr(''); setRoom((old) => (!old || j.v >= old.v ? j : old)); }
      } catch { if (!stop) setErr('Connecting…'); }
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(id); };
  }, [code]);

  const head = <header className={s.top}><span>MOVIE TIME · THE TICKET CUP</span><span>ROOM {code}</span></header>;
  const foot = (line?: string) => <footer className={s.foot}><span>{line || room?.line || 'Phones are the controllers. This screen only watches.'}</span><span>ORSON ON RULES · NO PAID AI</span></footer>;

  if (err && !room) return <main className={s.page}>{head}<section className={s.stage}><h1 className={s.huge}>MOVIE TIME</h1><p className={s.sub}>{err}</p><p className={s.sub}>Check the code on a player&apos;s phone, or start a room in Movie Time.</p></section>{foot('')}</main>;
  if (!room) return <main className={s.page}>{head}<section className={s.stage}><h1 className={s.huge}>MOVIE TIME</h1><p className={s.sub}>Looking for room {code}…</p></section>{foot('')}</main>;

  const phase = room.phase;
  const names = room.seats.map((p, i) => 'P' + (i + 1));
  const q = room.quiz;
  const question = q?.question;
  const numeric = question?.kind === 'Closest rating';
  const qLeft = q?.started ? Math.max(0, Math.ceil((q.started + 30000 - now) / 1000)) : 0;
  const pickEnds = room.pickEnds?.length ? Math.min(...room.pickEnds.filter(Boolean)) : 0;
  const pickLeft = pickEnds ? Math.max(0, Math.ceil((pickEnds - now) / 1000)) : 0;
  const pair = (room.pair || []).map((id) => room.films.find((m) => m.id === id)!).filter(Boolean);
  const tugs = pair.map((_, side) => room.seats.reduce((n, p) => n + (p.side === side ? p.spent * (p.double ? 2 : 1) : 0), 0));
  const champion = room.films.find((m) => m.id === room.winner);
  const card = gameCards[room.resume] || gameCards.bout;
  const titleOf = (id: number) => (room.pickPool || room.films).find((m) => m.id === id)?.t || 'Film #' + id;

  return <main className={s.page}>{head}
    <section className={s.stage}>

      {phase === 'lobby' && <>
        <p className={s.tag}>PLAYER ONE&apos;S PHONE STARTS THE GAME</p>
        <div className={s.code}>{code}</div>
        <div className={s.seats}>
          {room.seats.map((_, i) => <div key={i} className={s.seat + ' ' + s.here}><b>{names[i]}</b>IN THE ROOM</div>)}
          {room.seats.length < 2 && <div className={s.seat}><b>P{room.seats.length + 1}</b>WAITING…</div>}
        </div>
        {room.tvInvite
          ? <><div className={s.qrBg}><Qr text={location.origin + '/movie-tournament#room=' + code + '&invite=' + room.tvInvite} size={qsize} /></div><p className={s.sub}>Player 2: scan to take the second seat</p></>
          : <p className={s.sub}>Player 2 joins from the invite on Player 1&apos;s phone</p>}
      </>}

      {phase === 'card' && <>
        <p className={s.tag}>{card.tag}</p>
        <h1 className={s.huge}>{room.title}</h1>
        <p className={s.say}>{card.goal}</p>
        <ol className={s.steps}>{card.steps.map((x) => <li key={x}>{x}</li>)}</ol>
        <p className={s.sub}>{room.ready.length}/2 ready on phones</p>
      </>}

      {phase === 'quiz' && question && <>
        <p className={s.tag}>QUESTION {q.index + 1}/10 · {question.kind}</p>
        {!q.revealed && <div className={s.timer + (qLeft <= 10 ? ' ' + s.hot : '')}>{qLeft}</div>}
        <h1 className={s.huge}>{question.question}</h1>
        {numeric
          ? <p className={s.sub}>Both players lock a rating guess from 0.0 to 10.0{q.revealed && question.answer !== undefined ? ` · Target: ${question.answer.toFixed(1)}` : ''}</p>
          : <div className={s.options}>{question.options.map((o, i) => <div key={o} className={s.opt + (q.revealed && question.answer === i ? ' ' + s.right : '')}><b>{String.fromCharCode(65 + i)}</b>{o}{q.revealed && question.answer === i ? ' ✓' : ''}</div>)}</div>}
        <p className={s.say}>{q.revealed ? room.line : q.answered.length + '/2 answers locked'}</p>
        {q.revealed && question.explanation && <p className={s.sub}>{question.explanation}</p>}
      </>}

      {phase === 'genre' && <>
        <p className={s.tag}>THE GENRE WHEEL · TWO KEEPS EACH</p>
        <h1 className={s.huge}>Spin. Keep two. Pass the rest away.</h1>
        <div style={{ transform: 'scale(1.6)', transformOrigin: 'top center', width: 'fit-content', margin: '2vmin auto 10vmin' }}>
          <GenreWheel opts={room.gwheel.opts} idx={room.gwheel.idx} at={room.gwheel.at} n={room.gwheel.n} now={now} />
        </div>
        <div className={s.seats}>{room.kept.map((gs, i) => <div key={i} className={s.seat + (room.gwheel.turn === i ? ' ' + s.here : '')}><b>{names[i]}</b>{gs.length ? gs.join(' + ') : 'choosing…'}</div>)}</div>
        <p className={s.sub}>{room.gwheel.idx === null ? 'P' + (room.gwheel.turn + 1) + ' to spin · ' + room.gwheel.opts.length + ' genres still on the wheel' : now < room.gwheel.at + GENRE_SPIN_MS ? 'P' + (room.gwheel.turn + 1) + ' is spinning…' : 'Landed on ' + room.gwheel.opts[room.gwheel.idx] + ' · keep it or pass it away'}</p>
      </>}

      {['setter', 'filters', 'filterVote'].includes(phase) && <>
        <p className={s.tag}>{room.genre || 'TEAM FILTERS'}</p>
        <h1 className={s.huge}>{phase === 'setter' ? 'Spinning for the filter setter…' : phase === 'filters' ? (room.setter !== null ? names[room.setter] + ' is setting the filters' : 'Setting the filters') : 'Approving the filters'}</h1>
        {room.criteria && <p className={s.say}>{room.criteria}</p>}
        {phase === 'filterVote' && <p className={s.sub}>{room.poolCount} matching films · {room.accepted.length}/2 approved</p>}
      </>}

      {phase === 'picks' && <>
        <p className={s.tag}>THE CASTING CALL · FOUR FILMS EACH</p>
        <div className={s.timer + (pickLeft <= 15 ? ' ' + s.hot : pickLeft <= 30 ? ' ' + s.warm : '')}>{Math.floor(pickLeft / 60)}:{String(pickLeft % 60).padStart(2, '0')}</div>
        <div className={s.seats}>
          {room.picks.map((ids, i) => <div key={i} className={s.seat + (room.pickLocked.includes(i) ? ' ' + s.here : '')}><b>{names[i]}</b>{room.pickLocked.includes(i) ? 'LOCKED ✓' : ids.length + '/4 picked'}</div>)}
        </div>
        {room.picks.some((ids) => ids.length > 0) && <div className={s.grid4}>{room.picks.flatMap((ids, i) => ids.map((id) => <div key={id} className={s.mini}><b>{titleOf(id)}</b><span>{names[i]}</span></div>))}</div>}
      </>}

      {['bout', 'tie', 'result'].includes(phase) && pair.length === 2 && <>
        <p className={s.tag}>{room.stage === 0 ? 'QUARTER-FINAL' : room.stage === 1 ? 'SEMI-FINAL' : 'THE FINAL'} · BOUT {room.history.length + (phase === 'result' ? 0 : 1)}/7</p>
        <div className={s.vs}>
          <div className={s.film}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(pair[0], 'w500')} alt={pair[0].t} draggable={false} />
            <b>{pair[0].t}</b><span>{pair[0].y} · {pair[0].rt == null ? 'RT unscored' : 'RT ' + pair[0].rt + '%'}</span>
            {phase === 'result' && room.history.at(-1)?.winner === pair[0].id && <span className={s.tag}>ADVANCES ✓</span>}
          </div>
          <div className={s.vsMark}>VS</div>
          <div className={s.film}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(pair[1], 'w500')} alt={pair[1].t} draggable={false} />
            <b>{pair[1].t}</b><span>{pair[1].y} · {pair[1].rt == null ? 'RT unscored' : 'RT ' + pair[1].rt + '%'}</span>
            {phase === 'result' && room.history.at(-1)?.winner === pair[1].id && <span className={s.tag}>ADVANCES ✓</span>}
          </div>
        </div>
        <div className={s.tugWrap}>
          <div className={s.tugNums}><b>{tugs[0]} pull</b><b>{tugs[1]} pull</b></div>
          <div className={s.tug}><i style={{ left: (50 + (tugs[1] - tugs[0]) / Math.max(1, tugs[0] + tugs[1]) * 43) + '%' }} /></div>
        </div>
        <p className={s.say}>{phase === 'tie' ? 'A dead heat. Both choose a film, or both approve the tie wheel.' : phase === 'result' ? (room.history.at(-1) ? champion?.t + ' advances' + (room.history.at(-1)?.tied ? ' · tie resolved' : '') : '') : room.seats.map((p, i) => names[i] + ': ' + (p.locked ? 'locked' : 'pulling')).join(' · ')}</p>
      </>}

      {['confirm', 'done'].includes(phase) && champion && <>
        <p className={s.tag}>{phase === 'done' ? 'TONIGHT YOU WATCH' : 'TOURNAMENT CHAMPION · BOTH CONFIRM ON PHONES'}</p>
        <div className={s.film}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champion, 'w500')} alt={champion.t} draggable={false} />
          <b style={{ fontSize: '4.4vmin' }}>{champion.t}</b><span>{champion.y} · {champion.rt == null ? 'RT unscored' : 'RT ' + champion.rt + '%'}</span>
        </div>
        {phase === 'confirm' && <p className={s.sub}>{room.confirmed.length}/2 confirmed</p>}
      </>}

    </section>
    {foot()}
  </main>;
}
