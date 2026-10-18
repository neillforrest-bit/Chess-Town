'use client';
// BATTLE MODE: Walkout Tunnel lobby (Supabase Realtime Presence), board only when two fighters are
// seated, moves + clocks + results synced over a Realtime broadcast channel. Each phone also keeps a
// local copy so a reload (or a closed opponent tab) does not lose the game.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import MatchCountdown from '@/components/MatchCountdown';
import { ChesterAvatar } from '@/components/ChesterUI';
import { direct } from '@/lib/chester-director';
import { buzz, playSfx } from '@/lib/sounds';
import { winOddsPct } from '@/lib/chester-voice';
import { createClient } from '@/utils/supabase/client';
import { getStockfishClient } from '@/lib/stockfish';

const START_MS = 10 * 60 * 1000;
type Synced = {
  pgn: string; playerOneTime: number; playerTwoTime: number; playerOneTimeoutUsed: boolean; playerTwoTimeoutUsed: boolean;
  rev: number; result: string | null; drawBy: 0 | 1 | null; rematchBy: 0 | 1 | null; pausedBy: 0 | 1 | null; flipped: boolean;
  // WILD CARDS (one each per fighter per game)
  takebackBy: 0 | 1 | null; playerOneTakebackUsed: boolean; playerTwoTakebackUsed: boolean;
  ghost: { by: 0 | 1; square: string; untilPly: number; castPly: number } | null; playerOneGhostUsed: boolean; playerTwoGhostUsed: boolean;
  playerOneHintUsed: boolean; playerTwoHintUsed: boolean;
};
const FRESH: Synced = { pgn: '', playerOneTime: START_MS, playerTwoTime: START_MS, playerOneTimeoutUsed: false, playerTwoTimeoutUsed: false, rev: 0, result: null, drawBy: null, rematchBy: null, pausedBy: null, flipped: false, takebackBy: null, playerOneTakebackUsed: false, playerTwoTakebackUsed: false, ghost: null, playerOneGhostUsed: false, playerTwoGhostUsed: false, playerOneHintUsed: false, playerTwoHintUsed: false };
type Peer = { id: string; at: number; seat: 0 | 1 | null; fid?: string };
// BUILD 150 fun pass: Chester calls the fight like a corner-man with a microphone.
const OPENERS = [
  'Two walk in. One walks out smug. Touch gloves.',
  'No coaching from the cheap seats. Except me. I am the cheap seats.',
  'Ten minutes each. I have seen friendships end over less.',
  'The crowd wants blood. The crowd is me.',
];
const FIRST_BLOOD = ['FIRST BLOOD. The arena smells it.', 'First piece falls. Somebody came to play.'];
const COOKING = ['is COOKING. Somebody call the fire brigade.', 'cannot miss right now. Rude, honestly.', 'is on a heater. The crowd is on its feet.'];
const PANIC = ['ONE MINUTE, {c}. Breathe. In through the nose, out through the tactics.', '{c} has sixty seconds and a whole lot of feelings.'];
const CLUTCH_CALL = ['THIRTY SECONDS, {c}. The arena leans in.', '{c} is on fumes. Every move is a haymaker now.'];
// BUILD 157: quick-fire banter chits - one tap, board-edge toast, own broadcast event so game state never queues behind them.
const CHITS = [
  { id: 'bogen', text: 'Blunder or Genius?' },
  { id: 'ticktock', text: 'Tick-Tock' },
  { id: 'backrank', text: 'Check your back rank.' },
] as const;
const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];
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
  const fid = useRef('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [state, setState] = useState<Synced>(FRESH);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [banter, setBanter] = useState<{ key: string; color: 'w' | 'b'; text: string; hot: boolean } | null>(null);
  const [mood, setMood] = useState<'great' | 'good' | 'slip' | 'bad' | 'terrible' | null>(null);
  const [edu, setEdu] = useState<{ key: string; text: string } | null>(null);
  const [ghostArm, setGhostArm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [motion, setMotion] = useState(true);
  const [chitIn, setChitIn] = useState<{ key: number; text: string; from: 0 | 1 | null } | null>(null);
  const chitCool = useRef(0);
  const [fx, setFx] = useState<{ key: number; kind: 'move' | 'capture' | 'check' | 'mate' | 'brilliant'; from?: string; to: string; kingSq?: string } | null>(null);
  const [dossier, setDossier] = useState<{ w: number; l: number; d: number; openings: Record<string, number>; blunders: { me: number; you: number } } | null>(null);
  const blunderRef = useRef<{ w: number; b: number }>({ w: 0, b: 0 });
  const dossierRecorded = useRef(false);
  const [countdownFast, setCountdownFast] = useState(false);
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
    const merged = { ...FRESH, ...s };
    stamp.current = Date.now(); stateRef.current = merged; setState(merged);
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
      // Stable per-device fighter id for the rivalry dossier (BUILD 157). Device-local - no schema change.
      fid.current = localStorage.getItem('ct-fighter-id') || uid(); localStorage.setItem('ct-fighter-id', fid.current);
      setZen(localStorage.getItem('ct-zen') === '1'); setMotion(localStorage.getItem('ct-motion') !== '0');
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
      const st = ch.presenceState() as Record<string, { at: number; seat: 0 | 1 | null; fid?: string }[]>;
      setPeers(Object.entries(st).map(([id, v]) => ({ id, at: v[0]?.at ?? 0, seat: v[0]?.seat ?? null, fid: v[0]?.fid })).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)));
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'pause_game' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'resume_game' }, ({ payload }) => apply(payload as Synced, true));
    ch.on('broadcast', { event: 'hello' }, () => { if (stateRef.current.rev > 0) void ch.send({ type: 'broadcast', event: 'state', payload: stateRef.current }); });
    ch.on('broadcast', { event: 'chit' }, ({ payload }) => {
      const c = payload as { id: string; text: string; by: 0 | 1 | null };
      setChitIn({ key: Date.now(), text: c.text, from: c.by });
      if (c.id === 'ticktock') buzz([24, 70, 24]); else buzz(10);
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ at: joinedAt.current, seat: trackedSeat.current ?? null, fid: fid.current });
        void ch.send({ type: 'broadcast', event: 'hello', payload: {} });
        if (stateRef.current.rev > 0) void ch.send({ type: 'broadcast', event: 'state', payload: stateRef.current });
      }
    });
    return () => { void sb.removeChannel(ch); };
  }, [matchId, key, apply]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);

  const seats = useMemo(() => seatMap(peers), [peers]);
  const seat = ready && me.current in seats ? seats[me.current] : null;
  // Claim and remember my seat so a reload keeps it.
  useEffect(() => {
    if (seat === null || trackedSeat.current === seat) return;
    trackedSeat.current = seat;
    try { sessionStorage.setItem(key + ':seat', String(seat)); } catch { /* ignore */ }
    void chanRef.current?.track({ at: joinedAt.current, seat, fid: fid.current });
  }, [seat, key]);

  const seated = peers.filter((p) => seats[p.id] !== null && seats[p.id] !== undefined).length;
  const started = state.rev > 0 && state.pgn !== '' || state.result !== null;
  const connected = seated >= 2 || (started && seat !== null);
  const opponentHere = seated >= 2;
  const myColor = state.flipped ? (seat === 1 ? 'w' : 'b') : seat === 1 ? 'b' : 'w';
  const chess = useMemo(() => loadChess(state.pgn), [state.pgn]);

  // READY / STEADY / GO: fire when both fighters are seated for a fresh game, and again on rematch.
  const wasConnected = useRef(false);
  const prevPgn = useRef(state.pgn);
  useEffect(() => {
    const fresh = state.pgn === '' && state.result === null;
    if (connected && fresh && (!wasConnected.current || prevPgn.current !== '')) {
      setCountdownFast(prevPgn.current !== '');
      setCountdown((n) => n + 1);
      playSfx('start');
      const seed = matchIdRef.current.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
      window.setTimeout(() => setBanter({ key: `opener-${Date.now()}`, color: 'w', text: pick(OPENERS, seed), hot: true }), 4800);
    }
    wasConnected.current = connected;
    prevPgn.current = state.pgn;
  }, [connected, state.pgn, state.result]);

  // Move/capture/check sound + juicy FX + haptics on every synced move (both phones). BUILD 157.
  useEffect(() => {
    if (!state.pgn) return;
    const c = loadChess(state.pgn);
    const last = c.history({ verbose: true }).pop();
    if (!last) return;
    const mate = c.isCheckmate(); const check = !mate && c.isCheck();
    const pitch = clutchRef.current ? 1.35 : 1; // clutch time: the sound design rises in pitch
    playSfx(mate ? 'win' : check ? 'check' : last.captured ? 'capture' : 'move', pitch);
    if (mate) buzz(240); else if (check) buzz([25, 45, 25]); else if (last.captured) buzz(12); else buzz(5);
    if (last.promotion) buzz([16, 32, 16]);
    let kingSq: string | undefined;
    if (mate || check) {
      const side = c.turn();
      for (const row of c.board()) for (const sq of row) if (sq && sq.type === 'k' && sq.color === side) kingSq = sq.square;
    }
    setFx({ key: Date.now(), kind: mate ? 'mate' : check ? 'check' : last.captured ? 'capture' : 'move', from: last.from, to: last.to, kingSq });
  }, [state.pgn]);
  useEffect(() => { if (!fx) return; const t = setTimeout(() => setFx(null), fx.kind === 'mate' ? 2400 : 1300); return () => clearTimeout(t); }, [fx]);
  useEffect(() => { if (!chitIn) return; const t = setTimeout(() => setChitIn(null), 2600); return () => clearTimeout(t); }, [chitIn]);
  useEffect(() => { if (!banter || banter.key === 'verdict') return; const t = setTimeout(() => setBanter(null), 4500); return () => clearTimeout(t); }, [banter]);
  useEffect(() => { if (!edu) return; const t = setTimeout(() => setEdu(null), 6000); return () => clearTimeout(t); }, [edu]);
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
  // CLUTCH TIME: either fighter under 30 seconds turns the arena red.
  const clutch = running && ((liveOne <= 30000 && liveOne > 0) || (liveTwo <= 30000 && liveTwo > 0));
  const clutchRef = useRef(false);
  clutchRef.current = clutch;
  const fmtT = (ms: number) => { const s = Math.max(0, ms) / 1000; const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };

  // Flag fall: whoever's clock hit zero loses. Every phone checks, identical commits are harmless (rev gate).
  useEffect(() => {
    if (!running || seat === null) return;
    if (liveOne <= 0) commit({ result: 'timeout:w', playerOneTime: 0 });
    else if (liveTwo <= 0) commit({ result: 'timeout:b', playerTwoTime: 0 });
  }, [running, liveOne, liveTwo, seat, commit]);

  // Clock panic: one warning per fighter when they cross 60 seconds.
  const panicFired = useRef<{ w: boolean; b: boolean }>({ w: false, b: false });
  useEffect(() => {
    if (!running) return;
    const low: 'w' | 'b' | null = liveOne <= 60000 && liveOne > 0 && !panicFired.current.w ? 'w' : liveTwo <= 60000 && liveTwo > 0 && !panicFired.current.b ? 'b' : null;
    if (!low) return;
    panicFired.current[low] = true;
    setBanter({ key: `panic-${low}`, color: low, text: pick(PANIC, Date.now()).replace('{c}', low === 'w' ? 'WHITE' : 'BLACK'), hot: true });
    playSfx('shaky');
  }, [running, liveOne, liveTwo]);

  // Clutch call: one announcement per fighter when they cross 30 seconds.
  const clutchFired = useRef<{ w: boolean; b: boolean }>({ w: false, b: false });
  useEffect(() => {
    if (!running) return;
    const low: 'w' | 'b' | null = liveOne <= 30000 && liveOne > 0 && !clutchFired.current.w ? 'w' : liveTwo <= 30000 && liveTwo > 0 && !clutchFired.current.b ? 'b' : null;
    if (!low) return;
    clutchFired.current[low] = true;
    setBanter({ key: `clutch-${low}`, color: low, text: pick(CLUTCH_CALL, Date.now()).replace('{c}', low === 'w' ? 'WHITE' : 'BLACK'), hot: true });
  }, [running, liveOne, liveTwo]);

  // Fresh game (incl. run-back): re-arm the one-shot calls and the dossier blunder tally.
  useEffect(() => {
    if (state.pgn !== '') return;
    panicFired.current = { w: false, b: false };
    clutchFired.current = { w: false, b: false };
    blunderRef.current = { w: 0, b: 0 };
    dossierRecorded.current = false;
  }, [state.pgn]);

  // Game over: Chester's verdict + the win sting.
  const verdictFired = useRef(false);
  useEffect(() => {
    if (!over || verdictFired.current) return;
    verdictFired.current = true;
    const r = state.result || '';
    const winner = r.startsWith('timeout:') ? (r.endsWith(':w') ? 'BLACK' : 'WHITE') : r.startsWith('resign:') ? (r.endsWith(':w') ? 'BLACK' : 'WHITE') : chess.isCheckmate() ? (turn === 'w' ? 'BLACK' : 'WHITE') : null;
    const text = r.startsWith('timeout:') ? `THE CLOCK IS THE ONLY UNDEFEATED FIGHTER. ${winner} takes it.` : r.startsWith('resign:') ? `${winner === 'WHITE' ? 'BLACK' : 'WHITE'} taps out. ${winner} takes the arena.` : r.startsWith('draw:') || !winner ? 'A draw. The crowd boos politely. Run it back.' : `LIGHTS OUT. ${winner} takes the arena.`;
    setBanter({ key: 'verdict', color: winner === 'BLACK' ? 'b' : 'w', text, hot: true });
    playSfx(winner ? 'win' : 'shaky');
    // Rivalry dossier (BUILD 157): device-local lifetime record vs this opponent.
    if (!dossierRecorded.current && oppFidRef.current) {
      dossierRecorded.current = true;
      try {
        const k = `ct-rivalry-${oppFidRef.current}`;
        const raw = localStorage.getItem(k);
        const rec = raw ? JSON.parse(raw) as { w: number; l: number; d: number; openings: Record<string, number>; blunders: { me: number; you: number } } : { w: 0, l: 0, d: 0, openings: {}, blunders: { me: 0, you: 0 } };
        if (!winner) rec.d += 1;
        else {
          const iWon = (winner === 'WHITE') === (myColorRef.current === 'w');
          if (iWon) rec.w += 1; else rec.l += 1;
          const line = chess.history().slice(0, 4).join(' ');
          if (line) rec.openings[line] = (rec.openings[line] || 0) + 1;
        }
        rec.blunders.me += myColorRef.current === 'w' ? blunderRef.current.w : blunderRef.current.b;
        rec.blunders.you += myColorRef.current === 'w' ? blunderRef.current.b : blunderRef.current.w;
        localStorage.setItem(k, JSON.stringify(rec));
        setDossier(rec);
      } catch { /* private mode - the dossier is a bonus, never break the fight */ }
    }
  }, [over, state.result, chess, turn]);
  useEffect(() => { if (!over) verdictFired.current = false; }, [over]);

  // ---- Stage 2: arena swing. Each phone runs its own Stockfish on the new position (white-absolute pawns).
  const bestRefEarly = null; void bestRefEarly;
  const evalRef = useRef<{ pgn: string; pawns: number } | null>(null);
  const streakRef = useRef<{ w: number; b: number }>({ w: 0, b: 0 });
  const accRef = useRef<{ w: { loss: number; n: number }; b: { loss: number; n: number } }>({ w: { loss: 0, n: 0 }, b: { loss: 0, n: 0 } });
  const oddsBandRef = useRef<number>(50);
  const [accuracy, setAccuracy] = useState<{ w: { loss: number; n: number }; b: { loss: number; n: number } }>({ w: { loss: 0, n: 0 }, b: { loss: 0, n: 0 } });
  const [odds, setOdds] = useState<number>(50);
  const [swing, setSwing] = useState<{ n: number; text: string; good: boolean } | null>(null);
  const [shakeBattle, setShakeBattle] = useState(false);
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
      const prev = evalRef.current ?? { pgn: '', pawns: 0.2 };
      evalRef.current = { pgn, pawns };
      if (prev.pgn === pgn || pgn.length < prev.pgn.length) return;
      const d = pawns - prev.pawns;
      if (Math.abs(d) > 2.0) {
        const goodForWhite = d > 0;
        const good = goodForWhite === (myColorRef.current === 'w');
        setSwing({ n: Date.now(), good, text: good ? '[THE CROWD ROARS]' : '[THE ARENA GOES DEAD SILENT]' });
      }
      const prevBest = bestRef.current; // engine's preferred move BEFORE this move was played
      // Chester commentary, same deterministic voice as Play Chester (zero cost per move).
      // No freeze cards and no best-move reveals here: live PvP with running clocks, so
      // blocking the board or whispering engine moves to one fighter would break the fight.
      try {
        const cNow = loadChess(pgn);
        if (cNow.isGameOver()) return; // the verdict owns the mic once the fight is over
        const hist = cNow.history({ verbose: true });
        const last = hist[hist.length - 1];
        if (last) {
          const mover = last.color;
          const beforeM = prev ? (mover === 'w' ? prev.pawns : -prev.pawns) : 0;
          const afterM = mover === 'w' ? pawns : -pawns;
          const delta = Math.max(0, Math.round((beforeM - afterM) * 100));
          const cls = delta >= 250 ? 'BLUNDER' : delta >= 120 ? 'MISTAKE' : delta >= 50 ? 'INACCURACY' : delta <= 12 ? 'BEST' : 'GOOD';
          if (cls === 'BLUNDER') blunderRef.current[mover] += 1;
          const fenBefore = prev ? loadChess(prev.pgn).fen() : new Chess().fen();
          const d2 = direct({ classification: cls, evalDelta: delta, playerColor: mover, captured: last.captured ?? null, check: cNow.isCheck(), mate: cNow.isCheckmate(), ply: hist.length, moveSan: last.san, fenBefore: fenBefore, move: last.san });
          let line = d2.chester_immediate_chat;
          let hot = d2.ui_action !== 'none';
          const captureCount = hist.filter((m) => m.captured).length;
          if (last.captured && captureCount === 1) { line = pick(FIRST_BLOOD, hist.length); hot = true; playSfx('brilliant'); }
          const sharp = delta <= 12 || cNow.isCheck() || cNow.isCheckmate();
          streakRef.current[mover] = sharp ? streakRef.current[mover] + 1 : 0;
          if (streakRef.current[mover] > 0 && streakRef.current[mover] % 3 === 0) { line = `${mover === 'w' ? 'WHITE' : 'BLACK'} ${pick(COOKING, hist.length)}`; hot = true; playSfx('brilliant'); }
          // Educational layer (his ask): what was good/bad + what the engine preferred. Both phones see it.
          const eduText = cNow.isCheckmate() || cNow.isCheck() ? (cNow.isCheckmate() ? 'That is mate. The arena erupts.' : 'Check - the king is running.')
            : delta <= 15 ? 'The engine agrees with that move.' : prevBest ? `Engine preferred ${prevBest}. That cost about ${(delta / 100).toFixed(1)} pawns.` : delta >= 120 ? `That cost about ${(delta / 100).toFixed(1)} pawns.` : '';
          if (eduText) setEdu({ key: `edu-${hist.length}`, text: eduText });
          // live accuracy: chess.com-style curve over centipawn loss per move
          const acc = accRef.current[mover]; acc.loss += delta; acc.n += 1;
          setAccuracy({ ...accRef.current });
          // tug-of-war commentary: Chester calls the odds when the band moves
          const oddsNow = winOddsPct(Math.round(pawns * 100), 'w');
          if (oddsNow !== null) {
            setOdds(oddsNow);
            const band = Math.round(oddsNow / 10) * 10;
            if (band !== oddsBandRef.current && hist.length > 4) {
              oddsBandRef.current = band;
              const leader = oddsNow >= 55 ? 'WHITE' : oddsNow <= 45 ? 'BLACK' : null;
              if (leader) setEdu({ key: `odds-${hist.length}`, text: `Chester's tote board: ${leader} holds ${leader === 'WHITE' ? oddsNow : 100 - oddsNow}% of the arena.` });
            }
          }
          // Eval-scaled board animation: terrible -> great.
          setMood(cNow.isCheckmate() || cNow.isCheck() || delta <= 15 ? 'great' : delta <= 50 ? 'good' : delta <= 120 ? 'slip' : delta <= 250 ? 'bad' : 'terrible');
          window.setTimeout(() => setMood(null), 1400);
          if (line) {
            setBanter({ key: `${hist.length}-${last.san}`, color: mover, text: line, hot });
            if (d2.ui_action === 'freeze_red') { setShakeBattle(true); window.setTimeout(() => setShakeBattle(false), 700); playSfx('bad'); }
            else if (d2.ui_action === 'freeze_green') { playSfx('brilliant'); buzz([18, 35, 18]); setFx({ key: Date.now(), kind: 'brilliant', from: last.from, to: last.to }); }
            else if (d2.ui_action === 'shake') { setShakeBattle(true); window.setTimeout(() => setShakeBattle(false), 700); playSfx('shaky'); }
          }
        }
      } catch { /* commentary is garnish - never break the match */ }
    }).catch(() => undefined);
    return () => { dead = true; };
  }, [state.pgn, connected]);
  useEffect(() => { if (!swing) return; const t = setTimeout(() => setSwing(null), 2600); return () => clearTimeout(t); }, [swing]);
  const myColorRef = useRef<'w' | 'b'>('w');
  myColorRef.current = myColor;

  // Rivalry dossier: the opponent's stable fighter id arrives over presence.
  const oppFid = peers.find((p) => p.id !== me.current && p.fid)?.fid;
  const oppFidRef = useRef<string | undefined>(undefined);
  oppFidRef.current = oppFid;
  useEffect(() => {
    if (!oppFid) { setDossier(null); return; }
    try { const raw = localStorage.getItem(`ct-rivalry-${oppFid}`); setDossier(raw ? JSON.parse(raw) : null); } catch { setDossier(null); }
  }, [oppFid]);
  const topOpening = dossier ? (Object.entries(dossier.openings).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '') : '';

  // Square -> board-percent position (orientation-aware), for the FX overlay.
  const sqPos = (sq: string) => {
    const f = sq.charCodeAt(0) - 97; const r = parseInt(sq[1], 10);
    const c = myColor === 'w' ? f : 7 - f; const rw = myColor === 'w' ? 8 - r : r - 1;
    return { left: `${c * 12.5}%`, top: `${rw * 12.5}%` };
  };

  // Banter chits: one tap, 8s cooldown, separate broadcast event.
  const sendChit = (c: (typeof CHITS)[number]) => {
    if (Date.now() < chitCool.current || seat === null) return;
    chitCool.current = Date.now() + 8000;
    setChitIn({ key: Date.now(), text: c.text, from: seat });
    void chanRef.current?.send({ type: 'broadcast', event: 'chit', payload: { id: c.id, text: c.text, by: seat } });
    if (c.id === 'ticktock') buzz([24, 70, 24]);
  };

  const dossierStrip = dossier && (dossier.w + dossier.l + dossier.d > 0) ? <p className="battle-dossier">LIFETIME VS RIVAL: <b>{dossier.w} - {dossier.l}</b>{dossier.d > 0 ? ` · ${dossier.d} DRAW${dossier.d > 1 ? 'S' : ''}` : ''} · BLUNDERS <b>{dossier.blunders.me} - {dossier.blunders.you}</b>{topOpening ? <> · NEMESIS LINE <b>{topOpening}</b></> : null}</p> : null;

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
    if (state.rematchBy !== null && state.rematchBy !== seat) commit({ ...FRESH, rev: stateRef.current.rev, flipped: !stateRef.current.flipped });
    else commit({ rematchBy: seat });
  };

  // ---- WILD CARDS ----
  const myTakebackUsed = seat === 1 ? state.playerTwoTakebackUsed : state.playerOneTakebackUsed;
  const myGhostUsed = seat === 1 ? state.playerTwoGhostUsed : state.playerOneGhostUsed;
  const myHintUsed = seat === 1 ? state.playerTwoHintUsed : state.playerOneHintUsed;
  const histVerbose = chess.history({ verbose: true });
  const ply = histVerbose.length;
  const ghostLive = state.ghost && ply < state.ghost.untilPly ? state.ghost : null;
  // The ghost follows its piece: replay every move since it was cast.
  let ghostSq = ghostLive ? ghostLive.square : '';
  if (ghostLive) for (let i = ghostLive.castPly; i < histVerbose.length; i++) { if (histVerbose[i].from === ghostSq) ghostSq = histVerbose[i].to; }
  const ghostOwnerColor = ghostLive ? (ghostLive.by === 1 ? 'b' : 'w') : null;
  const ghostPieceGone = ghostLive ? (() => { const pc = chess.get(ghostSq as never) as { color: string } | null; return !pc || pc.color !== ghostOwnerColor; })() : true;
  // The ghost is invisible on the OPPONENT's board, a shimmer on yours.
  const ghostSquares: Record<string, number> = ghostLive && !ghostPieceGone ? { [ghostSq]: ghostLive.by === seat ? 0.25 : 0 } : {};

  const askTakeback = () => { if (seat === null || myTakebackUsed || over || !state.pgn || turn === myColor || state.takebackBy !== null) return; commit({ takebackBy: seat }); };
  const answerTakeback = (yes: boolean) => {
    if (seat === null || state.takebackBy === null || state.takebackBy === seat) return;
    if (!yes) { commit({ takebackBy: null }); return; }
    const c = loadChess(stateRef.current.pgn); c.undo();
    commit({ pgn: c.pgn(), takebackBy: null, ...(state.takebackBy === 1 ? { playerTwoTakebackUsed: true } : { playerOneTakebackUsed: true }) });
  };
  const playGhost = () => { if (seat === null || myGhostUsed || over || !myTurn || ghostLive) return; setGhostArm(true); };
  const pickGhost = (square: string) => {
    setGhostArm(false);
    const piece = chess.get(square as never) as { color: string } | null;
    if (!piece || piece.color !== myColor || seat === null) return;
    commit({ ghost: { by: seat, square, untilPly: ply + 6, castPly: ply }, ...(seat === 1 ? { playerTwoGhostUsed: true } : { playerOneGhostUsed: true }) });
    playSfx('shaky');
  };
  const askHint = () => {
    if (seat === null || myHintUsed || over || !myTurn) return;
    const tip = bestRef.current;
    commit(seat === 1 ? { playerTwoHintUsed: true } : { playerOneHintUsed: true });
    setBanter({ key: `hint-${Date.now()}`, color: myColor, text: tip ? `Chester taps the board: ${tip}. You did not hear it from me.` : 'Chester is still reading the position - ask again in a breath.', hot: true });
    if (tip) playSfx('good');
  };

  // Chester keeps a running tally of wild cards: announce availability at the bell, call every spend.
  const wildRef = useRef({ ghost: false, wHint: false, bHint: false, wTb: false, bTb: false, welcomed: false });
  useEffect(() => {
    const prev = wildRef.current;
    const say = (text: string, color: 'w' | 'b') => setBanter({ key: `wild-${Date.now()}`, color, text, hot: true });
    if (!prev.welcomed && connected && state.pgn !== '') { prev.welcomed = true; window.setTimeout(() => say('Wild cards loaded: TAKEBACK, GHOST and HINT - one each. Spend them like you mean it.', myColorRef.current), 9500); }
    if (state.ghost && !prev.ghost) say(`${state.ghost.by === 1 ? 'BLACK' : 'WHITE'} plays a wild card - a piece slips into the shadows. Three moves of hide and seek.`, state.ghost.by === 1 ? 'b' : 'w');
    if (state.playerOneHintUsed && !prev.wHint) say('WHITE asked Chester for a hint. Rattled?', 'w');
    if (state.playerTwoHintUsed && !prev.bHint) say('BLACK asked Chester for a hint. Rattled?', 'b');
    if (state.playerOneTakebackUsed && !prev.wTb) say('WHITE takes a move back. We do not speak of it again.', 'w');
    if (state.playerTwoTakebackUsed && !prev.bTb) say('BLACK takes a move back. We do not speak of it again.', 'b');
    wildRef.current = { ghost: !!state.ghost, wHint: state.playerOneHintUsed, bHint: state.playerTwoHintUsed, wTb: state.playerOneTakebackUsed, bTb: state.playerTwoTakebackUsed, welcomed: prev.welcomed };
  }, [connected, state.pgn, state.ghost, state.playerOneHintUsed, state.playerTwoHintUsed, state.playerOneTakebackUsed, state.playerTwoTakebackUsed]);

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
    {dossierStrip}
    <p className="battle-hint">The board appears the moment two fighters are in the tunnel.</p>
  </main>;

  const iCalled = paused && state.pausedBy === seat;
  return <main className={`battle-shell battle-arena${swing ? (swing.good ? ' battle-arena--roar' : ' battle-arena--silent') : ''}${clutch ? ' battle-arena--clutch' : ''}${motion ? '' : ' battle-arena--nomotion'}`}>
    <div className="battle-glow" aria-hidden="true" />
    {clutch && <div className="battle-clutch" aria-hidden="true" />}
    {!over && <div className="battle-menuwrap">
      <button type="button" className="battle-menubtn" aria-label="Battle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>☰</button>
      {menuOpen && <>
        <button type="button" className="battle-menuwrap__scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        <div className="battle-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); offerDraw(); }} disabled={state.drawBy === seat || !state.pgn}>{state.drawBy === seat ? 'DRAW OFFERED - WAITING' : '🤝 OFFER DRAW'}</button>
          <button type="button" role="menuitem" className="battle-menu__danger" onClick={() => { setMenuOpen(false); resign(); }} disabled={!state.pgn}>🏳 RESIGN</button>
          <button type="button" role="menuitem" onClick={() => { const v = !zen; setZen(v); try { localStorage.setItem('ct-zen', v ? '1' : '0'); } catch { /* private mode */ } }}>{zen ? '🧘 ZEN MODE: ON' : '🧘 ZEN MODE: OFF'}</button>
          <button type="button" role="menuitem" onClick={() => { const v = !motion; setMotion(v); try { localStorage.setItem('ct-motion', v ? '1' : '0'); } catch { /* private mode */ } }}>{motion ? '🎢 MOTION FX: ON' : '🎢 MOTION FX: OFF'}</button>
        </div>
      </>}
    </div>}
    {swing && <div key={swing.n} className={`battle-banner ${swing.good ? 'battle-banner--roar' : 'battle-banner--silent'}`}>{swing.text}</div>}
    {countdown > 0 && <MatchCountdown key={countdown} fast={countdownFast} />}
    <div className={`battle-clock${running && theirs <= 30000 && theirs > 0 ? ' battle-clock--clutch' : ''}`} data-active={running && turn !== myColor}><span>OPPONENT{opponentHere ? '' : ' (AWAY)'}</span><b>{running && theirs <= 30000 && theirs > 0 ? fmtT(theirs) : fmt(theirs)}</b></div>
    {!zen && <div className="fighthud battle-fighthud">
      <div className="fighthud__names">
        <div className={`fighthud__name fighthud__name--you ${turn === 'w' ? 'is-turn' : ''}`}><span>WHITE</span></div>
        {!over && connected && seat !== null && <div className="battle-chits" aria-label="Quick-fire banter">
          {CHITS.map((c) => <button key={c.id} type="button" className="battle-chit" aria-label={c.text} title={c.text} disabled={now < chitCool.current} onClick={() => sendChit(c)}>{c.id === 'bogen' ? '🤔' : c.id === 'ticktock' ? '⏳' : '🛡'}</button>)}
        </div>}
        <div className={`fighthud__name fighthud__name--opp ${turn === 'b' ? 'is-turn' : ''}`}><span>BLACK</span></div>
      </div>
      <div className={`fighthud__bar${swing ? ' fighthud__bar--surge' : ''}`} role="img" aria-label={`Tug of war: white ${odds} percent, black ${100 - odds} percent`}>
        <i className="fighthud__you" style={{ width: `${odds}%` }} />
        <i className="fighthud__opp" style={{ width: `${100 - odds}%` }} />
        <b className="fighthud__notch" aria-hidden="true" />
        <span className="fighthud__pct fighthud__pct--you">{odds}%</span>
        <span className="fighthud__pct fighthud__pct--opp">{100 - odds}%</span>
      </div>
      <div className="fighthud__caption">LIVE WIN ODDS</div>
    </div>}
    <div className={`battle-board battle-board--frame${shakeBattle ? ' chester-board-frame--shake' : ''}${mood ? ` battle-fx--${mood}` : ''}${fx?.kind === 'mate' ? ' battle-board--mate' : ''}`}>
      <TapBoard fen={chess.fen()} orientation={myColor} locked={!myTurn || ghostArm} lastMove={lastMove} onMove={onMove} ghostSquares={ghostSquares} toppleSquare={motion && fx?.kind === 'mate' ? fx.kingSq : undefined} />
      {motion && fx && fx.kind !== 'move' && <div className="battle-fxlayer" aria-hidden="true">
        {fx.kind === 'capture' && <i key={fx.key} className="battle-fxpuff" style={sqPos(fx.to)} />}
        {(fx.kind === 'check' || fx.kind === 'mate') && fx.kingSq && <i key={fx.key} className={`battle-fxhalo${fx.kind === 'mate' ? ' battle-fxhalo--mate' : ''}`} style={sqPos(fx.kingSq)} />}
        {fx.kind === 'brilliant' && fx.from && <Fragment key={fx.key}><i className="battle-fxspark" style={sqPos(fx.from)} /><i className="battle-fxspark" style={sqPos(fx.to)} /></Fragment>}
      </div>}
      {!zen && chitIn && <div key={chitIn.key} className={`battle-chittoast${chitIn.from === seat ? ' battle-chittoast--mine' : ''}`} aria-live="polite">{chitIn.text}</div>}
      {ghostArm && <div className="battle-ghostgrid" role="dialog" aria-label="Pick a piece to turn invisible">
        {Array.from({ length: 64 }, (_, i) => { const f = myColor === 'w' ? i % 8 : 7 - (i % 8); const r = myColor === 'w' ? 8 - Math.floor(i / 8) : Math.floor(i / 8) + 1; const sq = `${'abcdefgh'[f]}${r}`; const pc = chess.get(sq as never) as { color: string } | null; return <button key={sq} type="button" className={`battle-ghostgrid__cell${pc && pc.color === myColor ? ' battle-ghostgrid__cell--pick' : ''}`} aria-label={`vanish ${sq}`} onClick={() => pickGhost(sq)} />; })}
        <span className="battle-ghostgrid__label">TAP ONE OF YOUR PIECES - IT VANISHES FOR 3 MOVES</span>
      </div>}
    </div>
    <div className="battle-commentary-slot">
      {!zen && (banter || edu) && <div key={(banter || edu)!.key} className={`battle-commentary${banter?.hot ? ' battle-commentary--hot' : ''}`} aria-live="polite">
        <ChesterAvatar isThinking={false} size="small" />
        <span>{banter && <><b>{banter.color === 'w' ? 'WHITE' : 'BLACK'} · CHESTER</b> {banter.text}</>}{edu && <small className="battle-commentary__edu">{edu.text}</small>}</span>
      </div>}
    </div>
    {!zen && <><div className="battle-acc__caption">LIVE ACCURACY</div>
    {([['w', 'WHITE', accuracy.w], ['b', 'BLACK', accuracy.b]] as const).map(([c, label, a]) => {
      const pct = a.n === 0 ? 100 : Math.max(1, Math.min(100, Math.round(103.16 * Math.exp(-0.0435 * (a.loss / a.n))) - 0.8));
      return <div key={c} className="battle-acc" aria-label={`${label} accuracy ${pct} percent`}>
        <span className="battle-acc__label">{label}</span>
        <div className="battle-acc__scale"><i style={{ left: `${pct}%` }} /></div>
        <span className="battle-acc__pct">{pct}%</span>
      </div>;
    })}</>}
    <div className={`battle-clock${running && mine <= 30000 && mine > 0 ? ' battle-clock--clutch' : ''}`} data-active={running && turn === myColor}><span>FORREST 🌲</span><b>{running && mine <= 30000 && mine > 0 ? fmtT(mine) : fmt(mine)}</b></div>
    {over ? <>
      <p className="battle-sub battle-outcome">{outcome}</p>
      {dossierStrip}
      <button type="button" className="battle-btn" onClick={rematch}>{state.rematchBy !== null && state.rematchBy === seat ? 'WAITING FOR RUN-BACK...' : state.rematchBy !== null ? 'ACCEPT - RUN IT BACK' : '⚡ RUN IT BACK'}</button>
    </> : <div className="battle-actions">
      {state.drawBy !== null && state.drawBy !== seat ? <>
        <span className="battle-sub">Opponent offers a draw</span>
        <button type="button" className="battle-btn battle-btn--sm" onClick={() => answerDraw(true)}>ACCEPT</button>
        <button type="button" className="battle-btn battle-btn--ghost" onClick={() => answerDraw(false)}>DECLINE</button>
      </> : <>
        {myTurn && !myTimeoutUsed && <button type="button" className="battle-btn battle-btn--timeout" onClick={callTimeout}>CALL TIMEOUT</button>}
      </>}
      {state.takebackBy !== null && state.takebackBy !== seat ? <div className="battle-wildrow">
        <span className="battle-sub">Opponent wants to take a move back</span>
        <button type="button" className="battle-btn battle-btn--sm" onClick={() => answerTakeback(true)}>ALLOW</button>
        <button type="button" className="battle-btn battle-btn--ghost" onClick={() => answerTakeback(false)}>NO WAY</button>
      </div> : <>
        <div className="battle-wildcards" aria-label="Wild cards">
          <span className="battle-wildcards__label">WILD CARDS</span>
          <div className="battle-wildcards__row">
            <button type="button" className="battle-btn battle-btn--wild battle-btn--wild-takeback" onClick={askTakeback} disabled={myTakebackUsed || !state.pgn || turn === myColor || state.takebackBy !== null}>{state.takebackBy === seat ? '⏪ ASKED' : myTakebackUsed ? '⏪ SPENT' : '⏪ BACK'}</button>
            <button type="button" className="battle-btn battle-btn--wild battle-btn--wild-ghost" onClick={playGhost} disabled={myGhostUsed || !myTurn || !!ghostLive}>{myGhostUsed ? '👻 SPENT' : ghostLive ? '👻 ON' : '👻 GHOST'}</button>
            <button type="button" className="battle-btn battle-btn--wild battle-btn--wild-hint" onClick={askHint} disabled={myHintUsed || !myTurn}>{myHintUsed ? '💡 SPENT' : '💡 HINT'}</button>
          </div>
        </div>
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
