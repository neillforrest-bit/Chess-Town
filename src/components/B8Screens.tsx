'use client';
import { useState } from 'react';
import { BY_ID, type Intent, type PID, type State } from '@/lib/game';
import { R, bars, type M8 } from '@/lib/b8';
import { Poster, secs, buzz } from './shared';

type P = { s: State; pid: PID; send: (i: Intent) => void; now: number };
const pitchOf = (s: State, id: number) => (s.draft.pitches[id] || BY_ID[id].o || '').replace(/\s+/g, ' ');
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

/** PHASE 2: The Hit List. 15 seconds, one grid, one Red Strike, one Gold Shield each. */
export function HitScreen({ s, pid, send, now }: P) {
  const h = s.hit; const [sel, setSel] = useState<number | null>(null);
  if (!h) return null;
  const me = h.weap[pid]; const left = secs(h.endsAt, now); const res = h.res;
  const mineOrBoth = (id: number) => h.owner[id] === pid || h.owner[id] === 'AB';
  const tag = (id: number) => (h.owner[id] === 'O' ? 'ORSON' : h.owner[id] === 'AB' ? 'BOTH' : s.players[h.owner[id] as PID].name.slice(0, 6).toUpperCase());
  const cols = h.grid.length > 12 ? 6 : h.grid.length > 9 ? 4 : 3;
  return <div className="cs8-hit">
    <div className="cs8-hit-top"><span className="cs-orson">THE HIT LIST</span><b className={'cs8-clock' + (left <= 5 && !res ? ' is-hot' : '')}>{res ? 'JUDGEMENT' : `${left}s`}</b></div>
    <div className="cs8-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {h.grid.map((id) => {
        const dead = res?.dead.includes(id); const sh = res ? res.shield[id] : undefined; const mineStrike = me.veto === id; const mineShield = me.shields.includes(id);
        return <button key={id} disabled={!!res || me.done} className={'cs8-tile' + (sel === id ? ' is-sel' : '') + (dead ? ' is-dead' : '') + (sh ? ' is-shield' : '') + (mineStrike ? ' is-strike' : '') + (mineShield && !res ? ' is-shield' : '')} onClick={() => { buzz(8); setSel(sel === id ? null : id); }}>
          <Poster id={id} /><i className={'cs8-own cs8-own--' + h.owner[id]}>{tag(id)}</i>
          {dead && <em className="cs8-x">✕</em>}{(sh || (mineShield && !res)) && <em className="cs8-gold">◆</em>}{mineStrike && !res && <em className="cs8-x">⌖</em>}
        </button>;
      })}
    </div>
    {res ? <p className="cs8-say">{res.mocked !== null ? `You BOTH wanted ${BY_ID[res.mocked].t} dead. Shared hatred. How touching.` : res.dead.length ? `${res.dead.map((d) => BY_ID[d].t).join(' and ')} ${res.dead.length > 1 ? 'are' : 'is'} dead.` : 'Nobody died. Cowards.'}{res.blocked.length ? ' A Gold Shield turned a Veto into confetti.' : ''}</p>
      : <>
        <p className="cs8-sel">{sel === null ? 'Tap a title, then strike it or shield it.' : <><b>{BY_ID[sel].t}</b> · {BY_ID[sel].y} · {BY_ID[sel].r.toFixed(1)}{BY_ID[sel].rt != null ? ` · RT ${BY_ID[sel].rt}%` : ''}</>}</p>
        <div className="cs-row">
          <button className="cs-btn cs-btn--no" disabled={me.done || sel === null || mineOrBoth(sel as number)} onClick={() => { send({ t: 'hit', pid, veto: me.veto === sel ? null : sel }); }}>{me.veto !== null ? (me.veto === sel ? 'UNDO STRIKE' : 'MOVE STRIKE') : 'RED STRIKE'}</button>
          <button className="cs-btn cs-btn--gold" disabled={me.done || sel === null || !mineOrBoth(sel as number)} onClick={() => { send({ t: 'hit', pid, shield: sel }); }}>GOLD SHIELD</button>
        </div>
        <button className="cs-btn" disabled={me.done} onClick={() => send({ t: 'hit', pid, done: true })}>{me.done ? 'LOCKED. WAITING...' : 'LOCK IN'}</button>
      </>}
  </div>;
}

export const RNDN = ['ROUND OF 16', 'QUARTERFINAL', 'SEMIFINAL', 'THE FINAL'];
const OFF = [0, 8, 12, 14];
/** Full 16-seed tree: one column per round, strikethrough on the eliminated, green on the progressed. */
export function BracketMap({ s, onClose, tv }: { s: State; onClose?: () => void; tv?: boolean }) {
  const b = s.b8; if (!b) return null;
  const cell = (id: number | null, m: M8) => id === null ? <span className="cs8-tc is-tbd">TBD</span> : <span className={'cs8-tc' + (m.winner === id ? ' is-win' : m.winner !== null ? ' is-lose' : '')}><i>{b.seed[id]}</i> {clip(BY_ID[id].t, tv ? 22 : 12)}{b.shield[id] ? ' ◆' : ''}</span>;
  const cur = b.show ? (b.show.kind === 'round' ? b.cur + 1 : -1) : b.cur;
  return <div className={'cs8-tree' + (tv ? ' is-tv' : '')} onClick={onClose}>
    {[1, 2, 3, 4].map((r) => <div key={r} className="cs8-tcol"><b>{['R16', 'QF', 'SF', 'FINAL'][r - 1]}</b>
      {b.matches.filter((m) => m.round === r).map((m) => <div key={m.id} className={'cs8-tm' + (cur === m.slot ? ' is-cur' : '')}>{cell(m.a, m)}{cell(m.b, m)}</div>)}</div>)}
  </div>;
}

/** Full-screen bracket page: seed rankings first, then the tree after every round. */
export function BracketPage({ s, now, tv }: { s: State; now: number; tv?: boolean }) {
  const b = s.b8; const sh = b?.show; if (!b || !sh) return null;
  const owner = s.hit?.owner || {};
  const tag = (id: number) => (owner[id] === 'O' ? 'ORSON' : owner[id] === 'AB' ? 'BOTH' : owner[id] ? s.players[owner[id] as PID].name.slice(0, 5).toUpperCase() : '');
  const ranked = Object.keys(b.seed).map(Number).sort((x, y) => b.seed[x] - b.seed[y]);
  const left = secs(sh.until, now);
  const rankView = sh.kind === 'seed' && sh.until - now > 5000;
  const done = sh.kind === 'round' ? sh.round : 0;
  const nxt = sh.kind === 'round' ? b.matches[b.cur + 1] : null; const endRound = !!nxt && nxt.round !== done; const lm = b.matches[b.cur];
  const ups = b.upsets.filter((u) => b.matches.some((m) => m.round === done && m.winner === u.winner && (m.a === u.loser || m.b === u.loser)));
  const title = sh.kind === 'seed' ? (rankView ? 'THE SEEDS ARE IN' : 'THE BRACKET') : endRound ? `${RNDN[done - 1]} COMPLETE` : `UP NEXT · ${RNDN[(nxt as M8).round - 1]}`;
  const sub = sh.kind === 'seed' ? (rankView ? 'Ranked by RT, TMDB and how fast you grabbed it.' : 'Sixteen enter. One survives.') : !endRound && lm.winner !== null ? `${clip(BY_ID[lm.winner].t, 26)} advances. Next: ${clip(BY_ID[(nxt as M8).a as number]?.t || '?', 14)} vs ${clip(BY_ID[(nxt as M8).b as number]?.t || '?', 14)}` : ups.length ? `${ups.length} upset${ups.length > 1 ? 's' : ''}: ${ups.slice(0, 2).map((u) => BY_ID[u.winner].t).join(', ')}` : 'Chalk. Boring. Next.';
  return <div className={'cs8-page' + (tv ? ' is-tv' : '') + (endRound ? ' cs8-flash' : '')}>
    <div className="cs8-top"><span className="cs-orson">{title}</span><b className="cs8-clock">{left}s</b></div>
    <p className="cs8-sub">{sub}</p>
    {rankView ? <div className="cs8-rank">{ranked.map((id) => <div key={id} className="cs8-rk"><i>{b.seed[id]}</i><b>{clip(BY_ID[id].t, tv ? 30 : 17)}</b><em>{tag(id)}</em></div>)}</div> : <BracketMap s={s} tv={tv} />}
  </div>;
}

/** PHASE 3: the March Madness bracket, one matchup at a time, with the compact map one tap away. */
export function BracketScreen({ s, pid, send, now }: P) {
  const b = s.b8; const [pick, setPick] = useState<number | null>(null); const [tok, setTok] = useState(5); const [map, setMap] = useState(false);
  if (!b) return null;
  if (b.show) return <BracketPage s={s} now={now} />;
  const m = b.matches[b.cur]; const other: PID = pid === 'A' ? 'B' : 'A';
  const a = m.a as number, c = m.b as number; const br = bars(b, m); 

  const upsetNow = m.status === 'RESOLVED' && m.winner !== null && b.upsets.some((u) => u.winner === m.winner && u.gap >= R.UPSET_GAP && (u.loser === m.a || u.loser === m.b));
  return <div className={'cs8-br' + (m.status === 'RESOLVED' ? (upsetNow ? ' cs8-flash-up' : ' cs8-flash') : '') + (m.round === 4 ? ' cs8-final' : '')}>
    <div className="cs8-top"><span className="cs-orson">{RNDN[m.round - 1]}{m.round < 4 ? ` · ${m.slot - OFF[m.round - 1] + 1}/${[8, 4, 2][m.round - 1]}` : ''}{m.round === 1 && m.endsAt && m.status === 'VOTING_ACTIVE' ? ` · ${secs(m.endsAt, now)}s` : ''}</span><button className="cs8-mapbtn" onClick={() => setMap(true)}>BRACKET</button></div>
    {map && <div className="cs-sheet" onClick={() => setMap(false)}><div className="cs-sheet-in"><BracketMap s={s} /></div></div>}
    {m.status === 'LOCKED_FOR_VETO' && <div className="cs8-glitch"><b>ORSON IS RUINING YOUR BRACKET...</b></div>}
    {m.trivia ? <Trivia s={s} pid={pid} send={send} now={now} m={m} /> : <>
      <div className="cs8-vs">{[a, c].map((id, i) => { const mine = m.wg[pid]?.id === id; const upset = (i === 0 ? m.seedA > m.seedB : m.seedB > m.seedA) && Math.abs(m.seedA - m.seedB) >= R.UPSET_GAP;
        return <button key={id} className={'cs8-card' + (pick === id || mine ? ' is-pick' : '') + (m.winner === id ? ' is-win' : m.winner !== null ? ' is-lose' : '')} disabled={m.status !== 'VOTING_ACTIVE' || !!m.wg[pid]} onClick={() => { buzz(8); if (m.round === 1) send({ t: 'w8', pid, id, tok: 0 }); else setPick(id); }}>
          <i className="cs8-seed">#{b.seed[id]}</i>{b.shield[id] && <i className="cs8-sb">◆ +20%</i>}{upset && <i className="cs8-up">x{R.UPSET_MULT}</i>}
          <Poster id={id} /><b>{clip(BY_ID[id].t, 20)}</b>
          <span>{BY_ID[id].y} · TMDB {BY_ID[id].r.toFixed(1)}{BY_ID[id].rt != null ? ` · RT ${BY_ID[id].rt}%` : ''}</span>
          <p>{clip(pitchOf(s, id), 96)}</p></button>; })}</div>
      <div className="cs8-tug"><i style={{ width: `${Math.round((br.a / Math.max(1, br.a + br.b)) * 100) || 50}%` }} /><span>{Math.round(br.a)}</span><span>{Math.round(br.b)}</span></div>
      {m.status === 'RESOLVED' ? <p className="cs8-say">{BY_ID[m.winner as number].t} advances. {m.via}.{b.upsets.some((u) => u.winner === m.winner && u.loser === (m.winner === a ? c : a) && u.gap >= R.UPSET_GAP) ? ' UPSET.' : ''}</p>
        : m.wg[pid] ? <p className="cs8-say">Locked. Waiting for {s.players[other].name}.</p>
        : <div className="cs8-act">
          {m.round === 1 ? <em className="cs8-free">Blitz. Tap the one you want, 8 seconds.</em> : <div className="cs8-step"><button onClick={() => setTok(Math.max(1, tok - 5))}>−</button><b>{Math.min(tok, b.purse[pid])}</b><button onClick={() => setTok(Math.min(b.purse[pid], tok + 5))}>+</button><em>purse {b.purse[pid]}</em></div>}
          {m.round > 1 && <button className="cs-btn cs-btn--gold" disabled={pick === null || (pick !== m.a && pick !== m.b) || (m.round > 1 && b.purse[pid] < 1)} onClick={() => send({ t: 'w8', pid, id: pick as number, tok })}>LOCK WAGER</button>}
          {m.round > 1 && <button className="cs8-bust" disabled={!b.buster[pid] || (pick !== null && !!b.shield[pick])} onClick={() => { if (pick !== null) send({ t: 'bust', pid, id: pick }); }} title="Select a film first">{b.buster[pid] ? 'BRACKET BUSTER' : 'BUSTER USED'}</button>}
        </div>}
      {m.bust && <p className="cs8-roast">{m.bust}</p>}
      <p className="cs8-purse">{s.players.A.name} {b.purse.A} · {s.players.B.name} {b.purse.B} tokens</p></>}
  </div>;
}

function Trivia({ s, pid, send, now, m }: P & { m: M8 }) {
  const t = m.trivia; if (!t) return null; const left = secs(t.endsAt, now); const out = t.locked[pid];
  return <div className="cs8-triv"><div className="cs-orson">SUDDEN DEATH · {left}s</div><p className="cs-say">{t.q}</p>
    <div className="cs8-opts">{t.opts.map((o, i) => <button key={o} className="cs-btn" disabled={!!out || m.status === 'RESOLVED'} onClick={() => { buzz(12); send({ t: 'ttap', pid, i }); }}>{o}</button>)}</div>
    {out && m.status !== 'RESOLVED' && <p className="cs-small">Wrong. You are locked out.</p>}
  </div>;
}

/** Accept or reroll: shown before streaming links. */
export function RerollScreen({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const r = s.reroll; const w = BY_ID[s.winner as number]; const mine = r.votes[pid];
  return <div className="cs8-rr"><div className="cs-orson">THE GAMBLE</div><Poster id={w.id} big cls="cs-poster--win" /><h2>{w.t}</h2>
    <p className="cs-say">Fine choice. OR... throw it away, let me pick a complete wildcard, and I&apos;ll start you both with a Silver Bullet next game.</p>
    {mine === undefined ? <div className="cs-row"><button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'rr', pid, yes: false })}>KEEP IT</button><button className="cs-btn cs-btn--no" onClick={() => send({ t: 'rr', pid, yes: true })}>REROLL</button></div> : <p className="cs-small">Locked. Waiting for {s.players[pid === 'A' ? 'B' : 'A'].name}. Both must agree to reroll.</p>}
  </div>;
}
