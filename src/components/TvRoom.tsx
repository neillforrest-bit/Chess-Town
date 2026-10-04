'use client';
import { useRoom } from '@/lib/useRoom';
import { BY_ID, ROUND_LABEL, DRAFT_SIZE } from '@/lib/game';
import { Poster, secs, useNow, Meter, BUILD } from './shared';

export default function TvRoom({ code }: { code: string }) {
  const { state: s, skew, online } = useRoom(code, null, 'TV');
  const now = useNow(skew);
  if (!s) return <main className="cs-tv"><div className="cs-tv-big">CINE<b>SYNC</b></div><p className="cs-tv-sub">{online ? `Looking for room ${code}...` : 'Connecting...'}</p></main>;
  const mt = s.phase === 'bracket' ? s.br.matches[s.br.cur] : null;
  const names = `${s.players.A.name} & ${s.players.B.name}`;
  return <main className="cs-tv">
    <header className="cs-tv-head"><span>CINE<b>SYNC</b></span><span>{names}</span><span>ROOM {code}</span></header>
    <section className="cs-tv-body">
      {s.phase === 'lobby' && <div className="cs-tv-center"><div className="cs-tv-code">{code}</div><p className="cs-tv-sub">Open CineSync on your phones. {s.players.A.joined ? s.players.A.name + ' is in. ' : ''}{s.players.B.joined ? s.players.B.name + ' is in.' : 'Waiting for player two.'}</p></div>}
      {s.phase === 'vibe' && <div className="cs-tv-center"><p className="cs-tv-sub">PHASE 1 · VIBE CHECK</p>{s.vibe.score === null ? <p className="cs-tv-say">Orson is interrogating both of you. In private. {s.vibe.ans.A.filter((x) => x !== null).length + s.vibe.ans.B.filter((x) => x !== null).length}/8 answers in.</p> : <><div className="cs-tv-code">{Math.round(s.vibe.score * 100)}%</div><p className="cs-tv-say">{s.vibe.passed ? 'Aligned. The draft begins.' : 'Not aligned. Round two of questions.'}</p></>}</div>}
      {s.phase === 'draft' && <div className="cs-tv-center"><p className="cs-tv-sub">PHASE 2 · THE BLIND DRAFT</p><p className="cs-tv-say">{s.draft.loading ? 'Orson is writing pitches...' : 'Both of you are swiping in secret.'}</p><div className="cs-tv-bars">{(['A', 'B'] as const).map((p) => <div key={p}><b>{s.players[p].name}</b><div className="cs-bar"><i style={{ width: `${(s.draft.picks[p].length / DRAFT_SIZE) * 100}%` }} /></div><span>{s.draft.picks[p].length}/{DRAFT_SIZE}</span></div>)}</div></div>}
      {s.phase === 'bracket' && mt && <div className="cs-tv-match">
        <p className="cs-tv-sub">{ROUND_LABEL[s.br.round]} · match {s.br.cur + 1}/{s.br.matches.length}</p>
        {s.br.round === 2 && s.br.golden && <p className="cs-tv-gold">GOLDEN BYE: {BY_ID[s.br.golden].t}</p>}
        <div className="cs-tv-vs">{[mt.a, mt.b].map((id) => <div key={id} className={'cs-tv-film' + (mt.winner === id ? ' is-win' : '') + (mt.winner !== null && mt.winner !== id ? ' is-out' : '')}>
          <Poster id={id} big /><b>{BY_ID[id].t}</b><span>{BY_ID[id].y} · {BY_ID[id].r.toFixed(1)}</span>
          {mt.tap && <div className="cs-tv-tap"><i style={{ width: `${Math.min(100, ((mt.votes.A === id ? mt.tap.A : mt.tap.B) / 40) * 100)}%` }} /></div>}
        </div>)}</div>
        <p className="cs-tv-say">{mt.winner !== null ? `${BY_ID[mt.winner].t} advances (${mt.via})` : mt.tap ? `TAP BATTLE ${secs(mt.tap.until, now)}s` : `${mt.votes.A !== undefined ? s.players.A.name + ' voted. ' : ''}${mt.votes.B !== undefined ? s.players.B.name + ' voted.' : ''}` || 'Vote on your phones.'}</p>
        {s.log[0] && <p className="cs-tv-log">{s.log[0]}</p>}
      </div>}
      {s.phase === 'final' && <div className="cs-tv-match"><p className="cs-tv-sub">THE FINAL · PITCH-OFF {s.fin.pitchEnds ? secs(s.fin.pitchEnds, now) + 's' : ''}</p><div className="cs-tv-vs">{[s.fin.a, s.fin.b].map((id) => <div key={id} className="cs-tv-film"><Poster id={id} big /><b>{BY_ID[id].t}</b></div>)}</div><p className="cs-tv-say">{s.fin.judging ? 'Orson is deliberating...' : s.fin.pitchEnds ? 'Typing furiously on both phones.' : 'Each of you choose a film to defend.'}</p></div>}
      {s.phase === 'done' && s.winner !== null && <div className="cs-tv-win"><p className="cs-tv-sub">TONIGHT YOU WATCH</p><Poster id={s.winner} big cls="cs-poster--win" /><h1>{BY_ID[s.winner].t}</h1>{s.fin.verdict?.reason && <p className="cs-tv-say">{s.fin.verdict.reason}</p>}</div>}
    </section>
    <footer className="cs-tv-foot"><Meter cost={s.cost} /><i>build {BUILD}</i></footer>
  </main>;
}
