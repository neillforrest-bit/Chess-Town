'use client';
import { useEffect, useState } from 'react';
import { BY_ID, poster, registerExtra, type Movie } from '@/lib/game';
import { pairsScores, type PublicDuo } from '@/lib/duo';
import Qr from './Qr';
import s from './TvBig.module.css';

export default function TvDuo({ code }: { code: string }) {
  const [room, setRoom] = useState<PublicDuo | null>(null);
  const [err, setErr] = useState('');
  const [qsize, setQsize] = useState(280);
  useEffect(() => { const f = () => setQsize(Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.3)); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/duo/' + code + '?spectate=1', { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) { if (!stop) setErr(j.error || 'Room not found'); return; }
        if (!stop) { setErr(''); setRoom((old) => (!old || j.v >= old.v ? j : old)); if (j.extras?.length) registerExtra(j.extras); }
      } catch { if (!stop) setErr('Connecting…'); }
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(id); };
  }, [code]);

  const head = <header className={s.top}><span>MOVIE TIME · DUO NIGHT</span><span>ROOM {code}</span></header>;
  const foot = (line?: string) => <footer className={s.foot}><span>{line || room?.line || 'Phones are the controllers. This screen only watches.'}</span><span>ORSON ON RULES · NO PAID AI</span></footer>;

  if (err && !room) return <main className={s.page}>{head}<section className={s.stage}><h1 className={s.huge}>MOVIE TIME</h1><p className={s.sub}>{err}</p></section>{foot('')}</main>;
  if (!room) return <main className={s.page}>{head}<section className={s.stage}><h1 className={s.huge}>MOVIE TIME</h1><p className={s.sub}>Looking for room {code}…</p></section>{foot('')}</main>;

  const phase = room.phase;
  const film = (id: number): Movie | undefined => BY_ID[id] || room.extras.find((m) => m.id === id);
  const pair = (room.pair || []).map((id) => film(id)!).filter(Boolean);
  const tugs = pair.map((_, side) => room.seats.reduce((n, p) => n + (p.side === side ? p.spent * (p.double ? 2 : 1) : 0), 0));
  const champion = room.winner !== null ? film(room.winner) : null;
  const pairFilm = room.pairs && room.pairs.cards[room.pairs.turnIdx] ? film(room.pairs.cards[room.pairs.turnIdx].id) : null;
  const maxSync = (room.shelf.length || 1) * 2;
  const tag = (id: number) => room.overlaps.includes(id) ? 'BOTH KEPT' : room.wilds.includes(id) ? 'ORSON WILDCARD' : room.loners[0]?.includes(id) ? room.seats[0].name.toUpperCase() + ' ONLY' : room.loners[1]?.includes(id) ? room.seats[1].name.toUpperCase() + ' ONLY' : '';

  return <main className={s.page}>{head}
    <section className={s.stage}>

      {phase === 'lobby' && <>
        <p className={s.tag}>DUO NIGHT · TWO SEATS</p>
        <div className={s.code}>{code}</div>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + ' ' + s.here}><b>{p.name}</b>IN THE ROOM</div>)}
          {room.seats.length < 1 && <div className={s.seat}><b>SEAT 1</b>WAITING…</div>}
          {room.seats.length < 2 && <div className={s.seat}><b>SEAT 2</b>WAITING…</div>}
        </div>
        {room.tvInvite
          ? <><div className={s.qrBg}><Qr text={location.origin + '/duo#room=' + code + '&invite=' + room.tvInvite} size={qsize} /></div><p className={s.sub}>{room.openJoin ? 'Both players: scan, or type the code on your phones at ' + location.host + '/duo' : 'Player 2: scan to take the second seat'}</p></>
          : <p className={s.sub}>{room.openJoin ? 'Both players: type the code on your phones at ' + location.host + '/duo' : 'Player 2 joins from the invite on Player 1&apos;s phone'}</p>}
      </>}

      {phase === 'mode' && <>
        <p className={s.tag}>THE HOST IS CHOOSING</p>
        <h1 className={s.huge}>Taste Duel, Discovery Duos, Star Pairs, or Star Match?</h1>
        <p className={s.sub}>Watch this space.</p>
      </>}

      {phase === 'genres' && <>
        <p className={s.tag}>{room.mode === 'duel' ? 'TASTE DUEL · MOODS' : 'DISCOVERY DUOS · SHELVES'}</p>
        <h1 className={s.huge}>{room.mode === 'duel' ? 'Both picking a mood' : 'Both picking genres'}</h1>
        <div className={s.seats}>{room.seats.map((p, i) => <div key={i} className={s.seat + (room.genreLocked.includes(i) ? ' ' + s.here : '')}><b>{p.name}</b>{room.genreLocked.includes(i) ? 'LOCKED ✓' : 'choosing…'}</div>)}</div>
      </>}

      {phase === 'swipe' && <>
        <p className={s.tag}>{room.mood || 'THE SHELF'} · SECRET CALLS</p>
        <h1 className={s.huge}>{room.mode === 'duel' ? 'Fourteen cards. Keep, pass, or seen.' : 'Twelve deep cuts. Keep up to five.'}</h1>
        <div className={s.bars}>
          {room.seats.map((p, i) => <div key={i} className={s.barRow}><span>{p.name}</span><div className={s.bar}><i style={{ width: (room.progress[i] / Math.max(1, room.shelf.length) * 100) + '%' }} /></div><span>{room.progress[i]}/{room.shelf.length}</span></div>)}
        </div>
        <p className={s.sub}>Calls stay secret until both shelves are in. The TV keeps them that way.</p>
      </>}

      {phase === 'reveal' && <>
        <p className={s.tag}>THE TELEPATHY REPORT</p>
        <div className={s.syncNum}>{Math.round((room.sync / maxSync) * 100)}%</div>
        <p className={s.say}>“{room.line}”</p>
        <div className={s.grid4}>
          {room.finalists.map((id) => { const m = film(id); if (!m) return null; return <div key={id} className={s.mini}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(m)} alt={m.t} draggable={false} />
            <b>{m.t}</b><span>{tag(id)}</span>
          </div>; })}
        </div>
        <p className={s.sub}>{room.revealAck.length}/2 ready for the knockout</p>
      </>}

      {['bout', 'tie', 'result'].includes(phase) && pair.length === 2 && <>
        <p className={s.tag}>{room.stage === 0 ? 'SEMI-FINAL' : 'THE FINAL'} · BOUT {room.history.length + (phase === 'result' ? 0 : 1)}/3</p>
        <div className={s.vs}>
          <div className={s.film}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(pair[0], 'w500')} alt={pair[0].t} draggable={false} />
            <b>{pair[0].t}</b><span>{pair[0].y} · TMDB {pair[0].r.toFixed(1)}</span>
            {phase === 'result' && room.history.at(-1)?.winner === pair[0].id && <span className={s.tag}>ADVANCES ✓</span>}
          </div>
          <div className={s.vsMark}>VS</div>
          <div className={s.film}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(pair[1], 'w500')} alt={pair[1].t} draggable={false} />
            <b>{pair[1].t}</b><span>{pair[1].y} · TMDB {pair[1].r.toFixed(1)}</span>
            {phase === 'result' && room.history.at(-1)?.winner === pair[1].id && <span className={s.tag}>ADVANCES ✓</span>}
          </div>
        </div>
        <div className={s.tugWrap}>
          <div className={s.tugNums}><b>{tugs[0]} pull</b><b>{tugs[1]} pull</b></div>
          <div className={s.tug}><i style={{ left: (50 + (tugs[1] - tugs[0]) / Math.max(1, tugs[0] + tugs[1]) * 43) + '%' }} /></div>
        </div>
        <p className={s.say}>{phase === 'tie' ? 'A dead heat. Agree on one, or both trust the wheel.' : phase === 'result' ? 'Spent tokens stay spent.' : room.seats.map((p) => p.name + ': ' + (p.locked ? 'locked' : 'pulling')).join(' · ')}</p>
      </>}

      {(room.mode === 'duel' || room.mode === 'discovery') && ['confirm', 'done'].includes(phase) && champion && <>
        <p className={s.tag}>{phase === 'done' ? 'TONIGHT YOU WATCH' : 'DUO CHAMPION · BOTH CONFIRM ON PHONES'}</p>
        <div className={s.film}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champion, 'w500')} alt={champion.t} draggable={false} />
          <b style={{ fontSize: '4.4vmin' }}>{champion.t}</b><span>{champion.y} · TMDB {champion.r.toFixed(1)}</span>
        </div>
        {phase === 'confirm' && <p className={s.sub}>{room.confirmed.length}/2 confirmed</p>}
      </>}


      {phase === 'actors' && room.pairs && <>
        <p className={s.tag}>STAR PAIRS · JEMMA'S GAME</p>
        <h1 className={s.huge}>Cast the con</h1>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.pairs!.actors[i] ? ' ' + s.here : '')}><b>{p.name}</b>{room.pairs!.actors[i] ? '🎭 ' + room.pairs!.actors[i]!.name : 'choosing an actor…'}</div>)}
        </div>
        <p className={s.sub}>Deck floor: RT {room.pairs.floor}+ · five real films each, scores hidden · one coin flip picks critics or audience ★</p>
      </>}

      {phase === 'deal' && room.pairs && pairFilm && <>
        <p className={s.tag}>CARD {room.pairs.turnIdx + 1}/{room.pairs.cards.length} · {room.pairs.pendingPass ? 'PASSED - SNIPE OR BURN' : room.seats[room.pairs.active].name.toUpperCase() + ' HOLDS THE CARD'}</p>
        <div className={s.film}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(pairFilm, 'w500')} alt={pairFilm.t} draggable={false} />
          <b style={{ fontSize: '4.4vmin' }}>{pairFilm.t}</b><span>{pairFilm.y} · {pairFilm.g.slice(0, 3).join(' / ')}</span>
        </div>
        <div className={s.seats}>
          {room.pairs.actors.map((a, i) => <div key={i} className={s.seat}><b>{a?.name || 'Actor ' + (i + 1)}</b>{room.pairs!.piles.filter((x) => x === i).length} cards claimed</div>)}
        </div>
        <p className={s.sub}>Cast and scores hidden until the reveal. Phones make the calls.</p>
      </>}

      {phase === 'wager' && room.pairs && <>
        <p className={s.tag}>THE END WAGER</p>
        <h1 className={s.huge}>Stake your points. Secretly.</h1>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.pairs!.wagersLocked?.[i] ? ' ' + s.here : '')}><b>{p.name}</b>{room.pairs!.wagersLocked?.[i] ? 'WAGERED ✓' : 'thinking…'}</div>)}
        </div>
        <p className={s.sub}>0 to 10 on your own pile being stronger. Then the truth.</p>
      </>}

      {phase === 'pReveal' && room.pairs?.totals && <>
        <p className={s.tag}>THE TRUTH · {room.pairs.flip === 'audience' ? 'AUDIENCE ★ COUNTS' : 'CRITICS ★ COUNT'}</p>
        <div className={s.syncNumSm}>{room.pairs.totals[0]} – {room.pairs.totals[1]}</div>
        <div className={s.grid5}>
          {room.pairs.cards.map((c, i) => { const m = film(c.id); if (!m) return null; const sc = pairsScores(m); const pile = room.pairs!.piles[i]; const bluff = pile != null && pile >= 0 && pile !== c.actor; return <div key={i} className={s.mini}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(m)} alt={m.t} draggable={false} />
            <b>{m.t}</b>
            <span>{room.pairs!.actors[c.actor]?.name}{pile == null || pile < 0 ? ' · discarded' : bluff ? ' · BLUFFED' : ' ✓'}</span>
            <span>{sc.critics != null ? (m.rt != null ? 'RT ' : 'TMDB ') + sc.critics : 'RT —'}{room.pairs!.flip === 'critics' ? ' ★' : ''} · {sc.audience != null ? (m.imdb != null ? 'AUD ' : 'TMDB ') + sc.audience : 'AUD —'}{room.pairs!.flip === 'audience' ? ' ★' : ''}</span>
          </div>; })}
        </div>
      </>}

      {phase === 'pPick' && room.pairs?.points && <>
        <p className={s.tag}>STAR PAIRS · THE WINNER PICKS TONIGHT'S FILM</p>
        <h1 className={s.huge}>{(() => { const pts = room.pairs.points!, tot = room.pairs.totals || [0, 0]; const w = pts[0] !== pts[1] ? (pts[0] > pts[1] ? 0 : 1) : tot[0] !== tot[1] ? (tot[0] > tot[1] ? 0 : 1) : 0; return room.seats[w].name; })()} raids their pile</h1>
        <p className={s.sub}>One of their claimed films becomes tonight's film. Both phones then confirm it.</p>
      </>}

      {phase === 'pConfirm' && champion && <>
        <p className={s.tag}>TONIGHT'S FILM · BOTH CONFIRM ON PHONES</p>
        <div className={s.film}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champion, 'w500')} alt={champion.t} draggable={false} />
          <b style={{ fontSize: '4.4vmin' }}>{champion.t}</b><span>{champion.y} · TMDB {champion.r.toFixed(1)}</span>
        </div>
        <p className={s.sub}>{room.confirmed.length}/2 confirmed</p>
      </>}

      {phase === 'mCast' && room.match && <>
        <p className={s.tag}>STAR MATCH · JEMMA&apos;S MEMORY GAME</p>
        <h1 className={s.huge}>Cast your stars</h1>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.match!.actors[i] ? ' ' + s.here : '')}><b>{p.name}</b>{room.match!.actors[i] ? '🎭 ' + room.match!.actors[i]!.name : 'choosing an actor…'}</div>)}
        </div>
        <p className={s.sub}>Six films per actor: their best work plus one hidden gem, scored 60+, no sci-fi or animation. Twelve cards, face-down. Phones flip them.</p>
      </>}

      {['mFlip', 'mClaim', 'mBid'].includes(phase) && room.match && (() => {
        const m = room.match;
        const cnt = [0, 0];
        m.cards.forEach((c, i) => { const st = m.status[i]; if ((st === 0 || st === 1) && c.id) cnt[st]++; });
        const round = Math.floor(m.turnsTaken / 2) + 1;
        const safeActive = m.safeIdx != null && m.safeRound === round ? m.safeIdx : null;
        const up = m.faceUp != null && m.cards[m.faceUp]?.id ? film(m.cards[m.faceUp].id) : null;
        return <>
          <p className={s.tag}>STAR MATCH · ROUND {round} · {phase === 'mClaim' ? 'CHALLENGE?' : phase === 'mBid' ? 'SECRET BIDS ON PHONES' : room.seats[m.turn].name.toUpperCase() + ' FLIPS'}</p>
          {up && <div className={s.film}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(up, 'w500')} alt={up.t} draggable={false} style={{ height: '26vmin' }} />
            <b style={{ fontSize: '3.4vmin' }}>{up.t}</b>
            <span>{up.y} · {m.faceUpMiss ? 'not theirs — back down it goes' : m.status[m.faceUp!] === 0 || m.status[m.faceUp!] === 1 ? 'banked by ' + room.seats[m.status[m.faceUp!]].name : phase === 'mBid' ? 'contested — bids on phones' : 'claimed — challenge?'}</span>
          </div>}
          <div className={s.mGrid}>
            {m.cards.map((c, i) => {
              const st = m.status[i];
              if (st === 0 || st === 1) { const f = film(c.id); return <div key={i} className={s.mCard}>{f ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster(f)} alt={f.t} draggable={false} /> : null}<span className={s.mSc}>{room.seats[st].name}</span></div>; }
              if (st === -2) return <div key={i} className={s.mCard + ' ' + s.mBurn}>✕</div>;
              return <div key={i} className={s.mCard + (safeActive === i ? ' ' + s.mLock : '')}>{safeActive === i ? '🔒' : '★'}</div>;
            })}
          </div>
          <div className={s.seats}>
            {room.seats.map((p, i) => <div key={i} className={s.seat + (m.turn === i && phase === 'mFlip' ? ' ' + s.here : '')}><b>{p.name}</b>{cnt[i]} card{cnt[i] === 1 ? '' : 's'} · {m.chips[i]} chips · 🎭 {m.actors[i]?.name || '—'}</div>)}
          </div>
          <p className={s.sub}>{m.lastEvent || 'Phones flip the cards. Claim your own actor’s films; remember where theirs sleep.'} Scores stay on phones.</p>
        </>;
      })()}

      {phase === 'mPitch' && room.match && <>
        <p className={s.tag}>STAR MATCH · THE FINAL PITCH</p>
        <h1 className={s.huge}>One line each. Bluffing allowed.</h1>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.match!.pitches[i] != null ? ' ' + s.here : '')}><b>{p.name}</b>{room.match!.pitches[i] != null ? 'PITCHED ✓' : 'typing…'}</div>)}
        </div>
        <p className={s.sub}>Why should it be their film? Secret until both are in. Then the totals, and the winner picks.</p>
      </>}

      {phase === 'mReveal' && room.match?.totals && <>
        <p className={s.tag}>STAR MATCH · FINAL TOTALS</p>
        <div className={s.syncNumSm}>{room.match.totals[0]} – {room.match.totals[1]}</div>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.match!.winnerSeat === i ? ' ' + s.here : '')}><b>{p.name}</b>{room.match!.winnerSeat === i ? 'WINS · picks tonight’s film' : room.match!.totals![i] + ' points'}</div>)}
        </div>
        {room.match.pitches.map((p, i) => p ? <p key={i} className={s.say}>“{p}” — {room.seats[i].name}</p> : null)}
      </>}

      {phase === 'mConfirm' && champion && <>
        <p className={s.tag}>TONIGHT&apos;S FILM · BOTH CONFIRM ON PHONES</p>
        <div className={s.film}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champion, 'w500')} alt={champion.t} draggable={false} />
          <b style={{ fontSize: '4.4vmin' }}>{champion.t}</b><span>{champion.y} · TMDB {champion.r.toFixed(1)}</span>
        </div>
        <p className={s.sub}>{room.confirmed.length}/2 confirmed</p>
      </>}

      {phase === 'done' && room.mode === 'match' && room.match?.totals && <>
        <p className={s.tag}>STAR MATCH · FINAL TOTALS</p>
        <div className={s.syncNum}>{room.match.totals[0]} – {room.match.totals[1]}</div>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.match!.winnerSeat === i ? ' ' + s.here : '')}><b>{p.name}</b>{room.match!.totals![i]} points{room.match!.winnerSeat === i ? ' · won the night' : ''}</div>)}
        </div>
        <p className={s.say}>“{room.line}”</p>
      </>}

      {phase === 'done' && room.mode === 'pairs' && room.pairs?.points && <>
        <p className={s.tag}>STAR PAIRS · FINAL POINTS</p>
        <div className={s.syncNum}>{room.pairs.points[0]} – {room.pairs.points[1]}</div>
        <div className={s.seats}>
          {room.seats.map((p, i) => <div key={i} className={s.seat + (room.pairs!.points![i] === Math.max(...room.pairs!.points!) ? ' ' + s.here : '')}><b>{p.name}</b>{room.pairs!.points![i]} points</div>)}
        </div>
        <p className={s.say}>“{room.line}”</p>
      </>}
    </section>
    {foot()}
  </main>;
}
