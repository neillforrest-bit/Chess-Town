'use client';

// PAWN WARS - 8 pawns and a king each. Queen a pawn or wipe out the enemy
// pawns to win. Teaches real chess: pawn structure, promotion races, king
// activity. The AI plays human-looking safe moves (the rookie picker from the
// dojo), so first-timers genuinely win - and the streak gives them a chase.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import MiniChester from '@/components/MiniChester';
import { describeMove } from '@/lib/move-words';

const START_FEN = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1';
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Same idea as the dojo's rookie: pick randomly among moves that do not
// immediately lose material, so games are winnable but never silly.
function pickRookieMove(chess: Chess) {
  try {
    const candidates: { from: string; to: string; promotion?: string }[] = [];
    for (const m of chess.moves({ verbose: true })) {
      const next = new Chess(chess.fen());
      next.move({ from: m.from, to: m.to, promotion: 'q' });
      let worstLoss = 0;
      for (const r of next.moves({ verbose: true })) if (r.captured) worstLoss = Math.max(worstLoss, PIECE_VALUES[r.captured] || 0);
      const gain = (PIECE_VALUES[m.captured || ''] || 0) + (m.promotion ? 8 : 0);
      if (worstLoss <= gain) candidates.push({ from: m.from, to: m.to, promotion: m.promotion ? 'q' : undefined });
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch { return null; }
}

type Outcome = { winner: 'w' | 'b' | 'draw'; reason: string } | null;

function judge(chess: Chess, lastMover: 'w' | 'b'): Outcome {
  const board = chess.board().flat();
  const whitePawns = board.filter((s) => s && s.color === 'w' && s.type === 'p').length;
  const blackPawns = board.filter((s) => s && s.color === 'b' && s.type === 'p').length;
  const whiteQueens = board.filter((s) => s && s.color === 'w' && s.type === 'q').length;
  const blackQueens = board.filter((s) => s && s.color === 'b' && s.type === 'q').length;
  if (whiteQueens > 0) return { winner: 'w', reason: 'You queened a pawn - pawn star!' };
  if (blackQueens > 0) return { winner: 'b', reason: 'The enemy queened a pawn first.' };
  if (blackPawns === 0 && whitePawns === 0) return { winner: 'draw', reason: 'No pawns left on either side - a truce.' };
  if (blackPawns === 0) return { winner: 'w', reason: 'Every enemy pawn is gone. Total wipeout!' };
  if (whitePawns === 0) return { winner: 'b', reason: 'Your pawns are all gone.' };
  if (chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) return { winner: 'draw', reason: 'Neither side can break through - a truce.' };
  if (chess.moves().length === 0) {
    const stuck = chess.turn();
    if (stuck === 'b') return { winner: 'w', reason: 'The enemy has no moves left - you froze them out!' };
    return { winner: 'b', reason: 'You have no moves left.' };
  }
  return null;
}

type Score = { wins: number; losses: number; streak: number; bestStreak: number };
const SCORE_KEY = 'pawn-wars-v1';
function readScore(): Score {
  try {
    const raw = window.localStorage.getItem(SCORE_KEY);
    if (raw) return { wins: 0, losses: 0, streak: 0, bestStreak: 0, ...JSON.parse(raw) };
  } catch { /* private browsing */ }
  return { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
}

export default function PawnWarsPage() {
  const [fen, setFen] = useState(START_FEN);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState('Your move. March a pawn to the far side, or eat every enemy pawn.');
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  const [copied, setCopied] = useState(false);
  const chessRef = useRef(new Chess(START_FEN));
  const [chesterEvent, setChesterEvent] = useState<{ type: string; seed: number } | null>(null);
  const plyRef = useRef(0);

  useEffect(() => { setScore(readScore()); }, []);

  const finish = useCallback((result: NonNullable<Outcome>) => {
    setOutcome(result);
    setChesterEvent({ type: result.winner === 'w' ? 'win' : result.winner === 'b' ? 'lose' : 'lose', seed: plyRef.current + 1 });
    setScore((current) => {
      const next: Score = result.winner === 'w'
        ? { ...current, wins: current.wins + 1, streak: current.streak + 1, bestStreak: Math.max(current.bestStreak, current.streak + 1) }
        : result.winner === 'b'
          ? { ...current, losses: current.losses + 1, streak: 0 }
          : current;
      try { window.localStorage.setItem(SCORE_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
      return next;
    });
  }, []);

  const playMove = useCallback((from: string, to: string, promotion?: string) => {
    if (outcome) return;
    const chess = chessRef.current;
    if (chess.turn() !== 'w') return;
    const before = chess.fen();
    const move = chess.move({ from, to, promotion: promotion || 'q' });
    if (!move) return;
    plyRef.current += 1;
    if (move.promotion) setChesterEvent({ type: 'queen', seed: plyRef.current });
    else if (move.captured) setChesterEvent({ type: 'capture', seed: plyRef.current });
    setFen(chess.fen());
    setLastMove({ from, to });
    const judged = judge(chess, 'w');
    if (judged) { finish(judged); return; }
    setNote(`${describeMove(before, `${from}${to}`) || move.san}. Enemy thinking…`);
    setThinking(true);
    window.setTimeout(() => {
      const game = chessRef.current;
      const replyBefore = game.fen();
      const reply = pickRookieMove(game);
      if (!reply) { setThinking(false); finish(judge(game, 'b') || { winner: 'w', reason: 'The enemy has no moves left - you froze them out!' }); return; }
      game.move(reply);
      setFen(game.fen());
      setLastMove({ from: reply.from, to: reply.to });
      setThinking(false);
      const judgedReply = judge(game, 'b');
      if (judgedReply) { finish(judgedReply); return; }
      setNote(`Enemy: ${describeMove(replyBefore, `${reply.from}${reply.to}`) || 'moved'}. Your move.`);
    }, 550 + Math.floor(Math.random() * 500));
  }, [finish, outcome]);

  const reset = () => {
    chessRef.current = new Chess(START_FEN);
    setFen(START_FEN);
    setLastMove(null);
    setOutcome(null);
    setThinking(false);
    setNote('Your move. March a pawn to the far side, or eat every enemy pawn.');
  };

  const share = async () => {
    const text = outcome?.winner === 'w'
      ? `PAWN WARS ⚔️ ${outcome.reason} Win streak: ${score.streak}. Think you can out-pawn me?\n${window.location.origin}/pawn-wars`
      : `PAWN WARS ⚔️ The pawns got me this time. Rematch?\n${window.location.origin}/pawn-wars`;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement('textarea');
      area.value = text; document.body.appendChild(area); area.select();
      try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return <main className="minigame-page">
    <header className="minigame-head">
      <span className="minigame-kicker">MINI GAME · PAWN ENDGAMES WITHOUT THE HOMEWORK</span>
      <h1>PAWN <em>WARS</em></h1>
      <p>Eight pawns, one king each. Queen a pawn first or wipe out the enemy pawns and the battle is yours.</p>
    </header>

    <div className="minigame-record" aria-label="Your record">
      <span>W {score.wins}</span><span>L {score.losses}</span><span>STREAK {score.streak}</span><span>BEST {score.bestStreak}</span>
    </div>

    <div className="minigame-board">
      <TapBoard fen={fen} locked={Boolean(outcome) || thinking} lastMove={lastMove} onMove={playMove} label="Pawn Wars board - you are the blue pieces at the bottom" />
    </div>

    <p className={`minigame-message ${outcome?.winner === 'w' ? 'minigame-message--win' : ''}`} aria-live="polite">
      {outcome ? `${outcome.winner === 'w' ? '🏆 ' : outcome.winner === 'draw' ? '🤝 ' : '💀 '}${outcome.reason}` : note}
    </p>

    {outcome && <section className="minigame-result">
      <div className="minigame-result__actions">
        <button type="button" className="minigame-cta" onClick={reset}>RUN IT BACK ⚔️</button>
        <button type="button" className="minigame-cta minigame-cta--ghost" onClick={share}>{copied ? 'CHALLENGE COPIED ✓' : 'CHALLENGE A FRIEND 📋'}</button>
      </div>
      <div className="minigame-links">
        <Link href="/chessdle">Try today&apos;s CHESSDLE →</Link>
        <Link href="/">← Back to Chesterville</Link>
      </div>
    </section>}
    <MiniChester game="pawn-wars" label="TRENCH COACH" event={chesterEvent} />
  </main>;
}
