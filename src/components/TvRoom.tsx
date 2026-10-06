'use client';
import { useRoom } from '@/lib/useRoom';
import { BY_ID, ROUND_LABEL, DRAFT_SIZE, type State } from '@/lib/game';
import { useState } from 'react';
import { BracketMap } from './B8Screens';
import { Takeover, Poster, OrsonBar, secs, useNow, Meter, BUILD, ledgerLine, receipts } from './shared';

// Ringside Orson: boxing-announcer commentary derived purely from state. The TV stages; phones play.
function ringside(s: State, now: number): string {
  const mt = s.br.matches[s.br.cur]; const A = s.players.A.name, B = s.players.B.name;
  if (s.phase === 'bracket' && s.tempt.stage === 'offer') return `Ladies and gentlemen... ${s.players[s.tempt.to].name} is being offered something in the corridor. Nobody look.`;
  if (s.phase === 'bracket' && mt) {
    const fa = BY_ID[mt.a], fb = BY_ID[mt.b];
    if (mt.winner !== null) { const w = BY_ID[mt.winner]; const l = mt.winner === mt.a ? fb : fa; return `${w.t} takes it! ${l.t} is down. ${mt.nextAt ? `Next bout in ${secs(mt.nextAt, now)}...` : ''}`; }
    if (mt.winner === null && mt.c !== null) return `Three films, two players, one Orson. ${[mt.wg.A, mt.wg.B].filter(Boolean).length}/2 wagers locked. I fancy ${BY_ID[mt.c].t}.`;
    if (mt.tap) return `TAP BATTLE! ${A} and ${B} cannot agree. ${secs(mt.tap.until, now)} seconds. Fingers, please!`;
    if (s.br.round === 3) return `Silver Bullets are loaded. ${fa.t} against ${fb.t}. Someone is about to be shot.`;
    if (mt.votes.A !== undefined || mt.votes.B !== undefined) return `One of them has locked in. The other is sweating.`;
    return `In the red corner, ${fa.t}, rated ${fa.r.toFixed(1)}. In the blue corner, ${fb.t}, rated ${fb.r.toFixed(1)}. Bout ${s.br.cur + 1} of ${s.br.matches.length}.`;
  }
  if (s.phase === 'final') return s.fin.pitchEnds ? `The pitch-off! ${secs(s.fin.pitchEnds, now)} seconds on the clock. Persuade, do not ramble.` : 'The final two. Choose your champion.';
  return '';
}

export default function TvRoom({ code }: { code: string }) {
  const { state: s, skew, online } = useRoom(code, null, 'TV');
  const now = useNow(skew);
  const [tkDone, setTkDone] = useState('');
  if (!s) return <main className="cs-tv"><div className="cs-tv-big">CINE<b>SYNC</b></div><p className="cs-tv-sub">{online ? `Looking for room ${code}...` : 'Connecting...'}</p></main>;
  const mt = s.phase === 'bracket' ? s.br.matches[s.br.cur] : null;
  const names = `${s.players.A.name} & ${s.players.B.name}`;
  const led = ledgerLine(s);
  const r = receipts(s);
  const say = ringside(s, now);
  if (s.phase === 'final' && s.fin.judging) return <Takeover a={s.fin.a} b={s.fin.b} />;
  if (s.phase === 'done' && s.winner !== null && s.fin.verdict?.lines?.length && !s.fin.tie && tkDone !== 'x') return <Takeover a={s.fin.a} b={s.fin.b} lines={s.fin.verdict.lines} winner={s.winner} onDone={() => setTkDone('x')} />;
  return <main className="cs-tv">
    <header className="cs-tv-head"><span>CINE<b>SYNC</b></span><span>{names}</span><span>ROOM {code}</span></header>
    <OrsonBar o={s.orson} tv /><section className="cs-tv-body">
      {s.phase === 'lobby' && <div className="cs-tv-center"><div className="cs-tv-code">{code}</div><p className="cs-tv-sub">Open CineSync on your phones and join. {s.players.A.joined ? s.players.A.name + ' is in. ' : ''}{s.players.B.joined ? s.players.B.name + ' is in.' : ''}</p>{s.mem.last && <p className="cs-tv-log">Last time: {s.mem.last}</p>}{led && <p className="cs-tv-gold">{led}</p>}</div>}
      {s.phase === 'vibe' && <div className="cs-tv-center"><p className="cs-tv-sub">PHASE 1 · THE GATE</p><p className="cs-tv-say">{s.vibe.score === null ? `Orson is interrogating you both, in private. ${s.vibe.ans.A.filter((x) => x !== null).length + s.vibe.ans.B.filter((x) => x !== null).length}/8 answers in.` : s.vibe.passed ? `${Math.round(s.vibe.score * 100)}% aligned. Orson is almost moved.` : `${Math.round(s.vibe.score * 100)}%. A different angle, then.`}</p></div>}
      {s.phase === 'draft' && <div className="cs-tv-center"><p className="cs-tv-sub">PHASE 2 · THE BLIND DRAFT</p><p className="cs-tv-say">{s.draft.loading ? 'Orson is writing the pitches...' : 'Both of you are swiping in secret.'}</p><div className="cs-tv-bars">{(['A', 'B'] as const).map((p) => <div key={p}><span>{s.players[p].name} · {s.draft.picks[p].length}/{DRAFT_SIZE}</span><div className="cs-bar"><i style={{ width: `${(s.draft.picks[p].length / DRAFT_SIZE) * 100}%` }} /></div></div>)}</div></div>}
      {s.phase === 'bracket' && mt && <div className="cs-tv-match">
        <p className="cs-tv-sub">{ROUND_LABEL[s.br.round]} · bout {s.br.cur + 1}/{s.br.matches.length}</p>
        {s.br.round === 2 && s.br.golden && <p className="cs-tv-gold">GOLDEN BYE: {BY_ID[s.br.golden].t}</p>}
        {s.tempt.stage !== 'offer' && <div className="cs-tv-vs" key={mt.id}>{[mt.a, mt.b, mt.c].filter((x): x is number => x !== null).map((id) => <div key={id} className={'cs-tv-film' + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '')}>
          <Poster id={id} big /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}{id === mt.c ? ' · ORSON' : ''}</span>
          {mt.tap && <div className="cs-tv-tap"><i style={{ width: `${Math.min(100, ((mt.votes.A === id ? mt.tap.A : mt.tap.B) / 40) * 100)}%` }} /></div>}
        </div>)}</div>}
        <p className="cs-tv-ring">{say}</p>
        {s.log[0] && <p className="cs-tv-log">{s.log[0]}</p>}
      </div>}
      {s.phase === 'hitlist' && s.hit && <div className="cs-tv-center"><p className="cs-tv-sub">THE HIT LIST · {s.hit.res ? 'JUDGEMENT' : secs(s.hit.endsAt, now) + 's'}</p><div className="cs8-tvgrid">{s.hit.grid.map((id) => <div key={id} className={'cs8-tvt' + (s.hit?.res?.dead.includes(id) ? ' is-dead' : '') + (s.hit?.res?.shield[id] ? ' is-shield' : '')}><Poster id={id} /><span>{BY_ID[id].t}</span></div>)}</div><p className="cs-tv-say">{s.hit.res ? (s.hit.res.mocked !== null ? 'Shared hatred. How touching.' : s.hit.res.dead.length ? s.hit.res.dead.map((d) => BY_ID[d].t).join(' and ') + ' is dead.' : 'Nobody died. Cowards.') : 'One Red Strike and one Gold Shield each. Choose.'}</p></div>}
      {s.phase === 'bracket' && s.b8 && (() => { const b8 = s.b8, m = b8.matches[b8.cur]; return <div className="cs-tv-center"><p className="cs-tv-sub">{m.round === 3 ? 'THE FINAL' : m.round === 2 ? 'SEMIFINAL' : 'QUARTERFINAL'} · {s.players.A.name} {b8.purse.A} vs {s.players.B.name} {b8.purse.B} tokens</p><div className="cs-tv-vs">{[m.a, m.b].map((id) => id !== null && <div key={id} className="cs-tv-film"><Poster id={id} big /><b>#{b8.seed[id]} {BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}{b8.shield[id] ? ' · GOLD SHIELD' : ''}</span></div>)}</div>{m.status === 'LOCKED_FOR_VETO' && <p className="cs-tv-say">ORSON IS RUINING YOUR BRACKET...</p>}{m.trivia && <p className="cs-tv-say">SUDDEN DEATH: {m.trivia.q}</p>}{m.status === 'RESOLVED' && <p className="cs-tv-gold">{BY_ID[m.winner as number].t} advances. {m.via}</p>}<BracketMap s={s} /></div>; })()}
      {s.phase === 'final' && <div className="cs-tv-match"><p className="cs-tv-sub">THE FINAL{s.fin.rematchUsed ? ' · REMATCH, SIDES SWAPPED' : ''}</p><div className="cs-tv-vs">{[s.fin.a, s.fin.b].map((id) => <div key={id} className="cs-tv-film"><Poster id={id} big /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}</span></div>)}</div><p className="cs-tv-ring">{say}</p></div>}
      {s.phase === 'done' && s.b8 && s.reroll.stage === 'ask' && s.winner !== null && <div className="cs-tv-center"><p className="cs-tv-sub">THE GAMBLE</p><Poster id={s.winner} big /><h1>{BY_ID[s.winner].t}</h1><p className="cs-tv-say">Keep it, or reroll for a wildcard and a Silver Bullet next game? Both must agree.</p></div>}
      {s.phase === 'done' && !(s.b8 && s.reroll.stage === 'ask') && s.winner !== null && <div className="cs-tv-win"><div className="cs-spot" /><p className="cs-tv-sub">TONIGHT YOU WATCH</p><Poster id={s.winner} big cls="cs-poster--win" /><h1>{BY_ID[s.winner].t}</h1>{s.fin.verdict?.reason && <p className="cs-tv-say">{s.fin.verdict.reason}</p>}{!s.fin.tie && s.fin.loser && <p className="cs-tv-gold">{s.players[s.fin.loser].name} owes the popcorn. {led || ''}</p>}<p className="cs-tv-log">Drafts overlapped on {r.overlap}/10 · wildcards won {r.wildWins}/{r.wildBouts} · caved {s.players.A.name} {r.cavedA}, {s.players.B.name} {r.cavedB}</p><div className="cs-curtain cs-curtain--l" /><div className="cs-curtain cs-curtain--r" /></div>}
    </section>
    <footer className="cs-tv-foot"><Meter cost={s.cost} /><i>build {BUILD}</i></footer>
  </main>;
}
