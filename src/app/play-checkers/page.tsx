'use client';
// BUILD 166: checkers vs Chester / vs a friend (pass-and-play). Raw skeleton, flagged untested until verified live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PEER_CONFIG } from '@/lib/p2p';
import { initial, legalMoves, apply, other, count, chooseMove, chooseRoadMove, gradeMove, moveText, boardKey, sqName, type Board, type CMove, type Side, type Grade } from '@/lib/checkers';
import { CK_DEPTH, CK_SLIP, CK_ROAD_MAX, getCkRoad, setCkRoad } from '@/games/checkers/road';

type Mode = 'chester' | 'friend' | 'duel';
type Level = 'BEGINNER' | 'CASUAL' | 'CLUB' | 'SHARP';
const TAUNTS: Record<string, string[]> = {
  crown: ['A king! Fancy hat. Still can be trapped.', 'Crowned. Do not let it go to your head.', 'Royalty arrives. I will make it pay rent.'],
  capture: ['Mandatory means mandatory, my friend.', 'Hop. Hop. Gone.', 'Delicious. Forced captures are my love language.'],
  good: ['Clean. I felt that.', 'Annoyingly accurate.', 'Okay, that was neat.'],
  bad: ['Oh dear. I will take that gift.', 'That left a gap you could drive a bus through.', 'Bold. Wrong, but bold.'],
  combo2: ['DOUBLE JUMP! Hop hop!', 'Two for one. The bank is closed.'],
  combo3: ['TRIPLE JUMP! Somebody call the fire brigade!', 'Three pieces, one move. Ridiculous.'],
  combo4: ['MEGA CHAIN! That is not checkers, that is parkour!'],
  clap: ['Fine, you earned that one. Watch this.', 'Nice. Now let me answer in my own language.', 'Okay okay, point taken. My turn.'],
  huff: ['HUFF! You left a piece hanging, did you not see it?', 'Huff! Hanging pieces are free snacks.'],
  start: ['Red moves first. Try not to hang anything in move two.', 'Eight by eight, no mercy, forced captures. Go.'],
};
const lastPick: Record<string, number> = {};
const pick = (k: string, seed: number) => { const a = TAUNTS[k]; let i = (seed * 7 + k.length) % a.length; if (a.length > 1 && lastPick[k] === i) i = (i + 1) % a.length; lastPick[k] = i; return a[i]; };
let actx: AudioContext | null = null;
function sfx(kind: 'move' | 'cap' | 'crown' | 'combo' | 'bad') {
  try {
    if (typeof window === 'undefined') return; const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return; actx ||= new AC(); if (actx.state === 'suspended') void actx.resume();
    const t0 = actx.currentTime; const seq: [number, number, number][] = kind === 'crown' ? [[523, 0, .12], [659, .1, .12], [784, .2, .12], [1047, .3, .3]] : kind === 'combo' ? [[330, 0, .08], [440, .07, .08], [554, .14, .08], [740, .21, .2]] : kind === 'cap' ? [[220, 0, .09], [140, .05, .12]] : kind === 'bad' ? [[200, 0, .18], [150, .12, .25]] : [[300, 0, .06]];
    for (const [f, d, l] of seq) { const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0 + d); g.gain.exponentialRampToValueAtTime(.18, t0 + d + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + l); o.connect(g); g.connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + l + .02); }
  } catch { /* audio is optional */ }
}
const GRADE_ICON: Record<Grade, string> = { BRILLIANT: '💎', STRONG: '🎯', SOLID: '👍', SHAKY: '😬', BLUNDER: '🚨' };

export default function PlayCheckers() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('chester');
  const [level, setLevel] = useState<Level>('CASUAL');
  const [roadNote, setRoadNote] = useState('');
  const [roadLv, setRoadLv] = useState<number | null>(null);
  const [bd, setBd] = useState<Board>(initial());
  const [ids, setIds] = useState<number[]>(() => initial().map((p, i) => (p === '.' ? -1 : i)));
  const [turn, setTurn] = useState<Side>('r');
  const [sel, setSel] = useState<number | null>(null);
  const [ghostOn, setGhostOn] = useState(false);
  const [ghost, setGhost] = useState<CMove | null>(null);
  const [busy, setBusy] = useState(false);
  const [dying, setDying] = useState<{ sq: number; id: number; p: string }[]>([]);
  const [last, setLast] = useState<number[]>([]);
  const [hud, setHud] = useState<{ grade: Grade | 'IDLE'; title: string; l1: string; l2: string }>({ grade: 'IDLE', title: 'YOUR MOVE', l1: 'Red moves first. Captures are forced.', l2: '' });
  const [tug, setTug] = useState(50);
  const [over, setOver] = useState<string | null>(null);
  const [hint, setHint] = useState<CMove | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [mySide, setMySide] = useState<Side>('r');
  const [duelStatus, setDuelStatus] = useState<'idle' | 'waiting' | 'connected' | 'failed'>('idle');
  const [invite, setInvite] = useState<{ room: string; url: string; host: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [streak, setStreak] = useState(0);
  const connRef = useRef<{ send: (d: unknown) => void } | null>(null);
  const playRef = useRef<(m: CMove, side: Side, before: Board) => Promise<Board>>(async (_m, _s, b) => b);
  const turnRef = useRef<Side>('r');
  const [plies, setPlies] = useState(0);
  const quiet = useRef(0);
  const seen = useRef<Record<string, number>>({});
  const seed = useRef(0);
  const lastGrade = useRef<Grade | null>(null);
  const bdRef = useRef(bd); bdRef.current = bd;

  const legal = useMemo(() => (over ? [] : legalMoves(bd, turn)), [bd, turn, over]);
  const forced = legal.length > 0 && legal[0].caps.length > 0;
  const targetsOf = useMemo(() => (sel === null ? [] : legal.filter((m) => m.from === sel)), [legal, sel]);
  const mine = (s: Side) => mode === 'friend' || (mode === 'duel' ? s === mySide : s === 'r');
  const c = count(bd, 'r'), d = count(bd, 'b');

  const updateTug = (b: Board) => { const e = count(b, 'r'), f = count(b, 'b'); const v = (e.men + e.kings * 1.6) - (f.men + f.kings * 1.6); setTug(Math.max(6, Math.min(94, 50 + v * 7))); };

  const play = useCallback(async (m: CMove, side: Side, before: Board) => {
    setBusy(true); setSel(null); setGhost(null); setHint(null);
    let cur = before.slice(); let curIds = ids.slice(); const piece = cur[m.from];
    for (let k = 1; k < m.path.length; k++) {
      const from = m.path[k - 1], to = m.path[k]; const cap = m.caps[k - 1];
      const id = curIds[from]; curIds[from] = -1; curIds[to] = id; cur[to] = cur[from]; cur[from] = '.';
      if (cap !== undefined && m.caps.length) { setDying((x) => [...x, { sq: cap, id: curIds[cap], p: cur[cap] }]); curIds[cap] = -1; cur[cap] = '.'; }
      setBd(cur.slice()); setIds(curIds.slice()); setLast([m.path[0], to]); sfx(cap !== undefined && m.caps.length ? 'cap' : 'move');
      await new Promise((r) => setTimeout(r, 280));
    }
    if (m.crown) { cur[m.to] = piece === 'r' ? 'R' : 'B'; sfx('crown'); setBanner('👑 KING ME!'); setTimeout(() => setBanner(null), 1100); }
    else if (m.caps.length >= 2) { sfx('combo'); setBanner(m.caps.length >= 4 ? `🔥 ${m.caps.length}-CHAIN!!` : m.caps.length === 3 ? '💥 TRIPLE JUMP!' : '⚡ DOUBLE JUMP!'); setShake(true); setTimeout(() => { setBanner(null); setShake(false); }, 1100); }
    setBd(cur); setDying([]); updateTug(cur);
    const nxt = other(side); setTurn(nxt); turnRef.current = nxt; setPlies((p) => p + 1);
    quiet.current = m.caps.length || piece === 'r' || piece === 'b' ? 0 : quiet.current + 1;
    const key = boardKey(cur, nxt); seen.current[key] = (seen.current[key] || 0) + 1;
    setLog((l) => [...l.slice(-30), `${side === 'r' ? 'Red' : 'Black'} ${moveText(m)}`]);
    const moves = legalMoves(cur, nxt);
    if (!moves.length) { setOver(`${side === 'r' ? 'Red' : 'Black'} wins - ${other(side) === 'r' ? 'Red' : 'Black'} has no moves`); }
    else if (quiet.current >= 80) setOver('Draw - 40 moves each with no capture or man move');
    else if (seen.current[key] >= 3) setOver('Draw - same position three times');
    setBusy(false); return cur;
  }, [ids]);
  playRef.current = play;

  const commit = useCallback(async (m: CMove) => {
    const before = bdRef.current; const side = turn;
    let g: ReturnType<typeof gradeMove> | null = null;
    if (mine(side)) { g = gradeMove(before, side, m); seed.current++; }
    if (mode === 'duel') { try { connRef.current?.send({ type: 'move', path: m.path, caps: m.caps, crown: m.crown, from: m.from, to: m.to }); } catch {} }
    const after = await play(m, side, before);
    if (g) {
      setStreak((x) => (g!.grade === 'SHAKY' || g!.grade === 'BLUNDER' ? 0 : x + 1)); if (g.grade === 'SHAKY' || g.grade === 'BLUNDER') sfx('bad');
      lastGrade.current = g.grade;
      const bestTxt = g.best ? moveText(g.best) : '';
      const kind = m.crown ? 'crown' : m.caps.length >= 4 ? 'combo4' : m.caps.length === 3 ? 'combo3' : m.caps.length === 2 ? 'combo2' : (g.grade === 'SHAKY' || g.grade === 'BLUNDER') ? (legalMoves(after, other(side))[0]?.caps.length ? 'huff' : 'bad') : m.caps.length ? 'capture' : 'good';
      setHud({ grade: g.grade, title: g.grade === 'BLUNDER' ? 'COSTLY MISTAKE' : g.grade === 'BRILLIANT' ? 'BRILLIANT SHOT' : g.grade === 'SHAKY' ? 'SMALL SLIP' : 'CLEAN MOVE',
        l1: `${GRADE_ICON[g.grade]} You played ${moveText(m)}${m.caps.length > 1 ? ` (${m.caps.length}-piece jump!)` : m.caps.length ? ' (capture)' : ''}${m.crown ? ' and crowned a king' : ''}.`,
        l2: g.grade === 'SHAKY' || g.grade === 'BLUNDER' ? `🤖 Engine preferred ${bestTxt}. It loses about ${g.loss.toFixed(1)} of a man. ${pick(kind, seed.current)}` : `🤖 ${pick(kind, seed.current)}` });
    }
    return after;
  }, [turn, play, mode]);

  // Chester's turn
  useEffect(() => {
    if (!started || mode !== 'chester' || turn !== 'b' || over || busy) return;
    const t = setTimeout(async () => {
      const m = roadLv ? chooseRoadMove(bdRef.current, 'b', CK_DEPTH[roadLv - 1], CK_SLIP[roadLv - 1]) : chooseMove(bdRef.current, 'b', level); if (!m) return;
      const lg = lastGrade.current; const after = await play(m, 'b', bdRef.current); void after;
      const line = m.crown ? pick('crown', seed.current++) : m.caps.length >= 3 ? pick('combo3', seed.current++) : m.caps.length >= 2 ? pick('combo2', seed.current++) : m.caps.length ? pick('capture', seed.current++) : (lg === 'STRONG' || lg === 'BRILLIANT') ? pick('clap', seed.current++) : '';
      if (line) setHud((h) => ({ ...h, l2: `😈 Chester: ${line}` }));
    }, 650);
    return () => clearTimeout(t);
  }, [started, mode, turn, over, busy, level, roadLv, play]);

  const tap = (i: number) => {
    if (busy || over || !mine(turn)) return;
    const mv = targetsOf.find((m) => m.to === i);
    if (mv) { if (ghostOn && !(ghost && ghost.to === i && ghost.from === mv.from)) { setGhost(mv); return; } void commit(mv); return; }
    const p = bd[i]; const own = (turn === 'r' && (p === 'r' || p === 'R')) || (turn === 'b' && (p === 'b' || p === 'B'));
    if (own && legal.some((m) => m.from === i)) { setSel(i); setGhost(null); }
    else if (own && forced) setHud({ grade: 'SHAKY', title: 'CAPTURE IS FORCED', l1: '⚠️ You must jump when a jump is available.', l2: '🤖 Pieces that can capture are highlighted.' });
    else { setSel(null); setGhost(null); }
  };

  const reset = () => { const b = initial(); setBd(b); setIds(b.map((p, i) => (p === '.' ? -1 : i))); setTurn('r'); setSel(null); setGhost(null); setOver(null); setHint(null); setLast([]); setLog([]); setPlies(0); quiet.current = 0; seen.current = {}; setTug(50); setHud({ grade: 'IDLE', title: 'YOUR MOVE', l1: pick('start', seed.current++), l2: '' }); };
  const askHint = () => { if (mode === 'duel') return; if (busy || over || !mine(turn)) return; const m = chooseMove(bd, turn, 'SHARP'); if (m) { setHint(m); setSel(m.from); setHud({ grade: 'STRONG', title: 'HINT', l1: `💡 Try the piece on ${sqName(m.from)}.`, l2: m.caps.length ? '🤖 A capture is forced here anyway.' : '🤖 Tap the glowing piece to see where it can go.' }); } };

  useEffect(() => { document.title = 'Checkers vs Chester'; }, []);

  const makeInvite = () => { const room = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)); const o = window.location.origin; setInvite({ room, url: `${o}/play-checkers?mode=duel&room=${room}`, host: `${o}/play-checkers?mode=duel&room=${room}&host=1` }); setCopied(false); };
  const copyInvite = async () => { if (!invite) return; try { await navigator.clipboard.writeText(invite.url); setCopied(true); } catch { setCopied(false); } };
  const shareInvite = async () => { if (!invite) return; try { if (navigator.share) await navigator.share({ title: 'Checkers battle', text: 'Battle me at checkers on Chess-Town', url: invite.url }); else await copyInvite(); } catch { /* cancelled */ } };

  const [duelRoom, setDuelRoom] = useState<{ room: string; host: boolean } | null>(null);
  useEffect(() => { const q = new URLSearchParams(window.location.search); const room = (q.get('room') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24); if (q.get('mode') === 'duel' && room) { const host = q.get('host') === '1'; setMode('duel'); setMySide(host ? 'r' : 'b'); setDuelRoom({ room, host }); setStarted(true); } else if (q.get('mode') === 'chester') { setMode('chester'); const st = q.get('stage'); if (st === 'jump' || st === 'crown') { const e: Board = Array(64).fill('.'); if (st === 'jump') { e[7 * 8 + 0] = 'r'; e[6 * 8 + 1] = 'b'; e[4 * 8 + 3] = 'b'; e[1 * 8 + 6] = 'b'; e[0 * 8 + 1] = 'b'; } else { e[1 * 8 + 2] = 'r'; e[7 * 8 + 6] = 'r'; e[0 * 8 + 5] = 'b'; e[6 * 8 + 3] = 'b'; } setBd(e); setIds(e.map((p2, i) => (p2 === '.' ? -1 : i))); setStarted(true); } } else if (q.get('mode') === 'battle') { setMode('duel'); makeInvite(); } else if (q.get('road') === '1') { setMode('chester'); setRoadLv(getCkRoad()); setStarted(true); } }, []);
  const advanced = useRef(false);
  useEffect(() => { if (!over || !roadLv || advanced.current) return; advanced.current = true; if (/^Red wins/.test(over) && roadLv < CK_ROAD_MAX) { setCkRoad(roadLv + 1); setRoadNote(`Level ${roadLv} cleared. Next: level ${roadLv + 1}.`); } else if (/^Red wins/.test(over)) setRoadNote('KING HENRY IS DEFEATED. You rule the board.'); else setRoadNote('Not this time. Same level, go again.'); }, [over, roadLv]);
  useEffect(() => {
    if (!duelRoom) return;
    let dead = false; const timers: ReturnType<typeof setTimeout>[] = [];
    type Conn = { on: (e: string, cb: (a?: unknown) => void) => void; send: (d: unknown) => void };
    type DPeer = { on: (e: string, cb: (a?: unknown) => void) => void; destroy: () => void; connect: (id: string) => Conn };
    let peer: DPeer | null = null; let connected = false;
    const wire = (conn: Conn) => {
      connRef.current = conn;
      conn.on('open', () => { if (dead) return; connected = true; setDuelStatus('connected'); setHud({ grade: 'IDLE', title: duelRoom.host ? 'FRIEND JOINED - YOUR MOVE' : 'CONNECTED - RED MOVES FIRST', l1: duelRoom.host ? 'You are Red. Make the first move.' : 'You are Black. Wait for Red.', l2: '' }); });
      conn.on('data', (data?: unknown) => {
        const d = data as { type?: string; path?: number[]; from?: number; to?: number } | undefined; if (!d) return;
        if (d.type === 'move' && Array.isArray(d.path)) { const side = turnRef.current; const m = legalMoves(bdRef.current, side).find((x) => x.from === d.from && x.to === d.to && x.path.join() === d.path!.join()); if (m) void playRef.current(m, side, bdRef.current); }
        if (d.type === 'reset') reset();
      });
      conn.on('close', () => { if (!dead) setDuelStatus('failed'); });
    };
    setDuelStatus('waiting');
    void import('peerjs').then(({ default: Peer }) => {
      if (dead) return; const id = `chess-town-checkers-${duelRoom.room}`;
      if (duelRoom.host) {
        let tries = 0; const open = () => { if (dead) return; tries++; try { peer = new Peer(id, PEER_CONFIG as never) as unknown as DPeer; peer.on('connection', (c?: unknown) => wire(c as Conn)); peer.on('error', (err?: unknown) => { if (dead) return; const t = (err as { type?: string })?.type || ''; if (t === 'unavailable-id' && tries < 40) { try { peer?.destroy(); } catch {} timers.push(setTimeout(open, 3000)); return; } setDuelStatus('failed'); }); } catch { if (tries < 40) timers.push(setTimeout(open, 3000)); } }; open();
      } else {
        let tries = 0; const knock = () => { if (dead || !peer || connected) return; tries++; try { wire(peer.connect(id)); } catch {} timers.push(setTimeout(knock, 3000)); };
        peer = new Peer(PEER_CONFIG as never) as unknown as DPeer; peer.on('open', knock); peer.on('error', (err?: unknown) => { if (dead) return; const t = (err as { type?: string })?.type || ''; if (t === 'peer-unavailable' && tries < 60) return; setDuelStatus('failed'); });
      }
    }).catch(() => { if (!dead) setDuelStatus('failed'); });
    return () => { dead = true; timers.forEach(clearTimeout); try { peer?.destroy(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelRoom]);

  if (!started) return (
    <main className="ck-root ck-start">
      <style>{CSS}</style>
      <h1>🏁 CHECKERS</h1><p className="ck-sub">8x8 American rules. Forced captures, multi-jumps, kings.</p>
      <div className="ck-row"><button className={mode !== 'duel' ? 'on' : ''} onClick={() => setMode('chester')}>🤖 Play Chester</button><button className={mode === 'duel' ? 'on' : ''} onClick={() => { setMode('duel'); if (!invite) makeInvite(); }}>⚔️ Battle a friend</button></div>
      {mode !== 'duel' && <><div className="ck-row">{(['BEGINNER', 'CASUAL', 'CLUB', 'SHARP'] as Level[]).map((l) => <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l}</button>)}</div>
        <button className="ck-go" onClick={() => { setStarted(true); reset(); }}>START</button>
        <button className="ck-link" onClick={() => { setMode('friend'); setStarted(true); reset(); }}>or pass-and-play on this phone</button></>}
      {mode === 'duel' && invite && <div className="ck-invite"><p>Send this link to your friend. You play Red, they play Black.</p>
        <input readOnly value={invite.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
        <div className="ck-row"><button onClick={() => void copyInvite()}>{copied ? '✅ Copied' : '📋 Copy link'}</button><button onClick={() => void shareInvite()}>📤 Share</button><button onClick={makeInvite}>🔄 New room</button></div>
        <button className="ck-go" onClick={() => { window.location.href = invite.host; }}>OPEN MY ROOM</button>
        <p className="ck-tiny">Keep this page open until your friend joins. Live phone-to-phone, no account needed.</p></div>}
      <p className="ck-tiny">Raw build, being verified.</p>
    </main>);

  const arrowSq = hint ? hint.to : null;
  return (
    <main className="ck-root">
      <style>{CSS}</style>
      <header className="ck-head"><span>🏁 CHECKERS</span><span>🔴 {c.men + c.kings} v ⚫ {d.men + d.kings}{streak >= 3 ? ` 🔥${streak}` : ''}</span><button onClick={() => setGhostOn((v) => !v)} aria-pressed={ghostOn}>🔍 Preview {ghostOn ? 'on' : 'off'}</button></header>
      <div className="ck-tug" title="material tug of war"><i style={{ width: `${tug}%` }} /></div>
      <div className={`ck-board ${shake ? 'ck-shake' : ''}`} style={{ ['--n' as string]: 8 }}>
        {Array.from({ length: 64 }, (_, i) => { const r = i >> 3, cc = i & 7; const dark = (r + cc) % 2 === 1; const isT = targetsOf.some((m) => m.to === i); const canSel = legal.some((m) => m.from === i) && mine(turn) && forced;
          return <div key={i} className={`ck-sq ${dark ? 'dk' : 'lt'} ${last.includes(i) ? 'last' : ''} ${isT ? 'tgt' : ''} ${sel === i ? 'sel' : ''} ${canSel ? 'must' : ''} ${arrowSq === i ? 'hintsq' : ''}`} style={{ gridRow: r + 1, gridColumn: cc + 1 }} onClick={() => tap(i)} />; })}
        {bd.map((p, i) => p === '.' ? null : <div key={ids[i]} className={`ck-pc ${p === 'r' || p === 'R' ? 'red' : 'blk'} ${p === 'R' || p === 'B' ? 'king' : ''}`} style={{ ['--x' as string]: i & 7, ['--y' as string]: i >> 3 }} onClick={() => tap(i)}>{p === 'R' || p === 'B' ? '♛' : ''}</div>)}
        {dying.map((x) => <div key={'d' + x.id} className={`ck-pc dead ${x.p === 'r' || x.p === 'R' ? 'red' : 'blk'}`} style={{ ['--x' as string]: x.sq & 7, ['--y' as string]: x.sq >> 3 }} />)}
        {banner && <div className="ck-banner">{banner}</div>}
        {ghost && <div className={`ck-pc ghost ${turn === 'r' ? 'red' : 'blk'}`} style={{ ['--x' as string]: ghost.to & 7, ['--y' as string]: ghost.to >> 3 }} onClick={() => void commit(ghost)}>{ghost.crown ? '♛' : ''}</div>}
      </div>
      <section className={`ck-hud ck-hud--${hud.grade.toLowerCase()}`}>
        <div className="ck-hud-t">{hud.title}{mode === 'chester' && turn === 'b' && !over ? ' - Chester is thinking…' : ''}{mode === 'duel' ? (duelStatus === 'waiting' ? ' - waiting for your friend…' : duelStatus === 'failed' ? ' - connection dropped' : turn !== mySide && !over ? ' - friend is thinking…' : '') : ''}</div>
        <p>{hud.l1}</p>{hud.l2 && <p>{hud.l2}</p>}
        {ghost && <p className="ck-ghosttip">🔍 Preview: tap the highlighted square again to confirm.</p>}
        <div className="ck-pills">{mode !== 'duel' && <button onClick={askHint}>💡 Hint</button>}<button onClick={() => { if (mode === 'duel') { try { connRef.current?.send({ type: 'reset' }); } catch {} } reset(); }}>🔄 Rematch</button><button onClick={() => { if (mode === 'duel') window.location.href = '/play-checkers'; else setStarted(false); }}>🏠 Menu</button>{forced && mine(turn) && !over && <span className="ck-forced">⚠️ Jump is forced</span>}</div>
      </section>
      {over && <div className="ck-over"><div><h2>{over}</h2><p>{plies} plies played.</p>{roadLv ? <><p>{roadNote}</p><a className="ck-go" href="/road/checkers" style={{ display: 'inline-block', textDecoration: 'none', color: '#04120a' }}>BACK TO THE MAP</a></> : <><button onClick={() => { advanced.current = false; reset(); }}>Rematch</button> <button onClick={() => setStarted(false)}>Menu</button></>}</div></div>}
    </main>
  );
}

const CSS = `
.ck-root{height:100dvh;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 8px max(8px,env(safe-area-inset-bottom));background:#0b1220;color:#e7eefc;font-family:system-ui,sans-serif;overflow:hidden;box-sizing:border-box}
.ck-start{justify-content:center;text-align:center}.ck-start h1{font-size:34px;margin:0}.ck-sub{opacity:.8;margin:0 0 8px}.ck-tiny{opacity:.6;font-size:12px}
.ck-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.ck-root button{background:#16233d;color:#e7eefc;border:1px solid #2c4170;border-radius:12px;padding:10px 14px;font-weight:700;font-size:14px}
.ck-root button.on{background:#0e7490;border-color:#22d3ee}.ck-go{background:#10b981!important;border-color:#34d399!important;font-size:18px!important;padding:12px 38px!important;margin-top:10px}
.ck-head{display:flex;justify-content:space-between;align-items:center;width:min(94vw,49dvh,640px);min-height:40px;font-weight:800;gap:8px}.ck-head button{padding:6px 10px}
.ck-tug{width:min(94vw,49dvh,640px);height:8px;border-radius:6px;background:#1f2937;overflow:hidden}.ck-tug i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);transition:width .4s}
.ck-board{position:relative;width:min(94vw,49dvh,640px);aspect-ratio:1;display:grid;grid-template:repeat(8,1fr)/repeat(8,1fr);border:3px solid #3b2a1a;border-radius:8px;overflow:hidden;flex:none;touch-action:manipulation}
.ck-sq.dk{background:#6b4423}.ck-sq.lt{background:#e8d3a8}.ck-sq.last{box-shadow:inset 0 0 0 100px rgba(250,204,21,.25)}.ck-sq.tgt{box-shadow:inset 0 0 0 100px rgba(34,211,238,.38)}.ck-sq.sel{box-shadow:inset 0 0 0 100px rgba(16,185,129,.45)}.ck-sq.must{box-shadow:inset 0 0 0 100px rgba(245,158,11,.35)}.ck-sq.hintsq{animation:ckp 1s infinite}
@keyframes ckp{50%{box-shadow:inset 0 0 0 100px rgba(34,211,238,.6)}}
.ck-pc{position:absolute;left:calc(var(--x)*12.5%);top:calc(var(--y)*12.5%);width:12.5%;height:12.5%;display:flex;align-items:center;justify-content:center;transition:left .26s ease,top .26s ease;pointer-events:auto;font-size:min(5vw,2.6dvh);color:#fde68a}
.ck-pc::before{content:'';position:absolute;inset:11%;border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 -3px 0 rgba(0,0,0,.3);z-index:0}
.ck-pc.red::before{background:radial-gradient(circle at 35% 30%,#fca5a5,#dc2626 60%,#7f1d1d)}.ck-pc.blk::before{background:radial-gradient(circle at 35% 30%,#6b7280,#1f2937 60%,#030712)}
.ck-pc.king::before{outline:3px solid #fbbf24;animation:ckk 1.6s infinite}.ck-pc.king{z-index:2}.ck-pc>*{z-index:1}
@keyframes ckk{50%{box-shadow:0 0 14px #fbbf24}}
.ck-pc.dead{animation:ckd .3s forwards;pointer-events:none}@keyframes ckd{to{transform:scale(1.6);opacity:0}}
.ck-pc.ghost{opacity:.5;pointer-events:auto;animation:ckg 1s infinite;z-index:3}@keyframes ckg{50%{opacity:.8;transform:scale(1.06)}}
.ck-hud{width:min(94vw,640px);flex:1;min-height:110px;overflow:auto;border-radius:14px;padding:10px 12px;background:#111c33;border:2px solid #334155;box-sizing:border-box}
.ck-hud p{margin:4px 0;font-size:14px;line-height:1.35}.ck-hud-t{font-weight:900;letter-spacing:.04em;font-size:13px}
.ck-hud--brilliant,.ck-hud--strong{border-color:#10b981;background:#062b22}.ck-hud--solid{border-color:#22d3ee}.ck-hud--shaky{border-color:#f59e0b;background:#2b1e05}.ck-hud--blunder{border-color:#ef4444;background:#2b0a0a;animation:cks .4s}
@keyframes cks{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ck-pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}.ck-pills button{padding:6px 10px;font-size:12px}.ck-forced{color:#fbbf24;font-size:12px;font-weight:700}.ck-ghosttip{opacity:.8}
.ck-link{background:none!important;border:none!important;text-decoration:underline;opacity:.8;font-weight:500!important}.ck-invite{display:flex;flex-direction:column;gap:8px;align-items:center;width:min(92vw,420px)}.ck-invite input{width:100%;padding:10px;border-radius:10px;border:1px solid #2c4170;background:#0b1220;color:#e7eefc;font-size:13px;box-sizing:border-box}
.ck-banner{position:absolute;left:0;right:0;top:38%;text-align:center;font-weight:900;font-size:min(9vw,5dvh);color:#fde68a;text-shadow:0 0 18px #f59e0b,0 3px 0 #7c2d12;pointer-events:none;z-index:6;animation:ckb 1.1s forwards}@keyframes ckb{0%{transform:scale(.4);opacity:0}20%{transform:scale(1.15);opacity:1}80%{opacity:1}100%{transform:scale(1) translateY(-20px);opacity:0}}
.ck-shake{animation:cksh .45s}@keyframes cksh{20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,3px)}}
.ck-pc.dead::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid #fde68a;animation:ckr .35s forwards}@keyframes ckr{from{transform:scale(.5);opacity:1}to{transform:scale(2.2);opacity:0}}
.ck-over{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:50;text-align:center}.ck-over>div{background:#111c33;border:2px solid #22d3ee;border-radius:16px;padding:22px}
@media (orientation:landscape) and (min-width:700px){.ck-root{flex-direction:row;flex-wrap:wrap;justify-content:center;align-content:center}.ck-board,.ck-head,.ck-tug{width:min(calc(100dvh - 250px),60vw)}.ck-hud{width:min(34vw,380px);flex:none;max-height:calc(100dvh - 120px)}}
`;
