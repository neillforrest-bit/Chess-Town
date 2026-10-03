'use client';
// BATTLE MODE: Walkout Tunnel lobby (Supabase Realtime Presence), board only when two fighters are
// seated, moves + clocks + results synced over a Realtime broadcast channel. Each phone also keeps a
// local copy so a reload (or a closed opponent tab) does not lose the game.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { createClient } from '@/utils/supabase/client';
import { getStockfishClient } from '@/lib/stockfish';

const START_MS = 10 * 60 * 1000;
type Synced = {
  pgn: string; playerOneTime: number; playerTwoTime: number; playerOneTimeoutUsed: boolean; playerTwoTimeoutUsed: boolean;
  rev: number; result: string | null; drawBy: 0 | 1 | null; rematchBy: 0 | 1 | null; pausedBy: 0 | 1 | null;
};
const FRESH: Synced = { pgn: '', playerOneTime: START_MS, playerTwoTime: START_MS, playerOneTimeoutUsed: false, playerTwoTimeoutUsed: false, rev: 0, result: null, drawBy: null, rematchBy: null, pausedBy: null };
type Peer = { id: string; at: number; seat: 0 | 1 | null };
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const loadChess = (pgn: string) => { const c = new Chess(); if (pgn) { try { c.loadPgn(pgn); } catch { /* keep start */ } } return c; };
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// Deterministic seating: claimed seats stay, unclaimed peers fill free seats by arrival order, the rest watch.
function seatMap(peers: Peer[]): Record<string, 0 | 1 | null> {
  const out: Record<string, 0 | 1 | null> = {};
  const taken = new Set<number>();
  peers.forEach((p) => { if (p.seat !== null && !taken.has(p.seat)) { taken.add(p.seat); out[p.id] = p.seat; } });
  peers.forEach((p) => {
    if (p.id in out) return;
    const free = ([0, 1] as const).find((s) => !taken.has(s));
    if (free === undefined) { out[p.id] = null; return; }
    taken.add(free); out[p.id] = free;
  });
  return out;
}

export default function BattlePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const me = useRef('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [state, setState] = useState<Synced>(FRESH);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const dbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const matchIdRef = useRef('');
  matchIdRef.current = matchId;
  const stamp = useRef(Date.now());
  const trackedSeat = useRef<number | null | undefined>(undefined);
  const joinedAt = useRef(Date.now());
  const chanRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  stateRef.current = state;
  const key = `ct-battle-${matchId}`;

  const apply = useCallback((s: Synced, fromNet: boolean) => {
    if (fromNet && s.rev <= stateRef.current.rev) return;
    stamp.current = Date.now(); stateRef.current = s; setState(s);
    try { localStorage.setItem(key + ':state', JSON.stringify(s)); } catch { /* private mode */ }
  }, [key]);
  const commit = useCallback((patch: Partial<Synced>, event: 'state' | 'pause_game' | 'resume_game' = 'state') => {
    const next = { ...stateRef.current, ...patch, rev: stateRef.current.rev + 1 };
    apply(next, false);
    void chanRef.current?.send({ type: 'broadcast', event, payload: next });
    // Durable copy (table is created by supabase/migrations/20261003_battle_matches.sql). Silent if absent.
    void dbRef.current?.from('battle_matches').upsert({ match_id: matchIdRef.current, state: next, updated_at: new Date().toISOString() }).then(() => undefined, () => undefined);
  }, [apply]);

  useEffect(() => {
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch (e) { setErr((e as Error).message); return; }
    try {
      me.current = sessionStorage.getItem(key + ':me') || uid(); sessionStorage.setItem(key + ':me', me.current);
      const saved = localStorage.getItem(key + ':state'); if (saved) { const s = JSON.parse(saved) as Synced; stateRef.current = s; setState({ ...FRESH, ...s }); stamp.current = Date.now(); }
      const sv = sessionStorage.getItem(key + ':seat'); if (sv === '0' || sv === '1') trackedSeat.current = Number(sv);
    } catch { me.current = me.current || uid(); }
    dbRef.current = sb;
    void sb.from('battle_matches').select('state').eq('match_id', matchId).maybeSingle().then(({ data }) => {
      const remote = data?.state as Synced | undefined;
      if (remote && remote.rev > stateRef.current.rev) apply({ ...FRESH, ...remote }, true);
    }, () => undefined);
    setReady(true);
    const ch = sb.channel(`battle:${matchId}`, { config: { presence: { key: me.current }, broadcast: { self: false } } });
    chanRef.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState() as Record<string, { at: number; seat: 0 | 1 | null }[]>;
      setPeers(Object.entries(st).map(([id, v]) => ({ id, at: v[0]?.at ?? 0, seat: v[0]?.seat ?? null })).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)));
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'pause_game' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'resume_game' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'hello' }, () => { if (stateRef.current.rev > 0) void ch.send({ type: 'broadcast', event: 'state', payload: stateRef.current }); });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ at: joinedAt.current, seat: trackedSeat.current ?? null });
        void ch.send({ type: 'broadcast', event: 'hello', payload: {} });
        if (stateRef.current.rev > 0) void ch.send({ type: 'broadcast', event: 'state', payload: stateRef.current });
      }
    });
    return () => { void sb.removeChannel(ch); };
  }, [matchId, key, apply]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);

  const seats = useMemo(() => seatMap(peers), [peers]);
  const seat = ready && me.current in seats ? seats[me.current] : null;
  // Claim and remember my seat so a reload keeps it.
  useEffect(() => {
    if (seat === null || trackedSeat.current === seat) return;
    trackedSeat.current = seat;
    try { sessionStorage.setItem(key + ':seat', String(seat)); } catch { /* ignore */ }
    void chanRef.current?.track({ at: joinedAt.current, seat });
  }, [seat, key]);

  const seated = peers.filter((p) => seats[p.id] !== null && seats[p.id] !== undefined).length;
  const started = state.rev > 0 && state.pgn !== '' || state.result !== null;
  const connected = seated >= 2 || (started && seat !== null);
  const opponentHere = seated >= 2;
  const myColor = seat === 1 ? 'b' : 'w';
  const chess = useMemo(() => loadChess(state.pgn), [state.pgn]);
  const turn = chess.turn();
  const over = chess.isGameOver() || state.result !== null;
  const paused = state.pausedBy !== null;
  const running = connected && state.pgn !== '' && !over && !paused;
  const elapsed = running ? now - stamp.current : 0;
  const liveOne = state.playerOneTime - (turn === 'w' && running ? elapsed : 0);
  const liveTwo = state.playerTwoTime - (turn === 'b' && running ? elapsed : 0);
  const myTurn = connected && seat !== null && turn === myColor && !over;
  const mine = seat === 1 ? liveTwo : liveOne;
  const theirs = seat === 1 ? liveOne : liveTwo;

  // Flag fall: whoever's clock hit zero loses. Every phone checks, identical commits are harmless (rev gate).
  useEffect(() => {
    if (!running || seat === null) return;
    if (liveOne <= 0) commit({ result: 'timeout:w', playerOneTime: 0 });
    else if (liveTwo <= 0) commit({ result: 'timeout:b', playerTwoTime: 0 });
  }, [running, liveOne, liveTwo, seat, commit]);

  // ---- Stage 2: arena swing. Each phone runs its own Stockfish on the new position (white-absolute pawns).
  const bestRefEarly = null; void bestRefEarly;
  const evalRef = useRef<{ pgn: string; pawns: number } | null>(null);
  const [swing, setSwing] = useState<{ n: number; text: string; good: boolean } | null>(null);
  const [pawnsNow, setPawnsNow] = useState<number | null>(null);
  useEffect(() => {
    if (!connected || !state.pgn) return;
    let dead = false;
    const fen = loadChess(state.pgn).fen();
    const pgn = state.pgn;
    void getStockfishClient().analyzeForDisplay(fen).then((a) => {
      if (dead) return;
      const stm = fen.split(' ')[1] === 'w' ? 1 : -1;
      const raw = a.mate !== null ? (a.mate > 0 ? 10 : -10) : Math.max(-10, Math.min(10, (a.score ?? 0) / 100));
      const pawns = raw * stm;
      setPawnsNow(pawns);
      try { const c = loadChess(pgn); const u = a.pv[0]; const m = u ? c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) : null; bestRef.current = m ? m.san : null; } catch { bestRef.current = null; }
      const prev = evalRef.current;
      evalRef.current = { pgn, pawns };
      if (!prev || prev.pgn === pgn || pgn.length < prev.pgn.length) return;
      const d = pawns - prev.pawns;
      if (Math.abs(d) > 2.0) {
        const goodForWhite = d > 0;
        const good = goodForWhite === (myColorRef.current === 'w');
        setSwing({ n: Date.now(), good, text: good ? '[THE CROWD ROARS]' : '[THE ARENA GOES DEAD SILENT]' });
      }
    }).catch(() => undefined);
    return () => { dead = true; };
  }, [state.pgn, connected]);
  useEffect(() => { if (!swing) return; const t = setTimeout(() => setSwing(null), 2600); return () => clearTimeout(t); }, [swing]);
  const myColorRef = useRef<'w' | 'b'>('w');
  myColorRef.current = myColor;

  // ---- Stage 3: CALL TIMEOUT. One per player, own turn only, pauses both clocks.
  const myTimeoutUsed = seat === 1 ? state.playerTwoTimeoutUsed : state.playerOneTimeoutUsed;
  const callTimeout = () => {
    if (seat === null || !myTurn || myTimeoutUsed || paused) return;
    commit({ ...folded(), pausedBy: seat, ...(seat === 1 ? { playerTwoTimeoutUsed: true } : { playerOneTimeoutUsed: true }) }, 'pause_game');
  };
  const resumeBattle = () => { if (seat !== null && state.pausedBy === seat) commit({ pausedBy: null }, 'resume_game'); };
  type Msg = { role: 'user' | 'chester'; text: string };
  const [corner, setCorner] = useState<Msg[]>([]);
  const [cornerBusy, setCornerBusy] = useState(false);
  const [cornerInput, setCornerInput] = useState('');
  const askCorner = useCallback(async (message: string, history: Msg[]) => {
    setCornerBusy(true);
    try {
      const r = await fetch('/api/chester/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'corner-man', message, fen: loadChess(stateRef.current.pgn).fen(), principalVariation: bestRef.current ? [bestRef.current] : [], evaluationAfter: pawnsRef.current === null ? null : Math.round(pawnsRef.current * 100), conversationHistory: history }) });
      const j = await r.json() as { reply?: string };
      setCorner([...history, { role: 'chester', text: j.reply || 'Chester is tying his gloves - ask me again.' }]);
    } catch { setCorner([...history, { role: 'chester', text: 'Chester lost the line for a second - ask me again.' }]); }
    setCornerBusy(false);
  }, []);
  const pawnsRef = useRef<number | null>(null);
  const bestRef = useRef<string | null>(null);
  pawnsRef.current = pawnsNow;
  const openedFor = useRef<number>(-1);
  useEffect(() => {
    if (state.pausedBy === null || state.pausedBy !== seat) { if (state.pausedBy === null) { openedFor.current = -1; setCorner([]); } return; }
    if (openedFor.current === state.rev || corner.length) return;
    openedFor.current = state.rev;
    void askCorner('Timeout called. Give me the one move or plan I must find right now.', []);
  }, [state.pausedBy, state.rev, seat, corner.length, askCorner]);
  const sendCorner = () => {
    const m = cornerInput.trim(); if (!m || cornerBusy) return;
    const h: Msg[] = [...corner, { role: 'user', text: m }]; setCorner(h); setCornerInput(''); void askCorner(m, h);
  };

  const onMove = useCallback((from: string, to: string, promotion?: string) => {
    const s = stateRef.current;
    const c = loadChess(s.pgn);
    if (c.turn() !== myColor || s.result) return;
    const spent = s.pgn ? Date.now() - stamp.current : 0;
    try { c.move({ from, to, promotion: promotion ?? 'q' }); } catch { return; }
    commit({ pgn: c.pgn(), drawBy: null, playerOneTime: myColor === 'w' ? s.playerOneTime - spent : s.playerOneTime, playerTwoTime: myColor === 'b' ? s.playerTwoTime - spent : s.playerTwoTime });
  }, [myColor, commit]);

  const link = typeof window === 'undefined' ? '' : window.location.href;
  const copy = async () => { try { await navigator.clipboard.writeText(`Step into the arena. ${link}`); setCopied(true); } catch { setCopied(false); } };
  const lastMove = (() => { const h = chess.history({ verbose: true }); const m = h[h.length - 1]; return m ? { from: m.from, to: m.to } : null; })();

  // Freeze the running clock into the stored time when the game ends, so both phones show the same final clocks.
  const folded = (): Partial<Synced> => ({ playerOneTime: Math.max(0, liveOne), playerTwoTime: Math.max(0, liveTwo) });
  const resign = () => { if (seat !== null) commit({ ...folded(), result: `resign:${myColor}` }); };
  const offerDraw = () => { if (seat !== null) commit({ drawBy: seat }); };
  const answerDraw = (yes: boolean) => commit(yes ? { ...folded(), result: 'draw:agreed', drawBy: null } : { drawBy: null });
  const rematch = () => {
    if (seat === null) return;
    if (state.rematchBy !== null && state.rematchBy !== seat) commit({ ...FRESH, rev: stateRef.current.rev });
    else commit({ rematchBy: seat });
  };

  const outcome = (() => {
    if (!over) return '';
    const r = state.result;
    const iLost = (c: string) => c === myColor;
    if (r?.startsWith('timeout:')) return iLost(r.slice(8)) ? 'FLAG FALL - you ran out of time.' : 'FLAG FALL - your opponent ran out of time. You win!';
    if (r?.startsWith('resign:')) return iLost(r.slice(7)) ? 'You resigned.' : 'Your opponent resigned. You win!';
    if (r?.startsWith('draw:')) return 'Draw agreed.';
    if (chess.isCheckmate()) return turn === myColor ? 'CHECKMATE - you were mated.' : 'CHECKMATE - you win!';
    return 'Game drawn.';
  })();

  if (err) return <main className="battle-shell"><p className="battle-sub">{err}</p></main>;
  if (ready && peers.length >= 2 && seat === null && seated >= 2) return <main className="battle-shell battle-tunnel">
    <span className="battle-kicker">BATTLE MODE</span>
    <h1 className="battle-title">This arena is full</h1>
    <p className="battle-sub">Two fighters are already in this match. Start your own from the menu.</p>
    <a className="battle-btn" href="/battle">START A NEW BATTLE</a>
  </main>;
  if (!connected) return <main className="battle-shell battle-tunnel">
    <span className="battle-kicker">BATTLE MODE</span>
    <h1 className="battle-title">The Walkout Tunnel</h1>
    <p className="battle-sub">{peers.length < 1 ? 'Connecting...' : 'Waiting for your opponent to walk out...'}</p>
    <div className="battle-dots"><i /><i /><i /></div>
    <button type="button" className="battle-btn" onClick={() => void copy()}>{copied ? 'COPIED - SEND IT TO YOUR OPPONENT' : 'COPY INVITE LINK'}</button>
    <p className="battle-hint">The board appears the moment two fighters are in the tunnel.</p>
  </main>;

  const iCalled = paused && state.pausedBy === seat;
  return <main className={`battle-shell battle-arena${swing ? (swing.good ? ' battle-arena--roar' : ' battle-arena--silent') : ''}`}>
    <div className="battle-glow" aria-hidden="true" />
    {swing && <div key={swing.n} className={`battle-banner ${swing.good ? 'battle-banner--roar' : 'battle-banner--silent'}`}>{swing.text}</div>}
    <div className="battle-clock" data-active={running && turn !== myColor}><span>OPPONENT{opponentHere ? '' : ' (AWAY)'}</span><b>{fmt(theirs)}</b></div>
    <div className="battle-board"><TapBoard fen={chess.fen()} orientation={myColor} locked={!myTurn} lastMove={lastMove} onMove={onMove} /></div>
    <div className="battle-clock" data-active={running && turn === myColor}><span>FORREST 🌲</span><b>{fmt(mine)}</b></div>
    {over ? <>
      <p className="battle-sub battle-outcome">{outcome}</p>
      <button type="button" className="battle-btn" onClick={rematch}>{state.rematchBy !== null && state.rematchBy === seat ? 'WAITING FOR REMATCH...' : state.rematchBy !== null ? 'ACCEPT REMATCH' : 'REMATCH'}</button>
    </> : <div className="battle-actions">
      {state.drawBy !== null && state.drawBy !== seat ? <>
        <span className="battle-sub">Opponent offers a draw</span>
        <button type="button" className="battle-btn battle-btn--sm" onClick={() => answerDraw(true)}>ACCEPT</button>
        <button type="button" className="battle-btn battle-btn--ghost" onClick={() => answerDraw(false)}>DECLINE</button>
      </> : <>
        <button type="button" className="battle-btn battle-btn--ghost" onClick={offerDraw} disabled={state.drawBy === seat || !state.pgn}>{state.drawBy === seat ? 'DRAW OFFERED' : 'OFFER DRAW'}</button>
        <button type="button" className="battle-btn battle-btn--ghost" onClick={resign} disabled={!state.pgn}>RESIGN</button>
        {myTurn && !myTimeoutUsed && <button type="button" className="battle-btn battle-btn--timeout" onClick={callTimeout}>CALL TIMEOUT</button>}
      </>}
    </div>}
    {paused && !iCalled && <div className="battle-overlay" role="alert"><h2>OPPONENT CALLED TIMEOUT</h2><p>Clocks are stopped. Hold your ground - the fight resumes when they are ready.</p></div>}
    {iCalled && <div className="battle-overlay battle-overlay--corner" role="dialog" aria-label="Chester in your corner">
      <h2>CHESTER - YOUR CORNER</h2>
      <div className="battle-corner-log">
        {corner.map((m, i) => <p key={i} className={m.role === 'chester' ? 'battle-msg battle-msg--chester' : 'battle-msg'}>{m.text}</p>)}
        {cornerBusy && <p className="battle-msg battle-msg--chester">...</p>}
      </div>
      <div className="battle-corner-row">
        <input value={cornerInput} onChange={(e) => setCornerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendCorner(); }} placeholder="Ask Chester..." aria-label="Ask Chester" />
        <button type="button" className="battle-btn battle-btn--sm" onClick={sendCorner}>SEND</button>
      </div>
      <button type="button" className="battle-btn" onClick={resumeBattle}>RESUME BATTLE</button>
    </div>}
  </main>;
}
