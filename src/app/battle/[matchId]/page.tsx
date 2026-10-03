'use client';
// BATTLE MODE stage 1: Walkout Tunnel lobby (Supabase Realtime Presence), board only when two are
// connected, moves + clocks synced over a Realtime broadcast channel.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { createClient } from '@/utils/supabase/client';

const START_MS = 10 * 60 * 1000;
type Synced = { pgn: string; playerOneTime: number; playerTwoTime: number; playerOneTimeoutUsed: boolean; playerTwoTimeoutUsed: boolean };
const FRESH: Synced = { pgn: '', playerOneTime: START_MS, playerTwoTime: START_MS, playerOneTimeoutUsed: false, playerTwoTimeoutUsed: false };
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const loadChess = (pgn: string) => { const c = new Chess(); if (pgn) { try { c.loadPgn(pgn); } catch { /* keep start */ } } return c; };

export default function BattlePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const me = useRef('');
  const [peers, setPeers] = useState<{ id: string; at: number }[]>([]);
  const [state, setState] = useState<Synced>(FRESH);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const stateRef = useRef(state);
  const stamp = useRef(Date.now());
  const chanRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  stateRef.current = state;

  useEffect(() => {
    me.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const joinedAt = Date.now();
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch (e) { setErr((e as Error).message); return; }
    const ch = sb.channel(`battle:${matchId}`, { config: { presence: { key: me.current }, broadcast: { self: false } } });
    chanRef.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState() as Record<string, { at: number }[]>;
      setPeers(Object.entries(st).map(([id, v]) => ({ id, at: v[0]?.at ?? 0 })).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)));
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => { stamp.current = Date.now(); setState(payload as Synced); });
    ch.on('broadcast', { event: 'hello' }, () => { if (stateRef.current.pgn) void ch.send({ type: 'broadcast', event: 'state', payload: stateRef.current }); });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') { await ch.track({ at: joinedAt }); void ch.send({ type: 'broadcast', event: 'hello', payload: {} }); }
    });
    return () => { void sb.removeChannel(ch); };
  }, [matchId]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);

  const connected = peers.length >= 2;
  const seat = peers.findIndex((p) => p.id === me.current); // 0 = white / player one, 1 = black
  const chess = useMemo(() => loadChess(state.pgn), [state.pgn]);
  const turn = chess.turn();
  const myColor = seat === 1 ? 'b' : 'w';
  const myTurn = connected && seat >= 0 && seat < 2 && turn === myColor && !chess.isGameOver();
  const elapsed = state.pgn ? now - stamp.current : 0;
  const liveOne = state.playerOneTime - (turn === 'w' && connected && !chess.isGameOver() ? elapsed : 0);
  const liveTwo = state.playerTwoTime - (turn === 'b' && connected && !chess.isGameOver() ? elapsed : 0);

  const onMove = useCallback((from: string, to: string, promotion?: string) => {
    const c = loadChess(stateRef.current.pgn);
    if (c.turn() !== myColor) return;
    const spent = stateRef.current.pgn ? Date.now() - stamp.current : 0;
    try { c.move({ from, to, promotion: promotion ?? 'q' }); } catch { return; }
    const s = stateRef.current;
    const next: Synced = { ...s, pgn: c.pgn(), playerOneTime: myColor === 'w' ? s.playerOneTime - spent : s.playerOneTime, playerTwoTime: myColor === 'b' ? s.playerTwoTime - spent : s.playerTwoTime };
    stamp.current = Date.now(); setState(next);
    void chanRef.current?.send({ type: 'broadcast', event: 'state', payload: next });
  }, [myColor]);

  const link = typeof window === 'undefined' ? '' : window.location.href;
  const copy = async () => { try { await navigator.clipboard.writeText(`Step into the arena. ${link}`); setCopied(true); } catch { setCopied(false); } };
  const lastMove = (() => { const h = chess.history({ verbose: true }); const m = h[h.length - 1]; return m ? { from: m.from, to: m.to } : null; })();

  if (err) return <main className="battle-shell"><p className="battle-sub">{err}</p></main>;
  if (!connected) return <main className="battle-shell battle-tunnel">
    <span className="battle-kicker">BATTLE MODE</span>
    <h1 className="battle-title">The Walkout Tunnel</h1>
    <p className="battle-sub">{peers.length < 1 ? 'Connecting...' : 'Waiting for your opponent to walk out...'}</p>
    <div className="battle-dots"><i /><i /><i /></div>
    <button type="button" className="battle-btn" onClick={() => void copy()}>{copied ? 'COPIED - SEND IT TO YOUR OPPONENT' : 'COPY INVITE LINK'}</button>
    <p className="battle-hint">The board appears the moment two fighters are in the tunnel.</p>
  </main>;

  return <main className="battle-shell battle-arena">
    <div className="battle-clock" data-active={connected && !!state.pgn && turn !== myColor}><span>OPPONENT</span><b>{fmt(seat === 1 ? liveOne : liveTwo)}</b></div>
    <div className="battle-board"><TapBoard fen={chess.fen()} orientation={myColor} locked={!myTurn} lastMove={lastMove} onMove={onMove} /></div>
    <div className="battle-clock" data-active={connected && !!state.pgn && turn === myColor}><span>FORREST 🌲</span><b>{fmt(seat === 1 ? liveTwo : liveOne)}</b></div>
    {chess.isGameOver() && <p className="battle-sub">{chess.isCheckmate() ? (turn === myColor ? 'You were mated.' : 'CHECKMATE - you win!') : 'Game drawn.'}</p>}
  </main>;
}
