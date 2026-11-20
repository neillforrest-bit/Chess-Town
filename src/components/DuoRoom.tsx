'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BY_ID, poster, registerExtra, type Movie } from '@/lib/game';
import { DUO_GENRES, DUO_MOODS, DOC_SHELVES, PAIRS_FLOORS, PAIRS_MAX_WAGER, pairsScores, type PublicDuo } from '@/lib/duo';
import Qr from './Qr';
import { SaveTicket } from './MovieExtras';
import s from './Duo.module.css';

const secret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');

/** Orson's curator line, rule-based from metadata only. Zero AI. */
function why(m: Movie): string {
  const ol = (m as { ol?: string }).ol;
  const bits: string[] = [];
  if (ol && ol !== 'en') bits.push(({ ja: 'Japanese', fr: 'French', ko: 'Korean', es: 'Spanish', it: 'Italian', de: 'German', sv: 'Swedish', da: 'Danish', no: 'Norwegian', zh: 'Chinese', hi: 'Hindi', fa: 'Persian', tr: 'Turkish', pl: 'Polish', pt: 'Portuguese', ru: 'Russian', th: 'Thai' } as Record<string, string>)[ol] || ol.toUpperCase());
  if (m.pop < 150) return `${m.r.toFixed(1)} from ${m.pop} votes${bits.length ? ', ' + bits[0] : ''}. Nobody saw it. Everybody who did loved it.`;
  if (m.y < 1985) return `${m.y}${bits.length ? ', ' + bits[0] : ''}, rated ${m.r.toFixed(1)}. The archives do not miss.`;
  if (m.y < 2000) return `${m.y}, ${m.r.toFixed(1)}. Older than your algorithm, better than your feed.`;
  if (bits.length) return `${bits[0]}, ${m.y}, ${m.r.toFixed(1)}. This is why I keep the archives.`;
  if (m.r >= 8) return `${m.r.toFixed(1)}. ${m.g[0]}. Buried at the back of the shelf, where I keep the good stuff.`;
  return `${m.g[0]}, ${m.y}, ${m.r.toFixed(1)}. You would never have typed this into a search bar. That is the point.`;
}

type Watch = { ok: boolean; region: string; stream: string[]; free: string[]; rent: string[]; buy: string[] } | null;

export default function DuoRoom() {
  const [room, setRoom] = useState<PublicDuo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [index, setIndex] = useState(0);
  const [help, setHelp] = useState(false);
  const [watch, setWatch] = useState<Watch>(null);
  const [tvHint, setTvHint] = useState(false);
  const creds = useRef<{ code: string; token: string; invite: string } | null>(null);
  const pending = useRef(false);
  const current = useRef(room);
  current.current = room;

  useEffect(() => { setName(localStorage.getItem('cs-name') || ''); }, []);
  useEffect(() => { if (room?.extras?.length) registerExtra(room.extras); }, [room?.extras]);

  async function act(type: string, extra: Record<string, unknown> = {}) {
    const c = creds.current;
    if (!c || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const r = await fetch('/api/duo/' + c.code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': c.token }, body: JSON.stringify({ type, round: current.current?.round, ...extra, actionId: secret().slice(0, 32) }), signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 409) {
          const fresh = await fetch('/api/duo/' + c.code, { headers: { 'x-wheel-seat': c.token }, cache: 'no-store' });
          if (fresh.ok) { const state = await fresh.json(); setRoom((old) => (!old || state.v >= old.v ? state : old)); }
        }
        throw Error(j.error || 'Action not saved');
      }
      setRoom((old) => (!old || j.v >= old.v ? j : old));
      return j as PublicDuo;
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection lost. Retry.'); }
    finally { pending.current = false; setBusy(false); }
  }

  useEffect(() => {
    try {
      const q = new URLSearchParams(location.hash.slice(1));
      const code = q.get('room'), invite = q.get('invite');
      if (code && /^[A-Z2-9]{8}$/.test(code)) {
        const saved = JSON.parse(localStorage.getItem('movietime-duo:' + code) || 'null');
        if (saved) { creds.current = { code, ...saved }; void refresh(code, saved.token); }
        else if (invite && /^[a-f0-9]{64}$/.test(invite)) { creds.current = { code, token: secret(), invite }; }
      }
    } catch { setError('Browser storage is needed to save your seat.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh(code: string, token: string) {
    try {
      const r = await fetch('/api/duo/' + code, { headers: { 'x-wheel-seat': token }, cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setRoom((old) => (!old || j.v >= old.v ? j : old));
    } catch { /* next poll retries */ }
  }

  useEffect(() => {
    if (!room) return;
    const id = setInterval(async () => {
      if (document.hidden || pending.current || !creds.current) return;
      await refresh(creds.current.code, creds.current.token);
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!room]);

  useEffect(() => { setIndex(0); setHelp(false); setWatch(null); }, [room?.phase]);

  useEffect(() => {
    if (room?.phase === 'done' && room.winner !== null) {
      (async () => { try { const r = await fetch('/api/watch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: room.winner }) }); setWatch(await r.json()); } catch { setWatch(null); } })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, room?.winner]);

  async function create() {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
    const token = secret(), invite = secret();
    creds.current = { code, token, invite };
    localStorage.setItem('movietime-duo:' + code, JSON.stringify({ token, invite }));
    localStorage.setItem('cs-name', name.trim() || 'Player 1');
    history.replaceState({}, '', '/duo#room=' + code);
    await act('create', { invite, name: name.trim() || 'Player 1' });
  }

  async function join() {
    const c = creds.current;
    if (!c) return;
    localStorage.setItem('movietime-duo:' + c.code, JSON.stringify({ token: c.token, invite: c.invite }));
    localStorage.setItem('cs-name', name.trim() || 'Player 2');
    await act('join', { invite: c.invite, name: name.trim() || 'Player 2' });
  }

  async function copy() {
    const c = creds.current; if (!c) return;
    const url = location.origin + '/duo#room=' + c.code + '&invite=' + c.invite;
    setLink(url);
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked: the field shows the link */ }
  }

  const film = (id: number): Movie | undefined => BY_ID[id] || room?.extras.find((m) => m.id === id);
  const me = room && room.you >= 0 ? room.seats[room.you] : null;
  const phase = room?.phase;
  const myOps = room?.ownOps || {};
  const shelfFilms = (room?.shelf || []).map((id) => film(id)).filter(Boolean) as Movie[];
  const cur = shelfFilms[Math.min(index, Math.max(0, shelfFilms.length - 1))];
  const keeps = Object.values(myOps).filter((o) => o === 'keep').length;
  const pair = (room?.pair || []).map((id) => film(id)!).filter(Boolean);
  const tugs = pair.map((_, side) => room!.seats.reduce((n, p) => n + (p.side === side ? p.spent * (p.double ? 2 : 1) : 0), 0));
  const champion = room?.winner !== null && room?.winner !== undefined ? film(room.winner) : null;
  const pairCard = room?.pairs && room.pairs.cards[room.pairs.turnIdx] ? film(room.pairs.cards[room.pairs.turnIdx].id) : null;
  const mt = room?.match ? (() => {
    const m = room.match!;
    const tot = [0, 0];
    m.cards.forEach((c, i) => { const st = m.status[i]; if ((st === 0 || st === 1) && c.id) { const f = film(c.id); const sc = f ? pairsScores(f).critics : null; if (sc != null) tot[st] += sc; } });
    const round = Math.floor(m.turnsTaken / 2) + 1;
    const leader = tot[0] === tot[1] ? -1 : tot[0] > tot[1] ? 0 : 1;
    const downLeft = m.status.filter((st) => st === -1).length;
    const safeNeeded = m.safeRound < round && leader >= 0 && downLeft >= 2;
    const safeActive = m.safeIdx != null && m.safeRound === round ? m.safeIdx : null;
    return { m, tot, round, leader, downLeft, safeNeeded, safeActive };
  })() : null;

  async function searchActors(q: string) {
    const c = creds.current;
    if (!c) return [];
    try {
      const r = await fetch('/api/duo/' + c.code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': c.token }, body: JSON.stringify({ type: 'pairFindActors', q, round: current.current?.round, actionId: secret().slice(0, 32) }) });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Search hiccup');
      return (j.results || []) as { id: number; name: string; known: string }[];
    } catch (e) { setError(e instanceof Error ? e.message : 'Actor search hiccup. Retry.'); return []; }
  }
  const maxSync = (room?.shelf.length || 1) * 2;
  const inviteUrl = creds.current && room ? (typeof location !== 'undefined' ? location.origin : '') + '/duo#room=' + creds.current.code + '&invite=' + creds.current.invite : '';
  const opTag = (id: number) => room?.overlaps.includes(id) ? 'BOTH KEPT' : room?.wilds.includes(id) ? 'ORSON WILDCARD' : room?.loners[0]?.includes(id) ? room.seats[0].name.toUpperCase() + ' ONLY' : room?.loners[1]?.includes(id) ? room.seats[1].name.toUpperCase() + ' ONLY' : '';

  return <main className={s.page}>
    <nav><Link href="/game-town?choose=mode&town=movie">‹ Game Town</Link><Link href="/movie-wheel">Movie Time</Link><Link href="/film-table">Finder & extras</Link></nav>
    <header><span className={s.kicker}>MOVIE TIME · DUO NIGHT</span>
      <h1>{!room ? 'Two phones. One film.' : phase === 'lobby' ? 'Get your co-star in.' : phase === 'swipe' ? 'Call every card.' : phase === 'reveal' ? 'The telepathy report.' : phase === 'bout' || phase === 'tie' ? 'Pull for your favourite.' : phase === 'done' ? 'That’s a wrap.' : phase === 'actors' ? 'Cast the con.' : phase === 'deal' ? 'Match, bluff or pass.' : phase === 'wager' ? 'Stake your points.' : phase === 'pReveal' ? 'The truth, dealt.' : phase === 'pPick' ? 'Pick tonight’s film.' : phase === 'pConfirm' ? 'One film, two yeses.' : phase === 'mCast' ? 'Cast your stars.' : phase === 'mFlip' ? 'Flip, claim, remember.' : phase === 'mClaim' ? 'Challenge the claim?' : phase === 'mBid' ? 'Secret bids.' : phase === 'mPitch' ? 'Make your pitch.' : phase === 'mReveal' ? 'The totals are in.' : phase === 'mConfirm' ? 'One film, two yeses.' : 'Duo Night'}</h1>
    </header>

    {room && phase !== 'lobby' && room.mode !== 'match' && <section className={s.scoreboard} aria-label="Token scoreboard">
      {room.seats.map((p, i) => <div key={i} data-you={i === room.you}><small>{p.name}{i === room.you ? ' · YOU' : ''}</small><b>🎟 {p.tokens}</b><span>{phase === 'swipe' ? room.progress[i] + '/' + room.shelf.length + ' called' : 'sync tokens left'}</span></div>)}
    </section>}

    {!room && !creds.current && <section className={s.gameCard}>
      <span>THE TWO-PLAYER COUCH GAMES</span>
      <h2>Solo games, rebuilt for two.</h2>
      <p><b>Taste Duel.</b> You both keep or pass the same cards in secret. Every matching call earns sync tokens. The kept films fight a knockout, and splits are settled by spending those tokens in a tug.</p>
      <p><b>Discovery Duos.</b> One shared shelf of twelve deep cuts, chosen from both your genres. Keep up to five each in secret, then see how telepathic you are. Overlaps, lone picks and Orson wildcards fight the finale.</p>
      <label>YOUR NAME<input aria-label="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className={s.primary} disabled={busy} onClick={create}>Create duo night →</button>
      <small>No accounts or automatic messages. The invite gives its holder the second seat. Seven-day rooms. Tokens have no cash value. Got a projector? Open /tv on it once your room exists.</small>
      <JoinWithCode name={name} onJoined={(c, tok) => { creds.current = { code: c, token: tok, invite: '' }; void refresh(c, tok); }} />
    </section>}

    {!room && creds.current && <section className={s.gameCard}>
      <span>{creds.current.invite ? 'YOU HAVE AN INVITE' : 'JOIN WITH A CODE'}</span>
      <h2>Take a seat.</h2>
      <label>YOUR NAME<input aria-label="Your name" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className={s.primary} disabled={busy} onClick={join}>Join the room →</button>
    </section>}

    {room && phase === 'lobby' && <section className={s.gameCard}>
      <h2>{room.seats.length}/2 players in the lobby</h2>
      <div className={s.roomCode}><small>ROOM CODE FOR THE TV</small><b>{creds.current?.code}</b><span>Open {typeof location !== 'undefined' ? location.host : 'this site'}/tv on the projector and type it in</span></div>
      <p>Send the invite yourself, or let them scan this phone.</p>
      {inviteUrl && <div className={s.qrWrap}><Qr text={inviteUrl} /><small>Player 2 scans this to join</small></div>}
      <button onClick={copy}>Copy invite link</button>
      {link && <input aria-label="Duo invite" readOnly value={link} onFocus={(e) => e.target.select()} />}
      <div className={s.row}>
        <button onClick={() => setTvHint(!tvHint)}>Watch on the TV {tvHint ? '▴' : '▾'}</button>
      </div>
      {tvHint && <>
        <p className={s.note}>On the projector or TV browser, open <b>{typeof location !== 'undefined' ? location.host : 'this site'}/tv</b> and enter room code <b>{creds.current?.code}</b>. The big screen follows the game; phones stay the controllers.</p>
        <label className={s.check}><input type="checkbox" checked={!!room.tvInvite} disabled={busy} onChange={(e) => act('tvInvite', { on: e.target.checked, invite: creds.current?.invite })} /> Show a join QR on the TV during this lobby</label>
        <small>Only tick this if everyone who can see the TV may join. It hides once the game starts.</small>
      </>}
      <button className={s.primary} disabled={busy || room.you !== 0 || room.seats.length !== 2} onClick={() => act('start')}>Both here, choose the game →</button>
    </section>}

    {room && phase === 'mode' && <section className={s.gameCard}>
      <span>HOST PICKS THE GAME</span>
      {room.you === 0 ? <div className={s.moods}>
        <button onClick={() => act('chooseMode', { mode: 'duel' })}><b>⚔️ TASTE DUEL</b><i>Same cards, secret calls. Agreement earns the tokens that win the knockout.</i></button>
        <button onClick={() => act('chooseMode', { mode: 'discovery' })}><b>🔭 DISCOVERY DUOS</b><i>A shared shelf of deep cuts from both your genres. Telepathy scored, Orson interferes.</i></button>
        <button onClick={() => act('chooseMode', { mode: 'pairs' })}><b>🎭 STAR PAIRS · JEMMA’S GAME</b><i>Two actors, ten hidden-score films. Match them, bluff the match, then wager on the totals.</i></button>
        <button onClick={() => act('chooseMode', { mode: 'match' })}><b>🃏 STAR MATCH · JEMMA’S MEMORY GAME</b><i>Two casts face-down on the TV. Flip, claim your actor’s films, challenge with chips. Safe cards, bids and a pitch finale.</i></button>
      </div> : <><h2>{room.seats[0].name} is picking the game.</h2><p>Both games end with one film you both had a hand in choosing.</p></>}
    </section>}

    {room && phase === 'genres' && room.mode === 'duel' && <section className={s.gameCard}>
      <span>PICK YOUR MOOD · YOUR CALL IS SECRET UNTIL BOTH LOCK</span>
      <h2>What tonight feels like</h2>
      <div className={s.moods}>
        {DUO_MOODS.map((m) => <button key={m.name} aria-pressed={(room.picks[room.you] || [])[0] === m.name && room.genreLocked.includes(room.you)} disabled={busy || room.genreLocked.includes(room.you)} onClick={() => act('chooseGenres', { genres: [m.name] })}><b>{m.name}</b><i>{m.blurb}</i></button>)}
      </div>
      <small>{room.genreLocked.includes(room.you) ? 'Mood locked. Waiting for your co-star.' : room.genreLocked.length + '/2 locked. The deck averages both moods.'}</small>
    </section>}

    {room && phase === 'genres' && room.mode === 'discovery' && <section className={s.gameCard}>
      <span>PICK UP TO TWO · THE SHELF MIXES BOTH PLAYERS</span>
      <h2>What are we digging in?</h2>
      <GenrePicker genres={room.genres} locked={room.genreLocked.includes(room.you)} busy={busy} onLock={(g) => act('chooseGenres', { genres: g })} />
      <small>{room.genreLocked.includes(room.you) ? 'Genres locked. Building the shelf…' : room.genreLocked.length + '/2 locked. Deep cuts only: low hype, high score, any country, any year since 1960.'}</small>
    </section>}

    {room && phase === 'swipe' && cur && <section>
      <div className={s.progress}><span>CARD {Math.min(index + 1, shelfFilms.length)}/{shelfFilms.length} · KEPT {keeps}/5</span><span>{room.you >= 0 && room.progress[1 - room.you] !== undefined ? room.seats[1 - room.you].name + ': ' + room.progress[1 - room.you] + '/' + room.shelf.length : ''}</span></div>
      <div className={s.dcard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster(cur, 'w342')} alt={cur.t} draggable={false} />
        <b>{cur.t}</b><small>{cur.y} · {cur.g.slice(0, 3).join(' / ')}{(cur as { ol?: string }).ol && (cur as { ol?: string }).ol !== 'en' ? ' · ' + (cur as { ol?: string }).ol!.toUpperCase() : ''}</small>
        <div className={s.scores}><span>TMDB {cur.r.toFixed(1)}</span><span>{cur.pop.toLocaleString()} votes</span>{cur.rt != null && <span>RT {cur.rt}%</span>}</div>
        {room.mode === 'discovery' && <p className={s.dwhy}>{why(cur)}</p>}
        <p className={s.dsyn}>{cur.o}</p>
      </div>
      <div className={s.row} style={{ marginTop: 8 }}>
        <button aria-pressed={myOps[cur.id] === 'pass'} disabled={busy || room.swipeDone.includes(room.you)} onClick={() => act('opinion', { id: cur.id, op: 'pass' })}>{myOps[cur.id] === 'pass' ? 'PASSED ✓' : 'PASS'}</button>
        <button className={s.primary} aria-pressed={myOps[cur.id] === 'keep'} disabled={busy || room.swipeDone.includes(room.you) || (myOps[cur.id] !== 'keep' && keeps >= 5)} onClick={() => act('opinion', { id: cur.id, op: 'keep' })}>{myOps[cur.id] === 'keep' ? 'KEPT ✓' : 'KEEP + (' + keeps + '/5)'}</button>
      </div>
      <div className={s.row} style={{ marginTop: 8 }}>
        <button aria-pressed={myOps[cur.id] === 'seen'} disabled={busy || room.swipeDone.includes(room.you)} onClick={() => act('opinion', { id: cur.id, op: 'seen' })}>{myOps[cur.id] === 'seen' ? 'SEEN ✓' : 'SEEN IT'}</button>
      </div>
      <div className={s.row} style={{ marginTop: 8 }}>
        <button disabled={index === 0} onClick={() => setIndex(index - 1)}>‹ Previous</button>
        <button disabled={index >= shelfFilms.length - 1} onClick={() => setIndex(index + 1)}>Next ›</button>
      </div>
      <div style={{ marginTop: 8 }}>
        {room.swipeDone.includes(room.you)
          ? <p className={s.note}>Your shelf is in. Waiting for {room.seats[1 - room.you]?.name} to finish theirs…</p>
          : <button className={s.primary} disabled={busy || Object.keys(myOps).length < shelfFilms.length} onClick={() => act('finishSwipe')}>{Object.keys(myOps).length < shelfFilms.length ? 'Call every card to finish (' + Object.keys(myOps).length + '/' + shelfFilms.length + ')' : 'Lock my calls, open the reveal →'}</button>}
      </div>
    </section>}

    {room && phase === 'reveal' && <section>
      <div className={s.syncHero}><span>SYNC SCORE</span><b>{Math.round((room.sync / maxSync) * 100)}%</b><span>{room.sync} sync tokens each · {room.overlaps.length} shared keep{room.overlaps.length === 1 ? '' : 's'}</span></div>
      <p className={s.dwhy} style={{ textAlign: 'center', marginBottom: 10 }}>ORSON: “{room.line}”</p>
      <h2>The four finalists</h2>
      <div className={s.finGrid}>
        {room.finalists.map((id) => { const m = film(id); if (!m) return null; return <div key={id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(m)} alt={m.t} draggable={false} />
          <b>{m.t}</b>
          <span className={s.tag + (room.overlaps.includes(id) ? '' : ' ' + s.lone)}>{opTag(id)}</span>
        </div>; })}
      </div>
      <p className={s.note} style={{ marginTop: 10 }}>Semis then a final. Pull with sync tokens: choose a side, spend, lock. Both spent banks are charged win or lose. One Double, one Steal and one Switch each, once per night.</p>
      <button className={s.primary} disabled={busy || room.revealAck.includes(room.you)} onClick={() => act('ready')}>{room.revealAck.includes(room.you) ? 'Waiting for ' + room.seats[1 - room.you]?.name + '…' : 'To the knockout →'}</button>
    </section>}

    {room && ['bout', 'tie', 'result'].includes(phase || '') && pair.length === 2 && <section>
      <div className={s.progress}><span>{room.stage === 0 ? 'SEMI-FINAL' : 'THE FINAL'}</span><span>Bout {room.history.length + (phase === 'result' ? 0 : 1)}/3</span></div>
      <div className={s.filmPair}>
        {pair.map((m, i) => <article key={m.id}>
          <button className={s.posterButton} onClick={() => setHelp(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster(m)} alt="" /><b>{m.t}</b><small>{m.y} · TMDB {m.r.toFixed(1)}</small>
          </button>
        </article>)}
      </div>
      <div className={s.tugNumbers}><b>{tugs[0]} pull</b><span>VS</span><b>{tugs[1]} pull</b></div>
      <div className={s.tug} role="meter" aria-label="Head-to-head tug balance" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round((tugs[1] - tugs[0]) / Math.max(1, tugs[0] + tugs[1]) * 100)}><i style={{ left: (50 + (tugs[1] - tugs[0]) / Math.max(1, tugs[0] + tugs[1]) * 43) + '%' }} /></div>
      {phase === 'bout' ? <>
        <div className={s.row}>{pair.map((m, i) => <button key={m.id} disabled={busy || me?.locked || !me?.tokens || (me!.side !== null && me!.side !== i)} onClick={() => act('pull', { side: i })}>+1 {i === 0 ? '← LEFT' : 'RIGHT →'}</button>)}</div>
        <div className={s.wilds}>{['double', 'steal', 'switch'].map((k) => <button key={k} disabled={busy || me?.locked || me?.wild.includes(k) || (k === 'double' && !me?.spent) || (k === 'switch' && me?.side === null) || (k === 'steal' && !room.seats[1 - room.you].tokens)} onClick={() => act('wild', { kind: k })}>{k === 'double' ? '×2 Double' : k === 'steal' ? '✦ Steal 2' : '⇄ Switch'}{me?.wild.includes(k) ? ' ✓' : ''}</button>)}</div>
        <button className={s.primary} disabled={busy || me?.locked} onClick={() => act('lockBout')}>{me?.locked ? 'Locked, waiting for ' + room.seats[1 - room.you].name : 'Lock ' + (me?.spent || 0) + ' spent tokens ✓'}</button>
        <small>{room.seats.map((p, i) => p.name + ': ' + (p.locked ? 'locked' : p.spent + ' spent' + (p.double ? ' ×2' : ''))).join(' · ')} · Abstaining is free.</small>
      </> : phase === 'tie' ? <>
        <h2>Tied. Choose together.</h2>
        <div className={s.row}>{pair.map((m) => <button key={m.id} aria-pressed={room.tie[room.you] === m.id} disabled={busy} onClick={() => act('tieChoose', { id: m.id })}>{m.t}</button>)}</div>
        <button disabled={busy} aria-pressed={room.tie[room.you] === -1} onClick={() => act('tieChoose', { id: -1 })}>We both agree to the wheel ↻</button>
        <small>Both pick the same film, or both approve a fair wheel. No extra tokens.</small>
      </> : <>
        <h2>{champion ? film(room.history.at(-1)?.winner || 0)?.t : ''} advances{room.history.at(-1)?.tied ? ' · tie resolved' : ''}</h2>
        <button className={s.primary} disabled={busy || room.revealAck.includes(room.you)} onClick={() => act('ready')}>{room.revealAck.includes(room.you) ? 'Waiting…' : 'Next →'}</button>
      </>}
    </section>}

    {room && (room.mode === 'duel' || room.mode === 'discovery') && ['confirm', 'done'].includes(phase || '') && champion && <section className={s.gameCard}>
      <span>{phase === 'done' ? 'BOTH CONFIRMED' : 'DUO CHAMPION'}</span>
      <div className={s.dcard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster(champion, 'w500')} alt={champion.t} draggable={false} />
        <b>{champion.t}</b><small>{champion.y} · {champion.g.slice(0, 3).join(' / ')} · TMDB {champion.r.toFixed(1)}</small>
        <p className={s.dsyn}>{champion.o}</p>
      </div>
      {phase === 'confirm' ? <>
        <p>Does this exact film work for tonight? Nothing is booked or played automatically.</p>
        <button className={s.primary} disabled={busy || room.confirmed.includes(room.you)} onClick={() => act('confirm')}>{room.confirmed.includes(room.you) ? 'Confirmed, waiting…' : 'Yes, this is tonight’s film ✓'}</button>
      </> : <>
        {watch && watch.ok && (watch.stream.length || watch.rent.length || watch.buy.length) ? <div className={s.watchBox}><em>WHERE TO WATCH · {watch.region}</em>
          {!!watch.stream.length && <p><b>STREAM</b> {watch.stream.join(' · ')}</p>}
          {!!watch.rent.length && <p><b>RENT</b> {watch.rent.join(' · ')}</p>}
          {!!watch.buy.length && <p><b>BUY</b> {watch.buy.join(' · ')}</p>}
        </div> : <p className={s.note}>No GB streaming listing found. The archives are like that sometimes.</p>}
        <SaveTicket movie={champion} />
        <Link href="/duo" className={s.primary} onClick={() => { try { const c = creds.current; if (c) { creds.current = null; history.replaceState({}, '', '/duo'); localStorage.removeItem('movietime-duo:' + c.code); } } catch { /* ignore */ } setRoom(null); }}>Start another duo night →</Link>
      </>}
      <details><summary>The bracket</summary>{room.history.map((h, i) => <p key={i}>{i + 1}. {film(h.winner)?.t} · {h.scores.join('–')}{h.tied ? ' · tie' : ''}</p>)}</details>
    </section>}


    {room && phase === 'actors' && room.pairs && <section className={s.gameCard}>
      <span>STAR PAIRS · EACH PLAYER NAMES ONE ACTOR</span>
      <h2>Cast your actor</h2>
      {[0, 1].map((i) => <ActorSlot key={i} room={room} seat={i} mine={room.you === i} busy={busy} onSearch={searchActors} onPick={(personId, personName) => act('pairActor', { personId, personName })} />)}
      {room.you === 0 ? <>
        <span>THE FLOOR · MINIMUM VERIFIED RT SCORE FOR THE DECK</span>
        <div className={s.chips}>{PAIRS_FLOORS.map((f) => <button key={f} className={room.pairs!.floor === f ? 'is-on' : ''} disabled={busy} onClick={() => act('pairFloor', { floor: f })}>{f}+</button>)}</div>
        <button className={s.primary} style={{ marginTop: 10 }} disabled={busy || !room.pairs.actors[0] || !room.pairs.actors[1]} onClick={() => act('pairDeal')}>{room.pairs.actors[0] && room.pairs.actors[1] ? 'Deal ten films →' : 'Waiting for both actors…'}</button>
      </> : <p className={s.note}>{room.seats[0].name} sets the floor ({room.pairs.floor}+ RT) and deals. Films show title, year and story only. Casts and scores stay hidden until the reveal.</p>}
      <small>Five real films per actor, verified against live credits. At the end a coin flip picks whether critics or audience scores count, and a star marks the counting score. Real scores, never altered.</small>
    </section>}

    {room && phase === 'deal' && room.pairs && pairCard && <section>
      <div className={s.progress}><span>CARD {room.pairs.turnIdx + 1}/{room.pairs.cards.length}</span><span>{room.pairs.actors.map((a, i) => (a?.name || 'Actor ' + (i + 1)) + ' pile: ' + room.pairs!.piles.filter((x) => x === i).length).join(' · ')}</span></div>
      <div className={s.dcard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster(pairCard, 'w342')} alt={pairCard.t} draggable={false} />
        <b>{pairCard.t}</b><small>{pairCard.y} · {pairCard.g.slice(0, 3).join(' / ')}</small>
        <p className={s.dsyn}>{pairCard.o}</p>
        <small>Cast and scores hidden until the reveal.</small>
      </div>
      {!room.pairs.pendingPass && room.you === room.pairs.active && <>
        <p className={s.note}>Your call, {room.seats[room.you].name}. Claim it for an actor, or pass and hope {room.seats[1 - room.you].name} misreads it.</p>
        <div className={s.row}><button className={s.primary} disabled={busy} onClick={() => act('pairAct', { pile: 0 })}>Claim: {room.pairs.actors[0]?.name}</button>
        <button className={s.primary} disabled={busy} onClick={() => act('pairAct', { pile: 1 })}>Claim: {room.pairs.actors[1]?.name}</button></div>
        <button style={{ marginTop: 8 }} disabled={busy} onClick={() => act('pairAct', { pile: -1 })}>No match, pass →</button>
      </>}
      {!room.pairs.pendingPass && room.you !== room.pairs.active && <p className={s.note}>{room.seats[room.pairs.active].name} holds the card. Watch for the twitch.</p>}
      {room.pairs.pendingPass && room.you !== room.pairs.active && <>
        <p className={s.note}>{room.seats[room.pairs.active].name} says no match. Snipe it if they are bluffing, or let it burn.</p>
        <div className={s.row}><button className={s.primary} disabled={busy} onClick={() => act('pairRespond', { pile: 0 })}>Snipe: {room.pairs.actors[0]?.name}</button>
        <button className={s.primary} disabled={busy} onClick={() => act('pairRespond', { pile: 1 })}>Snipe: {room.pairs.actors[1]?.name}</button></div>
        <button style={{ marginTop: 8 }} disabled={busy} onClick={() => act('pairRespond', { pile: -1 })}>Let it go</button>
      </>}
      {room.pairs.pendingPass && room.you === room.pairs.active && <p className={s.note}>Passed. {room.seats[1 - room.you].name} decides whether you were lying.</p>}
    </section>}

    {room && phase === 'wager' && room.pairs && <section className={s.gameCard}>
      <span>THE END WAGER · SECRET · 0 TO {PAIRS_MAX_WAGER} OF TONIGHT’S POINTS</span>
      <h2>Whose pile is really stronger?</h2>
      <p>Stake points on having the higher true total. Right: win them. Wrong: lose them. Then the truth.</p>
      <WagerBox busy={busy} locked={room.pairs.wagers[room.you] != null} partnerLocked={!!room.pairs.wagersLocked?.[1 - room.you]} partner={room.seats[1 - room.you]?.name || 'your co-star'} onLock={(amount) => act('pairWager', { amount })} />
    </section>}

    {room && phase === 'pReveal' && room.pairs?.totals && <section>
      <div className={s.syncHero}><span>THE COIN CHOSE</span><b>{room.pairs.flip === 'audience' ? 'AUDIENCE ★' : 'CRITICS ★'}</b><span>{room.pairs.flip === 'audience' ? 'IMDb audience scores count this round' : 'RT critic scores count this round'}</span></div>
      <div className={s.finGrid} style={{ marginTop: 10 }}>
        {room.pairs.cards.map((c, i) => { const m = film(c.id); if (!m) return null; const sc = pairsScores(m); const pile = room.pairs!.piles[i]; const bluff = pile != null && pile >= 0 && pile !== c.actor; return <div key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(m)} alt={m.t} draggable={false} />
          <b>{m.t}</b>
          <small>{room.pairs!.actors[c.actor]?.name}{pile == null || pile < 0 ? ' · DISCARDED' : bluff ? ' · BLUFFED into ' + (room.pairs!.actors[pile]?.name || 'the other') + '’s pile' : ' · matched'}</small>
          <span className={s.tag}>{sc.critics != null ? (m.rt != null ? 'RT ' : 'TMDB ') + sc.critics + '%' : 'RT —'}{room.pairs!.flip === 'critics' ? ' ★' : ''} · {sc.audience != null ? (m.imdb != null ? 'AUD ' : 'TMDB ') + sc.audience + '%' : 'AUD —'}{room.pairs!.flip === 'audience' ? ' ★' : ''}</span>
        </div>; })}
      </div>
      <div className={s.tugNumbers} style={{ marginTop: 10 }}><b>{room.seats[0].name}: {room.pairs.totals[0]}</b><span>TRUE TOTALS</span><b>{room.seats[1].name}: {room.pairs.totals[1]}</b></div>
      {room.you === 0 ? <button className={s.primary} disabled={busy} onClick={() => act('pairRevealDone')}>Final scores →</button> : <p className={s.note}>{room.seats[0].name} calls the scores…</p>}
    </section>}

    {room && phase === 'pPick' && room.pairs?.points && (() => {
      const pts = room.pairs.points, tot = room.pairs.totals || [0, 0];
      const w = pts[0] !== pts[1] ? (pts[0] > pts[1] ? 0 : 1) : tot[0] !== tot[1] ? (tot[0] > tot[1] ? 0 : 1) : 0;
      const pile = room.pairs.cards.filter((cd, i) => room.pairs!.piles[i] === w).map((cd) => film(cd.id)).filter(Boolean) as Movie[];
      return <section className={s.gameCard}>
        <span>{room.seats[w].name.toUpperCase()} WON THE NIGHT · {pts[w]} POINTS</span>
        <h2>{room.you === w ? 'Your pile, your pick.' : room.seats[w].name + ' picks tonight’s film.'}</h2>
        {room.you === w ? <>
          <p className={s.note}>One of the films you claimed becomes tonight’s film. Both phones then confirm it. Nothing is booked or played automatically.</p>
          {pile.map((m) => <button key={m.id} disabled={busy} onClick={() => act('pairPickFilm', { id: m.id })} style={{ textAlign: 'left' }}><b>{m.t}</b> <i>{m.y} · {m.g.slice(0, 2).join(' / ')}</i></button>)}
        </> : <p className={s.note}>{room.seats[w].name} is choosing one of the {pile.length} film{pile.length === 1 ? '' : 's'} in their pile. Watch this space.</p>}
      </section>;
    })()}

    {room && phase === 'pConfirm' && room.pairs?.watchPick && (() => {
      const pick = film(room.pairs.watchPick);
      if (!pick) return null;
      return <section className={s.gameCard}>
        <span>TONIGHT’S FILM · BOTH CONFIRM</span>
        <div className={s.dcard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(pick, 'w500')} alt={pick.t} draggable={false} />
          <b>{pick.t}</b><small>{pick.y} · {pick.g.slice(0, 3).join(' / ')}</small>
          <p className={s.dsyn}>{pick.o}</p>
        </div>
        <p>Does this exact film work for tonight? Nothing is booked or played automatically.</p>
        <button className={s.primary} disabled={busy || room.confirmed.includes(room.you)} onClick={() => act('pairConfirmWatch')}>{room.confirmed.includes(room.you) ? 'Confirmed, waiting…' : 'Yes, this is tonight’s film ✓'}</button>
      </section>;
    })()}

    {room && phase === 'done' && room.mode === 'pairs' && room.pairs?.points && <section className={s.gameCard}>
      <span>STAR PAIRS · FINAL POINTS</span>
      <div className={s.tugNumbers}><b>{room.seats[0].name}: {room.pairs.points[0]}</b><span>VS</span><b>{room.seats[1].name}: {room.pairs.points[1]}</b></div>
      <p className={s.dwhy} style={{ textAlign: 'center' }}>Totals {room.pairs.totals?.join('–')} · higher took 20, lower 15{room.pairs.wagers.some((w) => (w || 0) > 0) ? ' · wagers ' + room.pairs.wagers.map((w, i) => room.seats[i].name + ' staked ' + (w || 0)).join(' and ') : ''} · {room.pairs.flip === 'audience' ? 'audience' : 'critic'} scores counted ★</p>
      <p className={s.note}>Points are tonight only, pretend, and worth nothing. Jemma’s vault is a story for another week.</p>
      {room.winner != null && (() => { const champ = film(room.winner); return champ ? <>
        <span>BOTH CONFIRMED · TONIGHT’S FILM</span>
        <div className={s.dcard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champ, 'w500')} alt={champ.t} draggable={false} />
          <b>{champ.t}</b><small>{champ.y} · {champ.g.slice(0, 3).join(' / ')}</small>
        </div>
        {watch && watch.ok && (watch.stream.length || watch.rent.length || watch.buy.length) ? <div className={s.watchBox}><em>WHERE TO WATCH · {watch.region}</em>
          {!!watch.stream.length && <p><b>STREAM</b> {watch.stream.join(' · ')}</p>}
          {!!watch.rent.length && <p><b>RENT</b> {watch.rent.join(' · ')}</p>}
          {!!watch.buy.length && <p><b>BUY</b> {watch.buy.join(' · ')}</p>}
        </div> : <p className={s.note}>No GB streaming listing found. The archives are like that sometimes.</p>}
        <SaveTicket movie={champ} />
      </> : null; })()}
      <Link href="/duo" className={s.primary} onClick={() => { try { const c = creds.current; if (c) { creds.current = null; history.replaceState({}, '', '/duo'); localStorage.removeItem('movietime-duo:' + c.code); } } catch { /* ignore */ } setRoom(null); }}>Start another duo night →</Link>
    </section>}

    {room && phase === 'mCast' && room.match && <section className={s.gameCard}>
      <span>STAR MATCH · EACH PLAYER NAMES ONE ACTOR</span>
      <h2>Cast your stars</h2>
      {[0, 1].map((i) => <ActorSlot key={i} room={room} seat={i} mine={room.you === i} busy={busy} actors={room.match!.actors} onSearch={searchActors} onPick={(personId, personName) => act('matchActor', { personId, personName })} />)}
      {room.you === 0
        ? <button className={s.primary} style={{ marginTop: 10 }} disabled={busy || !room.match.actors[0] || !room.match.actors[1]} onClick={() => act('matchDeal')}>{room.match.actors[0] && room.match.actors[1] ? 'Deal twelve films face-down →' : 'Waiting for both actors…'}</button>
        : <p className={s.note}>{room.seats[0].name} deals once both actors are in. The grid lands on the TV, face-down.</p>}
      <small>Jemma’s memory game. Six films per actor: their best work plus one hidden gem, all scored 60+, no sci-fi or animation. Flip cards on your phone; claim your own actor’s films, remember where theirs sleep. Whoever is ahead locks one safe card each round. Challenges are secret bids: your banked films’ scores added up, plus pretend chips.</small>
    </section>}

    {room && phase === 'mFlip' && mt && <section>
      <div className={s.progress}><span>ROUND {mt.round} · {room.seats[mt.m.turn].name.toUpperCase()} FLIPS</span><span>YOU {mt.tot[room.you]} · chips {mt.m.chips.join('–')}</span></div>
      {mt.safeNeeded && room.you === mt.leader && <div className={s.gameCard}>
        <span>YOU ARE AHEAD · LOCK A SAFE CARD</span>
        <p className={s.note}>Tap one face-down card. Only you can flip it this round, and if it is yours it banks with no challenge. You are locking blind — trust your memory.</p>
        <div className={s.mGridP}>
          {mt.m.cards.map((c, i) => mt.m.status[i] === -1 ? <button key={i} disabled={busy} onClick={() => act('matchSafe', { card: i })}>★<i>{i + 1}</i></button> : null)}
        </div>
        <button disabled={busy} onClick={() => act('matchSafe', { card: -1 })}>No lock this round</button>
      </div>}
      {mt.safeNeeded && room.you !== mt.leader && <p className={s.note}>{room.seats[mt.leader].name} is ahead and locking a safe card…</p>}
      {!mt.safeNeeded && <>
        {mt.m.faceUp != null && mt.m.cards[mt.m.faceUp]?.id ? (() => { const f = film(mt.m.cards[mt.m.faceUp!].id); return f ? <div className={s.dcard} style={{ marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(f, 'w342')} alt={f.t} draggable={false} />
          <b>{f.t}</b><small>{f.y} · {f.g.slice(0, 3).join(' / ')}</small>
          <small>{mt.m.faceUpMiss ? 'Not the flipper’s film — back down it goes. Remember where.' : mt.m.status[mt.m.faceUp!] === 0 || mt.m.status[mt.m.faceUp!] === 1 ? 'Banked by ' + room.seats[mt.m.status[mt.m.faceUp!]].name + '.' : 'Claimed. Waiting on a possible challenge…'}</small>
        </div> : null; })() : null}
        <p className={s.note}>{room.you === mt.m.turn ? 'Your flip, ' + room.seats[room.you].name + '. Tap a face-down card.' : room.seats[mt.m.turn].name + ' is flipping. Watch the TV.'}</p>
        <div className={s.mGridP}>
          {mt.m.cards.map((c, i) => {
            const st = mt.m.status[i];
            const locked = mt.safeActive === i;
            if (st === 0 || st === 1) { const f = film(c.id); const sc = f ? pairsScores(f).critics : null; return <button key={i} disabled title={f?.t}>{f ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster(f)} alt={f.t} /> : null}<span>{st === room.you ? (sc != null ? (f && f.rt != null ? 'RT ' : 'TMDB ') + sc : '—') : room.seats[st].name}</span></button>; }
            if (st === -2) return <button key={i} data-burn="1" disabled>✕<i>{i + 1}</i></button>;
            const canFlip = room.you === mt.m.turn && !busy && (!locked || mt.m.safeBy === room.you || mt.downLeft === 1);
            return <button key={i} data-lock={locked ? '1' : undefined} disabled={!canFlip} onClick={() => act('matchFlip', { card: i })}>★<i>{i + 1}</i></button>;
          })}
        </div>
        <small>Only your own scores show, here on your phone — the TV counts cards. TMDB tag means no RT listing, so its TMDB audience score stands in. ★ face-down · 🔒 safe this round · ✕ burned.</small>
      </>}
    </section>}

    {room && phase === 'mClaim' && room.match?.claim && (() => {
      const m = room.match; const cl = m.claim!; const f = film(m.cards[cl.card].id);
      return <section className={s.gameCard}>
        <span>A CLAIM IS ON THE TABLE</span>
        {f && <div className={s.dcard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(f, 'w342')} alt={f.t} draggable={false} />
          <b>{f.t}</b><small>{f.y} · {f.g.slice(0, 3).join(' / ')} · score hidden until any bids are in</small>
        </div>}
        {room.you === cl.by
          ? <p className={s.note}>You claimed it. {room.seats[1 - cl.by].name} decides: challenge, or let it go.</p>
          : <>
            <p>{room.seats[cl.by].name} claims this one for their actor. Challenge it? You have {m.chips[room.you]} chips and any films you have banked to back you.</p>
            <button className={s.primary} disabled={busy} onClick={() => act('matchClaimResp', { challenge: true })}>Challenge it ⚔️</button>
            <button disabled={busy} onClick={() => act('matchClaimResp', { challenge: false })}>Let it go</button>
            <small>Both bid in secret: banked films lend their scores, added up, plus chips. Chips are spent either way; backing films stay put. A lost film burns: nobody gets it.</small>
          </>}
      </section>;
    })()}

    {room && phase === 'mBid' && room.match && (() => {
      const m = room.match; const f = m.claim ? film(m.cards[m.claim.card].id) : null;
      const mine = m.cards.map((c, i) => ({ c, i, st: m.status[i] })).filter((x) => x.st === room.you && x.c.id).map((x) => { const mf = film(x.c.id); const sc = mf ? pairsScores(mf).critics : null; return { idx: x.i, t: mf?.t || 'A claimed film', sc: sc ?? 0, src: mf && mf.rt != null ? 'RT' : 'TMDB' }; });
      return <section className={s.gameCard}>
        <span>SECRET BIDS · YOUR CHIPS LEFT: {m.chips[room.you]}</span>
        <h2>{f ? f.t : 'The claim'} is contested</h2>
        <p>Bid in secret: your claimed films lend their scores, added up, plus chips on top. Higher total keeps it; a challenger’s win burns it. Chips are spent either way — backing films stay with you.</p>
        <BidBox busy={busy} locked={m.bids[room.you] != null} partnerLocked={m.bids[1 - room.you] != null} partner={room.seats[1 - room.you]?.name || 'your co-star'} chips={m.chips[room.you]} mine={mine} onLock={(chips, backing) => act('matchBid', { chips, backing })} />
      </section>;
    })()}

    {room && phase === 'mPitch' && room.match && <PitchBox busy={busy} mine={room.match.pitches[room.you] != null} partner={room.seats[1 - room.you]?.name || 'your co-star'} partnerDone={room.match.pitches[1 - room.you] != null} onLock={(text) => act('matchPitch', { text })} />}

    {room && phase === 'mReveal' && room.match?.totals && (() => {
      const m = room.match; const w = m.winnerSeat ?? 0; const t = m.totals!;
      const claimed = m.cards.map((c, i) => ({ c, st: m.status[i] })).filter((x) => x.st === 0 || x.st === 1);
      return <section className={s.gameCard}>
        <span>STAR MATCH · {room.seats[w].name.toUpperCase()} WINS THE NIGHT</span>
        <div className={s.tugNumbers}><b>{room.seats[0].name}: {t[0]}</b><span>FINAL TOTALS</span><b>{room.seats[1].name}: {t[1]}</b></div>
        {m.pitches.map((p, i) => p ? <p key={i} className={s.dwhy}>“{p}” — {room.seats[i].name}</p> : null)}
        {room.you === w ? <>
          <p className={s.note}>Your win, your pick — from either collection. The pitches were each player’s case. Both phones then confirm it. Nothing is booked or played automatically.</p>
          {claimed.map(({ c, st }) => { const f = film(c.id); return f ? <button key={c.id} disabled={busy} style={{ textAlign: 'left' }} onClick={() => act('matchPickFilm', { id: c.id })}><b>{f.t}</b> <i>{f.y} · {room.seats[st].name}’s claim · score {pairsScores(f).critics ?? '—'}</i></button> : null; })}
        </> : <p className={s.note}>{room.seats[w].name} is picking tonight’s film from the two collections.</p>}
      </section>;
    })()}

    {room && phase === 'mConfirm' && room.match?.watchPick && (() => {
      const pick = film(room.match.watchPick);
      if (!pick) return null;
      return <section className={s.gameCard}>
        <span>TONIGHT’S FILM · BOTH CONFIRM</span>
        <div className={s.dcard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(pick, 'w500')} alt={pick.t} draggable={false} />
          <b>{pick.t}</b><small>{pick.y} · {pick.g.slice(0, 3).join(' / ')}</small>
          <p className={s.dsyn}>{pick.o}</p>
        </div>
        <p>Does this exact film work for tonight? Nothing is booked or played automatically.</p>
        <button className={s.primary} disabled={busy || room.confirmed.includes(room.you)} onClick={() => act('matchConfirmWatch')}>{room.confirmed.includes(room.you) ? 'Confirmed, waiting…' : 'Yes, this is tonight’s film ✓'}</button>
      </section>;
    })()}

    {room && phase === 'done' && room.mode === 'match' && room.match?.totals && <section className={s.gameCard}>
      <span>STAR MATCH · FINAL TOTALS</span>
      <div className={s.tugNumbers}><b>{room.seats[0].name}: {room.match.totals[0]}</b><span>VS</span><b>{room.seats[1].name}: {room.match.totals[1]}</b></div>
      {room.match.pitches.map((p, i) => p ? <p key={i} className={s.dwhy}>“{p}” — {room.seats[i].name}</p> : null)}
      <p className={s.note}>Points and chips are tonight only, pretend, and worth nothing.</p>
      {room.winner != null && (() => { const champ = film(room.winner); return champ ? <>
        <span>BOTH CONFIRMED · TONIGHT’S FILM</span>
        <div className={s.dcard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(champ, 'w500')} alt={champ.t} draggable={false} />
          <b>{champ.t}</b><small>{champ.y} · {champ.g.slice(0, 3).join(' / ')}</small>
        </div>
        {watch && watch.ok && (watch.stream.length || watch.rent.length || watch.buy.length) ? <div className={s.watchBox}><em>WHERE TO WATCH · {watch.region}</em>
          {!!watch.stream.length && <p><b>STREAM</b> {watch.stream.join(' · ')}</p>}
          {!!watch.rent.length && <p><b>RENT</b> {watch.rent.join(' · ')}</p>}
          {!!watch.buy.length && <p><b>BUY</b> {watch.buy.join(' · ')}</p>}
        </div> : <p className={s.note}>No GB streaming listing found. The archives are like that sometimes.</p>}
        <SaveTicket movie={champ} />
      </> : null; })()}
      <Link href="/duo" className={s.primary} onClick={() => { try { const c = creds.current; if (c) { creds.current = null; history.replaceState({}, '', '/duo'); localStorage.removeItem('movietime-duo:' + c.code); } } catch { /* ignore */ } setRoom(null); }}>Start another duo night →</Link>
    </section>}

    {error && <p role="alert" className={s.error}>{error}</p>}
    {room && <footer><span>You are {room.you >= 0 ? room.seats[room.you].name : 'a guest'} · private browser seat</span><span>NO PAID AI · ORSON ON RULES</span></footer>}
    {help && pair.length > 0 && <div className={s.modal}><section>
      {pair.map((m) => <div key={m.id} style={{ marginBottom: 12 }}><h2>{m.t}</h2><p>{m.y} · {m.g.join(', ')} · TMDB {m.r.toFixed(1)}</p><p>{m.o}</p></div>)}
      <button className={s.primary} onClick={() => setHelp(false)}>Back to the bout</button>
    </section></div>}
  </main>;
}

function GenrePicker({ genres, locked, busy, onLock }: { genres: string[]; locked: boolean; busy: boolean; onLock: (g: string[]) => void }) {
  const [picks, setPicks] = useState<string[]>([]);
  const doc = picks.includes('Documentary');
  return <>
    <div className={s.chips}>
      {DUO_GENRES.map((g) => <button key={g} className={picks.includes(g) ? 'is-on' : ''} disabled={locked} onClick={() => setPicks((x) => {
        if (g === 'Documentary') return x.includes(g) ? [] : ['Documentary'];
        const base = x.filter((y) => y !== 'Documentary' && !y.startsWith('docs'));
        return x.includes(g) ? base.filter((y) => y !== g) : [...base, g].slice(-2);
      })}>{g}</button>)}
    </div>
    {doc && <div className={s.chips} style={{ marginTop: 8 }}>
      {DOC_SHELVES.map((x) => <button key={x.id} className={picks.includes(x.id) ? 'is-on' : ''} disabled={locked} onClick={() => setPicks(['Documentary', x.id])}>{x.n}</button>)}
    </div>}
    <button className={s.primary} style={{ marginTop: 10 }} disabled={busy || locked || !picks.length} onClick={() => onLock(picks)}>{locked ? 'Genres locked ✓' : 'Lock my genres ✓'}</button>
  </>;
}

function ActorSlot({ room, seat, mine, busy, onSearch, onPick, actors }: { room: PublicDuo; seat: number; mine: boolean; busy: boolean; onSearch: (q: string) => Promise<{ id: number; name: string; known: string }[]>; onPick: (id: number, name: string) => void; actors?: ({ id: number; name: string } | null)[] }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: number; name: string; known: string }[]>([]);
  const chosen = (actors ?? room.pairs?.actors)?.[seat] || null;
  useEffect(() => {
    const t = setTimeout(async () => { if (q.trim().length >= 2) setHits(await onSearch(q)); else setHits([]); }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return <div className={s.qrWrap} style={{ textAlign: 'left' }}>
    <small>{room.seats[seat]?.name || 'Player ' + (seat + 1)}{mine ? ' · YOU' : ''}</small>
    {chosen ? <b>🎭 {chosen.name}</b> : mine ? <>
      <input aria-label={'Actor for ' + (room.seats[seat]?.name || 'player ' + (seat + 1))} placeholder="Search an actor…" maxLength={60} value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((h) => <button key={h.id} disabled={busy} onClick={() => onPick(h.id, h.name)}><b>{h.name}</b> <i>{h.known}</i></button>)}
      {q.trim().length >= 2 && hits.length === 0 && <small>No matches yet. Keep typing a surname.</small>}
    </> : <b>Choosing…</b>}
    {chosen && mine && <small>Locked. Wrong pick? Choose another before the deal:</small>}
    {chosen && mine && <>
      <input aria-label="Change actor" placeholder="Search a different actor…" maxLength={60} value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((h) => <button key={h.id} disabled={busy} onClick={() => onPick(h.id, h.name)}><b>{h.name}</b> <i>{h.known}</i></button>)}
    </>}
  </div>;
}

function WagerBox({ busy, locked, partnerLocked, partner, onLock, max = 10, noun = 'wager' }: { busy: boolean; locked: boolean; partnerLocked: boolean; partner: string; onLock: (amount: number) => void; max?: number; noun?: string }) {
  const [n, setN] = useState(0);
  return <>
    <div className={s.row} style={{ justifyContent: 'center' }}>
      <button aria-label="Less" disabled={busy || locked || n <= 0} onClick={() => setN(n - 1)}>−</button>
      <b style={{ fontSize: 28, minWidth: 60, textAlign: 'center' }}>{n}</b>
      <button aria-label="More" disabled={busy || locked || n >= max} onClick={() => setN(n + 1)}>+</button>
    </div>
    <button className={s.primary} disabled={busy || locked} onClick={() => onLock(n)}>{locked ? noun + ' locked ✓' : 'Lock ' + noun + ' of ' + n + (noun === 'bid' ? ' chips' : '') + ' ✓'}</button>
    <small>{partnerLocked ? partner + ' has wagered.' : 'Waiting for ' + partner + '…'} Zero is a respectable bet.</small>
  </>;
}

function BidBox({ busy, locked, partnerLocked, partner, chips, mine, onLock }: { busy: boolean; locked: boolean; partnerLocked: boolean; partner: string; chips: number; mine: { idx: number; t: string; sc: number; src: string }[]; onLock: (chips: number, backing: number[]) => void }) {
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (idx: number) => setPicked((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]));
  const sum = mine.filter((x) => picked.includes(x.idx)).reduce((a, x) => a + x.sc, 0);
  const tmdb = mine.filter((x) => picked.includes(x.idx) && x.src !== 'RT');
  return <>
    <span>BACK YOUR BID · TAP YOUR BANKED FILMS</span>
    {mine.length === 0 && <p className={s.note}>Nothing banked yet — chips only this time.</p>}
    {mine.map((x) => <button key={x.idx} disabled={busy || locked} className={picked.includes(x.idx) ? 'is-on' : ''} style={{ textAlign: 'left' }} onClick={() => toggle(x.idx)}><b>{x.t}</b>{' · '}<i>{x.src} {x.sc}{picked.includes(x.idx) ? ' · backing ✓' : ''}</i></button>)}
    <div className={s.row} style={{ justifyContent: 'center' }}>
      <button aria-label="Less" disabled={busy || locked || n <= 0} onClick={() => setN(n - 1)}>−</button>
      <b style={{ fontSize: 28, minWidth: 60, textAlign: 'center' }}>{n}</b>
      <button aria-label="More" disabled={busy || locked || n >= chips} onClick={() => setN(n + 1)}>+</button>
    </div>
    <p className={s.note}>Bid power: {sum} from {picked.length} film{picked.length === 1 ? '' : 's'} + {n} chips = <b>{sum + n}</b></p>
    {tmdb.length > 0 && <small>Heads-up: {tmdb.map((x) => x.t).join(', ')} {tmdb.length === 1 ? 'has' : 'have'} no RT listing — the TMDB audience score stands in, marked TMDB above.</small>}
    <button className={s.primary} disabled={busy || locked} onClick={() => onLock(n, picked)}>{locked ? 'Bid locked ✓' : 'Lock bid of ' + (sum + n) + ' ✓'}</button>
    <small>{partnerLocked ? partner + ' has bid.' : 'Waiting for ' + partner + '…'} A tie keeps the claim.</small>
  </>;
}

function PitchBox({ busy, mine, partner, partnerDone, onLock }: { busy: boolean; mine: boolean; partner: string; partnerDone: boolean; onLock: (text: string) => void }) {
  const [t, setT] = useState('');
  return <section className={s.gameCard}>
    <span>THE FINAL PITCH · SECRET UNTIL BOTH ARE IN</span>
    <h2>Why should it be your film?</h2>
    <p>One line to the room. Say anything — hype your favourite, oversell it, bluff. The totals are then revealed, and the winner picks tonight’s film from either collection.</p>
    {mine
      ? <p className={s.note}>Your pitch is in. {partnerDone ? partner + ' has pitched too. The totals…' : 'Waiting for ' + partner + '…'}</p>
      : <>
        <textarea aria-label="Your pitch" maxLength={240} rows={3} placeholder="One line. Make them want it…" value={t} onChange={(e) => setT(e.target.value)} />
        <button className={s.primary} disabled={busy || !t.trim()} onClick={() => onLock(t)}>Lock my pitch ✓</button>
        <small>{partnerDone ? partner + ' has pitched.' : 'Waiting for ' + partner + '…'}</small>
      </>}
  </section>;
}

function JoinWithCode({ name, onJoined }: { name: string; onJoined: (code: string, token: string) => void }) {
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    const code = c.trim().toUpperCase();
    if (!/^[A-Z2-9]{8}$/.test(code)) { setErr('The code is 8 letters and numbers, shown big on the TV.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/duo/' + code + '?spectate=1', { cache: 'no-store' });
      if (!r.ok) throw Error('No Duo Night room with that code.');
      const token = secret();
      const j = await fetch('/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': token }, body: JSON.stringify({ type: 'join', name: name.trim() || 'Player', round: 0, actionId: secret().slice(0, 32) }) });
      const jd = await j.json();
      if (!j.ok) throw Error(jd.error === 'Invalid invite' || jd.error === 'Both seats are taken.' ? jd.error : 'That room needs its invite link. Ask the host to share it.');
      localStorage.setItem('movietime-duo:' + code, JSON.stringify({ token, invite: '' }));
      localStorage.setItem('cs-name', name.trim() || 'Player');
      history.replaceState({}, '', '/duo#room=' + code);
      onJoined(code, token);
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not join. Try again.'); setBusy(false); }
  }
  return <div style={{ marginTop: 12, borderTop: '1px solid #5b3a8f', paddingTop: 10 }}>
    <label>JOIN FROM THE TV CODE<input aria-label="Room code from the TV" maxLength={8} placeholder="8-LETTER CODE" value={c} onChange={(e) => setC(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center' }} /></label>
    <button disabled={busy} onClick={go}>{busy ? 'Joining…' : 'Take a seat →'}</button>
    {err && <small role="alert">{err}</small>}
  </div>;
}
