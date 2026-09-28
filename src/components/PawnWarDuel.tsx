'use client';

// PAWN WAR 1v1 - the pawn-wars rules on the live duel rails. Moves relay
// through the same window events as DojoEngine duels: local-chess-move out,
// remote-chess-move in (play-chester owns the PeerJS connection).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import MiniChester from '@/components/MiniChester';
import { describeMove } from '@/lib/move-words';

const WAR_START = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1';

type OutcomeKind = 'queen' | 'wipeout' | 'frozen' | 'truce' | 'drawRule';
type WarOutcome = { winner: 'w' | 'b' | 'draw'; kind: OutcomeKind } | null;

function judge(chess: Chess): WarOutcome {
  const board = chess.board().flat();
  const whitePawns = board.filter((s) => s && s.color === 'w' && s.type === 'p').length;
  const blackPawns = board.filter((s) => s && s.color === 'b' && s.type === 'p').length;
  const whiteQueens = board.filter((s) => s && s.color === 'w' && s.type === 'q').length;
  const blackQueens = board.filter((s) => s && s.color === 'b' && s.type === 'q').length;
  if (whiteQueens > 0) return { winner: 'w', kind: 'queen' };
  if (blackQueens > 0) return { winner: 'b', kind: 'queen' };
  if (blackPawns === 0 && whitePawns === 0) return { winner: 'draw', kind: 'truce' };
  if (blackPawns === 0) return { winner: 'w', kind: 'wipeout' };
  if (whitePawns === 0) return { winner: 'b', kind: 'wipeout' };
  if (chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) return { winner: 'draw', kind: 'drawRule' };
  if (chess.moves().length === 0) return { winner: chess.turn() === 'b' ? 'w' : 'b', kind: 'frozen' };
  return null;
}

function reasonFor(outcome: NonNullable<WarOutcome>, playerColor: 'w' | 'b'): string {
  const mine = outcome.winner === playerColor;
  switch (outcome.kind) {
    case 'queen': return mine ? 'You queened a pawn - pawn star!' : 'Rival queened a pawn first.';
    case 'wipeout': return mine ? 'Every rival pawn is gone. Total wipeout!' : 'Your pawns are all gone.';
    case 'frozen': return mine ? 'Rival has no moves left - you froze them out!' : 'You have no moves left.';
    case 'truce': return 'No pawns left on either side - a truce.';
    case 'drawRule': return 'Neither side can break through - a truce.';
  }
}

// Tension read, phrased for the viewer: is anyone one step from a queen?
function oneStepAway(chess: Chess, playerColor: 'w' | 'b'): string | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const sq = board[r][c];
    if (!sq || sq.type !== 'p') continue;
    if (sq.color === playerColor && r === (playerColor === 'w' ? 1 : 6)) return 'Your pawn is ONE STEP from a queen - push it home!';
    if (sq.color !== playerColor && r === (playerColor === 'w' ? 6 : 1)) return 'Rival pawn ONE STEP from a queen - stop it now!';
  }
  return null;
}

export default function PawnWarDuel({ playerColor, clockBar = null, flagBanner = null, onTurn, onGameOver }: {
  playerColor: 'w' | 'b';
  clockBar?: React.ReactNode;
  flagBanner?: React.ReactNode;
  onTurn?: (fen: string) => void;
  onGameOver?: () => void;
}) {
  const chessRef = useRef(new Chess(WAR_START));
  const [fen, setFen] = useState(WAR_START);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [outcome, setOutcome] = useState<WarOutcome>(null);
  const [note, setNote] = useState(playerColor === 'w' ? 'Your move. March a pawn to the far side, or eat every rival pawn.' : 'Rival opens - White moves first.');
  const [chesterEvent, setChesterEvent] = useState<{ type: string; seed: number } | null>(null);
  const plyRef = useRef(0);
  const outcomeRef = useRef<WarOutcome>(null);

  const applyMove = useCallback((from: string, to: string, mover: 'w' | 'b', viaRelay: boolean) => {
    if (outcomeRef.current) return;
    const chess = chessRef.current;
    if (chess.turn() !== mover) return;
    const before = chess.fen();
    const move = chess.move({ from, to, promotion: 'q' });
    if (!move) return;
    plyRef.current += 1;
    if (move.promotion) setChesterEvent({ type: 'queen', seed: plyRef.current });
    else if (move.captured) setChesterEvent({ type: 'capture', seed: plyRef.current });
    const nextFen = chess.fen();
    setFen(nextFen);
    setLastMove({ from, to });
    onTurn?.(nextFen);
    if (!viaRelay) { try { window.dispatchEvent(new CustomEvent('local-chess-move', { detail: { from, to, fen: nextFen } })); } catch {} }
    const judged = judge(chess);
    if (judged) {
      outcomeRef.current = judged;
      setOutcome(judged);
      setChesterEvent({ type: judged.winner === 'draw' ? 'lose' : judged.winner === playerColor ? 'win' : 'lose', seed: plyRef.current + 1 });
      onGameOver?.();
      return;
    }
    const tension = oneStepAway(chess, playerColor);
    const who = mover === playerColor ? 'You' : 'Rival';
    const tail = chess.turn() === playerColor ? 'Your move.' : 'Rival to move.';
    setNote(tension ? `${tension} ${tail}` : `${who}: ${describeMove(before, `${from}${to}`) || move.san}. ${tail}`);
  }, [onTurn, onGameOver, playerColor]);

  useEffect(() => {
    const onRemote = (event: Event) => {
      const d = (event as CustomEvent<{ from?: string; to?: string }>).detail;
      if (d?.from && d?.to) applyMove(d.from, d.to, playerColor === 'w' ? 'b' : 'w', true);
    };
    window.addEventListener('remote-chess-move', onRemote);
    return () => window.removeEventListener('remote-chess-move', onRemote);
  }, [applyMove, playerColor]);

  const localMove = useCallback((from: string, to: string) => applyMove(from, to, playerColor, false), [applyMove, playerColor]);

  const iWon = Boolean(outcome && outcome.winner === playerColor);
  return <main className="minigame-page">
    <header className="minigame-head">
      <span className="minigame-kicker">LIVE DUEL · PAWN WAR</span>
      <h1>PAWN <em>WAR</em></h1>
      <p>Eight pawns, one king each, two phones. Queen a pawn first or wipe the rival pawns out. You are <b>{playerColor === 'w' ? 'WHITE' : 'BLACK'}</b>.</p>
    </header>
    {clockBar}
    {flagBanner}
    <div className={`minigame-board ${outcome ? (iWon ? 'minigame-board--hit' : outcome.winner === 'draw' ? '' : 'minigame-board--miss') : ''}`}>
      <TapBoard fen={fen} orientation={playerColor} locked={Boolean(outcome)} lastMove={lastMove} onMove={localMove} label="Pawn War duel board - your pieces at the bottom" />
    </div>
    <p className={`minigame-message ${outcome && iWon ? 'minigame-message--win' : ''}`} aria-live="polite">
      {outcome ? `${iWon ? '🏆 ' : outcome.winner === 'draw' ? '🤝 ' : '💀 '}${reasonFor(outcome, playerColor)}` : note}
    </p>
    {outcome && <section className="minigame-result"><div className="minigame-result__actions"><Link href="/duel" className="minigame-cta">BACK TO THE DUEL LOBBY ⚔️</Link></div></section>}
    <MiniChester game="pawn-wars" label="TRENCH COACH" event={chesterEvent} />
  </main>;
}
