'use client';
import { useState } from 'react';
import { BY_ID, TROPE_NAMES, type Intent, type PID, type State } from '@/lib/game';
import { R, bars, previewMatches, type M8 } from '@/lib/b8';
import { Poster, secs, buzz, Scores, OrsonFace } from './shared';

type P = { s: State; pid: PID; send: (i: Intent) => void; now: number };
const pitchOf = (s: State, id: number) => (s.draft.pitches[id] || BY_ID[id].o || '').replace(/\s+/g, ' ');
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

/** PHASE 2: The War Room. Spend hype tokens, pick a Golden Ticket, load a Silver Bullet. */
export function HitScreen({ s, pid, send, now }: P) {
  const h = s.hit; const [tab, setTab] = useState<'mine' | 'bullet'>('mine'); const [sel, setSel] = useState<number | null>(null);
  if (!h) return null;
  const me = h.weap[pid]; const left = secs(h.endsAt, now); const res = h.res; const other: PID = pid === 'A' ? 'B' : 'A';
  const mineOrBoth = (id: number) => h.owner[id] === pid || h.owner[id] === 'AB';
  const mineList = h.grid.filter(mineOrBoth); const theirs = h.grid.filter((id) => h.owner[id] === other);
  const tk = h.tok[pid]; const spent = Object.values(tk).reduce((n, x) => n + x, 0); const budget = h.budget[pid]; const lefty = budget - spent;
  const tag = (id: number) => (h.owner[id] === 'AB' ? 'BOTH' : s.players[h.owner[id] as PID].name.slice(0, 6).toUpperCase());
  const set = (id: number, amt: number) => { buzz(6); send({ t: 'hit', pid, tok: { id, amt } }); };
  const golden = me.shields[0];
  if (res) return <div className="cs8-hit">
    <div className="cs8-hit-top"><span className="cs-orson">THE WAR ROOM</span><b className="cs8-clock">{secs(res.until, now)}s</b></div>
    <div className="cs8-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {h.grid.map((id) => { const dead = res.dead.includes(id); return <div key={id} className={'cs8-tile' + (dead ? ' is-dead' : '')}><Poster id={id} /><i className={'cs8-own cs8-own--' + h.owner[id]}>{tag(id)}</i>{dead && <em className="cs8-x">✕</em>}{!dead && res.shield[id] && <em className="cs8-gold">★</em>}</div>; })}
    </div>
    <p className="cs8-say">{res.dead.length ? `${res.dead.map((d) => BY_ID[d].t).join(' and ')} ${res.dead.length > 1 ? 'are' : 'is'} dead.` : 'Nobody was shot. Cowards.'}{Object.keys(res.shield).length ? ` Golden Tickets: ${Object.keys(res.shield).map((id) => BY_ID[Number(id)].t + (res.dead.includes(Number(id)) ? ' (shot dead)' : '')).join(', ')}.` : ''}</p>
  </div>;
  return <div className="cs8-hit">
    <div className="cs8-hit-top"><span className="cs-orson">THE WAR ROOM</span><b className={'cs8-clock' + (left <= 10 ? ' is-hot' : '')}>{left}s</b></div>
    <div className="cs8-wtabs"><button className={tab === 'mine' ? 'is-on' : ''} onClick={() => setTab('mine')}>MY TITLES · ◈ {lefty} LEFT</button><button className={tab === 'bullet' ? 'is-on' : ''} onClick={() => setTab('bullet')}>SILVER BULLET {me.veto !== null ? '✓' : ''}</button></div>
    {tab === 'mine' ? <div className="cs8-wlist">
      <div className="cs8-wchips"><button disabled={me.done || !mineList.length} onClick={() => { buzz(8); const each = Math.floor(budget / Math.max(1, mineList.length)); mineList.forEach((id) => send({ t: 'hit', pid, tok: { id, amt: each } })); }}>SPREAD EVENLY</button><button disabled={me.done || spent === 0} onClick={() => { buzz(8); mineList.forEach((id) => tk[id] > 0 && send({ t: 'hit', pid, tok: { id, amt: 0 } })); }}>CLEAR</button><span>TAP A FILM = +10 ◈</span></div>
      <div className="cs8-wbudget"><i style={{ width: Math.round((spent / Math.max(1, budget)) * 100) + '%' }} /><b>◈ {lefty} LEFT OF {budget}</b></div>
      {mineList.map((id) => <div key={id} className={'cs8-wrow cs8-wrow--tap' + (golden === id ? ' is-gold' : '') + ((tk[id] || 0) > 0 ? ' is-bet' : '')}>
        <button className="cs8-wtap" disabled={me.done || lefty <= 0} onClick={() => set(id, (tk[id] || 0) + Math.min(10, lefty))}>
          <span className="cs8-wt"><b>{clip(BY_ID[id].t, 24)}</b><em>{BY_ID[id].y}{h.owner[id] === 'AB' ? ' · BOTH PICKED' : ''}</em></span>
          <span className="cs8-wsc">{BY_ID[id].rt != null ? <u>🍅 {BY_ID[id].rt}%</u> : null}<u>★ {BY_ID[id].r.toFixed(1)}</u></span>
          <span className="cs8-wamt">{tk[id] || 0}</span>
        </button>
        {(tk[id] || 0) > 0 && <button className="cs8-wx" disabled={me.done} onClick={() => set(id, 0)} title="Remove tokens">✕</button>}
        <button className={'cs8-star' + (golden === id ? ' is-on' : '')} disabled={me.done} onClick={() => { buzz(8); send({ t: 'hit', pid, shield: id }); }} title="Golden Ticket">★</button>
      </div>)}
    </div> : <div className="cs8-wlist cs8-wbul">
      <p className="cs8-sel">{me.veto === null ? `Pick one of ${s.players[other].name}'s titles to shoot. It dies before the bracket.` : `Loaded: ${BY_ID[me.veto].t}. Tap again to unload.`}</p>
      <div className="cs8-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>{theirs.map((id) => <button key={id} disabled={me.done} className={'cs8-tile' + (me.veto === id ? ' is-strike' : '')} onClick={() => { buzz(8); send({ t: 'hit', pid, veto: me.veto === id ? null : id }); setSel(id); }}><Poster id={id} />{me.veto === id && <em className="cs8-x">⌖</em>}</button>)}</div>
      {sel !== null && theirs.includes(sel) && <p className="cs8-sel"><b>{BY_ID[sel].t}</b> · {BY_ID[sel].y} · {BY_ID[sel].r.toFixed(1)}</p>}
    </div>}
    <p className="cs8-sel">{golden !== undefined ? `★ Golden Ticket: ${clip(BY_ID[golden].t, 24)} (seed 1)` : '★ = your Golden Ticket, locked as seed 1.'}</p>
    <button className="cs-btn" disabled={me.done} onClick={() => send({ t: 'hit', pid, done: true })}>{me.done ? 'LOCKED. WAITING...' : 'LOCK IN'}</button>
  </div>;
}

/** Both players' Popcorn Token balances, visible on every tournament screen. */
export function TokStrip({ s }: { s: State }) { void s; return null; /* replaced by the sticky TokenHUD in the room shell */ }

export const RNDN = ['ROUND OF 16', 'QUARTERFINAL', 'SEMIFINAL', 'THE FINAL'];
const OFFR = (b: { base: number }, r: number) => [0, b.base, b.base + 4, b.base + 6][r - 1];
/** Full 16-seed tree: one column per round, strikethrough on the eliminated, green on the progressed. */
export function BracketMap({ s, onClose, tv }: { s: State; onClose?: () => void; tv?: boolean }) {
  const b = s.b8; if (!b) return null;
  const cell = (id: number | null, m: M8) => { if (id === null) return <span className="cs8-tc is-tbd"><em>TBD</em></span>;
    const cf = b.conf?.[id]; const who = cf ? s.players[cf.p].name.slice(0, 6).toUpperCase() : '';
    return <span className={'cs8-tc' + (m.winner === id ? ' is-win' : m.winner !== null ? ' is-lose' : '') + (cf ? (cf.p === 'A' ? ' is-pa' : ' is-pb') : '')}>
      <Poster id={id} cls="cs8-tcp" /><span className="cs8-tct"><b>{BY_ID[id].t}</b><i>{who}{cf ? ` #${cf.rank}` : ''}{b.shield[id] ? ' ★' : ''}</i></span></span>; };
  const cur = b.show ? (b.show.kind === 'round' ? b.cur + 1 : -1) : b.cur;
  return <div className={'cs8-tree' + (tv ? ' is-tv' : '')} onClick={onClose}>
    {[1, 2, 3, 4].filter((r) => b.matches.some((m) => m.round === r)).map((r) => <div key={r} className={'cs8-tcol cs8-r' + r}><b>{r === 4 ? '👑 ' : ''}{['ROUND OF 16', 'QUARTERFINALS', 'SEMIFINALS', 'THE FINAL'][r - 1]}</b>
      <div className="cs8-tms">{b.matches.filter((m) => m.round === r).map((m) => <div key={m.id} className={'cs8-tm' + (cur === m.slot ? ' is-cur' : '')}>{cell(m.a, m)}{cell(m.b, m)}</div>)}</div></div>)}
  </div>;
}

const ROUND_INFO: Record<number, { name: string; says: string }> = {
  1: { name: 'ROUND OF 16 · THE BLITZ', says: 'Eight fast bouts. One tap each, eight seconds on the clock, no tokens. A dead heat goes to the higher seed. Do not overthink it. I will.' },
  2: { name: 'QUARTERFINALS · NOW IT COSTS', says: 'Four bouts, and now your tokens talk. Stake them on your favourite: back the winner and the stake comes back. Back an upset, a gap of three seeds or more, and it comes back DOUBLE. Your Bracket Buster is live, so use it on a title you cannot stand.' },
  3: { name: 'SEMIFINALS · THE PURSE THINS', says: 'Two bouts and four titles left. Whatever you have not spent is all you have. One last chance to bust a bracket. Choose like you mean it.' },
  4: { name: 'THE FINAL · EVERYTHING ON IT', says: 'One bout. Two titles. Whatever is left in your purse goes in. The winner is tonight\'s film, and I will crown it myself.' },
};

/** Full-screen bracket page: Orson explains the seeding, then the rankings, then the tree after every match. */
/** Full-screen Orson sports commentary before the semifinals and the final. No input, it runs on its own clock. */
export function CallsPage({ s, now, tv }: { s: State; now: number; tv?: boolean; pid?: PID; send?: (i: Intent) => void }) {
  const b = s.b8; const sh = b?.show; if (!b || !sh) return null;
  const ms = b.matches.filter((m) => m.round === sh.round && m.a !== null && m.b !== null); const left = secs(sh.until, now);
  const fb = (m: M8) => `${BY_ID[m.a as number].t} meets ${BY_ID[m.b as number].t}. Rated ${BY_ID[m.a as number].r.toFixed(1)} and ${BY_ID[m.b as number].r.toFixed(1)}. Somebody is about to be very smug.`;
  return <div className={'cs8-page cs8-comm' + (tv ? ' is-tv' : '')}>
    <TokStrip s={s} />
    <div className="cs8-top"><span className="cs-orson">ORSON LIVE · {RNDN[sh.round - 1]}</span><b className="cs8-clock">{left}s</b></div>
    <div className="cs8-comm-face"><OrsonFace mood="smug" talking /></div>
    {ms.map((m) => <div key={m.id} className="cs8-comm-m"><div className="cs8-comm-vs"><b>{clip(BY_ID[m.a as number].t, 18)}</b><i>VS</i><b>{clip(BY_ID[m.b as number].t, 18)}</b></div><p>{m.tape || fb(m)}</p></div>)}
  </div>;
}

export function TapePage({ s, now, tv, pid, send }: { s: State; now: number; tv?: boolean; pid?: PID; send?: (i: Intent) => void }) {
  const b = s.b8; const sh = b?.show; const [i, setI] = useState(0); const [x0, setX0] = useState<number | null>(null); if (!b || !sh) return null;
  const ms = previewMatches(b); const m = ms[Math.min(i, ms.length - 1)]; if (!m) return null;
  const ack = b.ack || { A: false, B: false }; const dn = pid ? ack[pid] : true; const left = secs(sh.until, now);
  const fb = `${BY_ID[m.a as number].t} meets ${BY_ID[m.b as number].t}. Rated ${BY_ID[m.a as number].r.toFixed(1)} and ${BY_ID[m.b as number].r.toFixed(1)}. Taste is subjective, and you are both wrong.`;
  const line = m.tape || fb; const go = (d: number) => setI((v) => Math.max(0, Math.min(ms.length - 1, v + d)));
  return <div className={'cs8-page cs-tape' + (tv ? ' is-tv' : '')}>
    <TokStrip s={s} />
    <div className="cs8-top"><span className="cs-orson">TALE OF THE TAPE</span><b className="cs8-clock">{left}s</b></div>
    <div className="cs-tape-c" onTouchStart={(e) => setX0(e.touches[0].clientX)} onTouchEnd={(e) => { if (x0 !== null) { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); } setX0(null); }}>
      <div className="cs-tape-row">{[m.a as number, m.b as number].map((id, k) => { const rv = s.reviews?.[id]; return <div key={id} className="cs-tape-f">{k === 1 && null}<Poster id={id} /><b>{clip(BY_ID[id].t, 22)}</b><Scores m={BY_ID[id]} big />
        {rv && rv.q ? <><q>{rv.q.replace(/^["“”]+|["“”]+$/g, '')}</q><em className="cs-tape-rt">{rv.r !== null ? `${rv.r}/10 · ` : ''}{rv.a}</em></> : <em>{s.reviews?.[id] ? 'No critic would go on record.' : 'Fetching a critic...'}</em>}</div>; })}</div>
    </div>
    <div className="cs-tape-nav"><button className="cs-btn" disabled={i === 0} onClick={() => go(-1)}>‹</button><div className="cs-tape-dots">{ms.map((_, k) => <i key={k} className={k === i ? 'is-on' : ''} onClick={() => setI(k)} />)}</div><button className="cs-btn" disabled={i >= ms.length - 1} onClick={() => go(1)}>›</button></div>
    <p className="cs-tape-or"><b>ORSON:</b> {line}</p>
    {!tv && pid ? <button className="cs-btn cs-btn--gold" disabled={dn} onClick={() => send?.({ t: 'ack', pid })}>{dn ? 'WAITING FOR THE OTHER CORNER...' : 'START BRACKET'}</button> : <p className="cs8-sayline">{s.players.A.name}: {ack.A ? 'ready' : 'reading'} · {s.players.B.name}: {ack.B ? 'ready' : 'reading'}</p>}
  </div>;
}

export function BracketPage({ s, now, tv, pid, send }: { s: State; now: number; tv?: boolean; pid?: PID; send?: (i: Intent) => void }) {
  const b = s.b8; const sh = b?.show; if (!b || !sh) return null;
  if (sh.kind === 'champ') return <TapePage s={s} now={now} tv={tv} pid={pid} send={send} />;
  if (sh.kind === 'calls') return <CallsPage s={s} now={now} tv={tv} pid={pid} send={send} />;
  const owner = s.hit?.owner || {};
  const tag = (id: number) => (b.conf?.[id] ? `${s.players[b.conf[id].p].name.slice(0, 5).toUpperCase()} #${b.conf[id].rank}${b.conf[id].golden ? ' ★' : ''}` : (owner[id] === 'O' ? 'ORSON' : ''));
  const ranked = Object.keys(b.seed).map(Number).sort((x, y) => b.seed[x] - b.seed[y]);
  const left = secs(sh.until, now); const rem = sh.until - now; const hold = sh.kind === 'explain' || sh.kind === 'rank';
  const stage: 'explain' | 'rank' | 'tree' = sh.kind === 'explain' ? 'explain' : sh.kind === 'rank' ? 'rank' : 'tree';
  const done = sh.kind === 'round' ? sh.round : 0;
  const nxt = sh.kind === 'round' ? b.matches[b.cur + 1] : null; const endRound = !!nxt && nxt.round !== done; const lm = b.matches[b.cur];
  const explainNext = endRound && rem <= 7000;
  const ups = b.upsets.filter((u) => b.matches.some((m) => m.round === done && m.winner === u.winner && (m.a === u.loser || m.b === u.loser)));
  const title = (sh.kind === 'seed' || hold) ? (stage === 'explain' ? 'HOW THE BRACKET WORKS' : stage === 'rank' ? 'THE SEEDS ARE IN' : 'MATCHUP ' + Math.min(4, Math.floor((R.SEED_MS - rem) / 2600) + 1) + ' LOCKED') : explainNext ? 'NEXT UP' : endRound ? `${RNDN[done - 1]} COMPLETE` : `UP NEXT · ${RNDN[(nxt as M8).round - 1]}`;
  const sub = (sh.kind === 'seed' || hold) ? (stage === 'rank' ? 'Ranked by hype tokens. Golden Tickets lead each conference. Take your time.' : stage === 'tree' ? 'Eight enter. One survives. The quarterfinals start now.' : '') : !endRound && lm.winner !== null ? `${clip(BY_ID[lm.winner].t, 26)} advances.` : ups.length ? `${ups.length} upset${ups.length > 1 ? 's' : ''}: ${ups.slice(0, 2).map((u) => BY_ID[u.winner].t).join(', ')}` : 'Chalk. Boring. Next.';
  const tvSeries = s.kind === 'series';
  return <div className={'cs8-page' + (tv ? ' is-tv' : '')}>
    <TokStrip s={s} />
    <div className="cs8-top"><span className="cs-orson">{title}</span>{!hold && sh.kind !== 'round' && sh.kind !== 'seed' && <b className="cs8-clock">{left}s</b>}</div>
    {sub && <p className="cs8-sub">{sub}</p>}
    {stage === 'explain' && <div className="cs8-explain">
      <div className="cs8-ex"><b>1 · THE WAR ROOM</b><p>You spent 100 hype tokens, held a Golden Ticket and loaded a Silver Bullet. Four titles each survived. Two conferences, one winner.</p></div>
      <div className="cs8-ex"><b>2 · THE SEEDING</b><p>Pure hype. Your Golden Ticket is your seed 1, the rest rank by tokens spent. Nobody else decides this, so blame yourselves.</p></div>
      <div className="cs8-ex"><b>3 · THE PATH</b><p>Quarterfinals cross the conferences: your #1 faces their #4, your #2 faces their #3. Win three bouts and your title is tonight&apos;s film.</p></div>
      <div className="cs8-ex"><b>4 · THE BIDS</b><p>Every bout is a tug of war. Stake wager tokens from 1 up. Back the winner and the stake returns, back an upset and it returns double. A Golden Ticket wins any dead heat.</p></div>
      <div className="cs8-ex"><b>5 · THE BRACKET RETURNS</b><p>After every bout we come back here. Green means through. Struck out means gone.</p></div>
    </div>}
    {stage === 'rank' && <div className="cs8-rank">{ranked.map((id) => <div key={id} className="cs8-rk"><i>{b.seed[id]}</i><b>{clip(BY_ID[id].t, tv ? 30 : 17)}</b><em>{tag(id)}</em></div>)}</div>}
    {sh.kind === 'seed' && <div className="cs8-reveal">{b.matches.filter((m) => m.round === 2).map((m, i) => { const step = Math.floor((R.SEED_MS - rem) / 2600); const on = i <= step; return <div key={m.id} className={'cs8-rv' + (on ? ' is-on' : '')}><span className="is-a"><i>{b.conf[m.a as number] ? `${s.players[b.conf[m.a as number].p].name.slice(0, 5).toUpperCase()} #${b.conf[m.a as number].rank}${b.conf[m.a as number].golden ? ' ★' : ''}` : ''}</i><b>{clip(BY_ID[m.a as number].t, 17)}</b></span><em>VS</em><span className="is-b"><i>{b.conf[m.b as number] ? `${s.players[b.conf[m.b as number].p].name.slice(0, 5).toUpperCase()} #${b.conf[m.b as number].rank}${b.conf[m.b as number].golden ? ' ★' : ''}` : ''}</i><b>{clip(BY_ID[m.b as number].t, 17)}</b></span></div>; })}</div>}
    {sh.kind !== 'seed' && stage === 'tree' && !explainNext && <BracketMap s={s} tv={tv} />}
    {explainNext && nxt && <div className="cs8-explain"><div className="cs8-ex is-big"><b>{ROUND_INFO[nxt.round].name}</b><p>{ROUND_INFO[nxt.round].says}</p></div></div>}
    {(hold || sh.kind === 'round' || (sh.kind === 'seed' && rem <= 0)) && (() => { const a = b.ack || { A: false, B: false }; const me = pid; const done = me ? a[me] : false; return tv || !me ? <p className="cs8-sayline">{s.players.A.name}: {a.A ? 'ready' : 'reading'} · {s.players.B.name}: {a.B ? 'ready' : 'reading'}</p> : <><button className="cs-btn cs-btn--gold" disabled={done} onClick={() => send?.({ t: 'ack', pid: me })}>{done ? 'WAITING FOR ' + s.players[me === 'A' ? 'B' : 'A'].name.toUpperCase() + '...' : stage === 'explain' ? "GOT IT, LET'S GO" : stage === 'rank' ? 'READY FOR THE BRACKET' : sh.kind === 'seed' ? 'READY · FIRST BOUT' : endRound ? 'READY FOR THE NEXT ROUND' : 'READY FOR THE NEXT BOUT'}</button></>; })()}
    {stage === 'tree' && !endRound && (nxt?.tape || sh.line) && <p className="cs8-sayline">{nxt?.tape || sh.line}</p>}
  </div>;
}

/** PHASE 3: the March Madness bracket, one matchup at a time, with the compact map one tap away. */
export function BracketScreen({ s, pid, send, now }: P) {
  const b = s.b8; const [pick, setPick] = useState<number | null>(null); const [tok, setTok] = useState(1); const [mid, setMid] = useState(''); const [map, setMap] = useState(false);
  if (!b) return null;
  if (b.show) return <BracketPage s={s} now={now} pid={pid} send={send} />;
  const m = b.matches[b.cur]; const other: PID = pid === 'A' ? 'B' : 'A';
  if (mid !== m.id) { setMid(m.id); setTok(1); setPick(null); }
  const a = m.a as number, c = m.b as number; const br = bars(b, m);
  const blind = m.wc === 'blind' && m.status !== 'RESOLVED'; const nm = (id: number, n: number) => (blind ? `Mystery ${id === a ? 'A' : 'B'}` : clip(BY_ID[id].t, n));
  const tokA = (m.wg.A || m.live?.A)?.tok || 0, tokB = (m.wg.B || m.live?.B)?.tok || 0; const pa = Math.round((tokA / Math.max(1, tokA + tokB)) * 100) || 50;
  const P1: PID = 'A', P2: PID = 'B';

  const upsetNow = m.status === 'RESOLVED' && m.winner !== null && b.upsets.some((u) => u.winner === m.winner && u.gap >= R.UPSET_GAP && (u.loser === m.a || u.loser === m.b));
  return <div className={'cs8-br' + '' + (m.round === 4 ? ' cs8-final' : '')}>
    <div className="cs8-top"><span className="cs-orson">{RNDN[m.round - 1]}{m.round < 4 ? ` · ${m.slot - OFFR(b, m.round) + 1}/${b.matches.filter((x) => x.round === m.round).length}` : ''}</span>{m.status === 'VOTING_ACTIVE' && !m.trivia && (m.round === 1 ? m.endsAt : m.bidEnds) ? <b className={'cs8-clock cs8-bigclock' + (secs((m.round === 1 ? m.endsAt : m.bidEnds) as number, now) <= 5 ? ' is-hot' : '')}>{secs((m.round === 1 ? m.endsAt : m.bidEnds) as number, now)}s</b> : null}<button className="cs8-mapbtn" onClick={() => setMap(true)}>BRACKET</button></div>
    {m.round > 1 ? <div className="cs8-tokrow">{[pid, other].map((p) => { const l = m.wg[p] || m.live?.[p]; return <div key={p} className={'cs8-tkc' + (p === pid ? ' is-me' : '')}><small>{p === pid ? 'YOU' : s.players[p].name.toUpperCase().slice(0, 8)}{m.wg[p] ? ' · LOCKED' : ''}</small><b>◈ {b.purse[p]}</b><em>{l ? `${l.tok} on ${nm(l.id, 12)}` : 'no bid yet'}</em></div>; })}</div> : <p className="cs8-tokc">Blitz is free</p>}
    {map && <div className="cs-sheet" onClick={() => setMap(false)}><div className="cs-sheet-in"><BracketMap s={s} /></div></div>}
    {m.status === 'LOCKED_FOR_VETO' && <div className="cs8-glitch"><b>ORSON IS RUINING YOUR BRACKET...</b></div>}
    {m.wc && <div className={'cs8-wc cs8-wc--' + m.wc}><b>{m.wc === 'blind' ? '🎲 WILDCARD · BLIND BET' : m.wc === 'swap' ? '🎲 WILDCARD · GENRE SWAP' : '🎲 WILDCARD · RESURRECTION'}</b><span>{m.wc === 'blind' ? 'Posters and titles masked. Bet on the synopsis.' : m.wc === 'swap' ? `${m.was ? clip(BY_ID[m.was.a].t, 14) + ' and ' + clip(BY_ID[m.was.b].t, 14) + ' ' : ''}swapped for two cult/vintage picks.` : 'An eliminated film is back in the fight.'}</span></div>}
    {m.trivia ? <Trivia s={s} pid={pid} send={send} now={now} m={m} /> : <>
      <div className="cs8-vs">{[a, c].map((id, i) => { const mine = m.wg[pid]?.id === id; const upset = (i === 0 ? m.seedA > m.seedB : m.seedB > m.seedA) && Math.abs(m.seedA - m.seedB) >= R.UPSET_GAP;
        return <button key={id} className={'cs8-card' + (pick === id || mine ? ' is-pick' : '') + (m.winner === id ? ' is-win' : m.winner !== null ? ' is-lose' : '')} disabled={m.status !== 'VOTING_ACTIVE' || !!m.wg[pid] || (!!m.live?.[pid] && m.live[pid]!.id !== id)} onClick={() => { buzz(8); if (m.round === 1) send({ t: 'w8', pid, id, tok: 0 }); else setPick(id); }}>
          <i className="cs8-seed">#{b.seed[id]}</i>{m.round > 1 && (['A', 'B'] as PID[]).map((p) => { const l = m.wg[p] || m.live?.[p]; return l && l.id === id ? <u key={p} className={'cs8-stake ' + (p === pid ? 'is-me' : 'is-them')}>{p === pid ? 'YOU' : s.players[p].name.slice(0, 5).toUpperCase()} ◈{l.tok}</u> : null; })}{b.shield[id] && <i className="cs8-sb">★ GOLDEN</i>}{upset && <i className="cs8-up">x{R.UPSET_MULT}</i>}
          {blind ? <div className="cs8-mask">?</div> : <Poster id={id} />}<b>{blind ? nm(id, 20) : clip(BY_ID[id].t, 20)}</b>
          {!blind && <><span>{BY_ID[id].y}</span><Scores m={BY_ID[id]} big /></>}
          <p>{blind ? (m.cry ? (id === a ? m.cry.a : m.cry.b) : '...') : clip(pitchOf(s, id), 96)}</p></button>; })}</div>
      {m.round > 1 && <div className="cs8-wbar"><small>POPCORN TOKENS ON THE TABLE</small><div className="cs8-wb"><div className="cs8-wb-a" style={{ width: pa + '%' }}><b>{s.players[P1].name.slice(0, 8)} ◈{tokA}</b></div><div className="cs8-wb-b" style={{ width: (100 - pa) + '%' }}><b>◈{tokB} {s.players[P2].name.slice(0, 8)}</b></div></div></div>}
      <p className="cs8-tuglab">TUG OF WAR · live bids</p><div className={'cs8-tug' + (br.a > br.b ? ' lead-a' : br.b > br.a ? ' lead-b' : '')} key={'tg' + Math.round(br.a) + '-' + Math.round(br.b)}><i style={{ width: `${Math.round((br.a / Math.max(1, br.a + br.b)) * 100) || 50}%` }} /><u className="cs8-knot" style={{ left: `${Math.round((br.a / Math.max(1, br.a + br.b)) * 100) || 50}%` }}>⚔</u><span>{Math.round(br.a)}</span><span>{Math.round(br.b)}</span></div>
      {m.status === 'RESOLVED' && !!m.calledBy?.length && <p className="cs8-called">CALLED IT: {m.calledBy.map((p) => s.players[p].name).join(' + ')}</p>}
      {m.status === 'RESOLVED' ? <p className="cs8-say">{BY_ID[m.winner as number].t} advances. {m.via}.{b.upsets.some((u) => u.winner === m.winner && u.loser === (m.winner === a ? c : a) && u.gap >= R.UPSET_GAP) ? ' UPSET.' : ''}</p>
        : m.wg[pid] ? <p className="cs8-say">Locked at {m.wg[pid]!.tok}. Watch the rope.</p>
        : <div className="cs8-act">
          {m.round === 1 ? <em className="cs8-free">Blitz. Tap the one you want, 8 seconds.</em> : (() => { const lv = m.live?.[pid]; const side = lv ? lv.id : pick; const left = b.purse[pid];
            const raise = (n: number) => { if (side === null || side === undefined || left < 1) return; buzz(10); send({ t: 'bid', pid, id: side as number, add: Math.min(n, left) }); };
            return <div className="cs8-step cs8-live"><button disabled={side == null || left < 1} onClick={() => raise(1)}>+1</button><button disabled={side == null || left < 1} onClick={() => raise(5)}>+5</button><button disabled={side == null || left < 1} onClick={() => raise(10)}>+10</button><button disabled={side == null || left < 1} onClick={() => raise(left)}>ALL IN</button><em>{lv ? `${lv.tok} on ${nm(lv.id, 14)}` : side == null ? 'tap a film, then raise' : `tap +1 to back ${nm(side as number, 14)}`}</em></div>; })()}
          {m.round > 1 && (m.live?.[pid] ? <em className="cs8-free">Clock decides. Raise until it hits zero.</em> : b.purse[pid] < 1 ? <button className="cs-btn cs-btn--gold" disabled={pick === null} onClick={() => send({ t: 'w8', pid, id: pick as number, tok: 0 })}>PICK (NO TOKENS LEFT)</button> : null)}
        </div>}
      {m.bust && <p className="cs8-roast">{m.bust}</p>}
      </>}
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
  const r = s.reroll; const w = BY_ID[s.winner as number]; const mine = r.votes[pid]; const other: PID = pid === 'A' ? 'B' : 'A'; const oName = s.players[other].name;
  const [sel, setSel] = useState<string[]>([]);
  const tog = (x: string) => setSel((a) => a.includes(x) ? a.filter((y) => y !== x) : a.length >= 3 ? a : [...a, x]);
  if (r.stage === 'tropes') return <div className="cs8-rr cs8-nuke"><div className="cs-orson">THE GENRE GAUNTLET</div>
    {r.pk?.[pid] ? <p className="cs-say">Your three are locked. Waiting for {oName}.</p> : <><p className="cs-say">You both hate it. Fine. Pick 3 NON-NEGOTIABLE tropes, fast.</p>
      <div className="cs8-chips">{TROPE_NAMES.map((x) => <button key={x} className={'cs8-chip' + (sel.includes(x) ? ' is-on' : '')} onClick={() => tog(x)}>{x}</button>)}</div>
      <button className="cs-btn cs-btn--no" disabled={sel.length !== 3} onClick={() => send({ t: 'nuketropes', pid, tropes: sel })}>LOCK ({sel.length}/3)</button></>}</div>;
  if (r.stage === 'wait') return <div className="cs8-rr cs8-nuke"><div className="cs-orson">THE GENRE GAUNTLET</div><p className="cs-say">Six tropes in. Orson is composing the ultimatum from: {(r.tropes || []).join(', ') || 'chaos'}...</p></div>;
  if (r.stage === 'pick' && r.ult) { const u = r.ult; const my = r.uv?.[pid]; const card = (k: 'titan' | 'gem', lab: string) => { const m = BY_ID[u[k].id]; return <button disabled={!!my} className={'cs8-ult' + (my === k ? ' is-sel' : '')} onClick={() => send({ t: 'nukepick', pid, which: k })}><small>{lab}</small><Poster id={m.id} /><b>{m.t} <i>{m.y}</i></b><span>{m.rt ? `RT ${m.rt}%` : `TMDB ${m.r.toFixed(1)} (RT n/a)`}</span><em>{u[k].why}</em></button>; };
    return <div className="cs8-rr cs8-nuke"><div className="cs-orson">TAKE IT OR LEAVE IT</div><p className="cs-say">{u.rant}</p>
      <div className="cs-row cs8-ults">{card('titan', 'THE BLOCKBUSTER')}{card('gem', 'THE HIDDEN GEM')}</div>
      {my ? <p className="cs-small">Locked. Waiting for {oName}. You must BOTH take the same film.</p> : <button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'nukepick', pid, which: 'keep' })}>LEAVE IT: KEEP {w.t.toUpperCase()}</button>}</div>; }
  return <div className="cs8-rr"><div className="cs-orson">THE GAMBLE</div><Poster id={w.id} big cls="cs-poster--win" /><h2>{w.t}</h2>
    <p className="cs-say">Crowned. If you BOTH hate it, hit the NUCLEAR VETO and I will run the Genre Gauntlet.</p>
    {mine === undefined ? <div className="cs-row"><button className="cs-btn cs-btn--gold" onClick={() => send({ t: 'rr', pid, yes: false })}>KEEP IT</button><button className="cs-btn cs-btn--no" onClick={() => send({ t: 'rr', pid, yes: true })}>NUCLEAR VETO</button></div> : <p className="cs-small">Locked. Waiting for {oName}. Both must press it.</p>}
  </div>;
}
