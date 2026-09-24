'use client';

// MATE SPRINT - how many mates-in-1 can you find in 60 seconds? Same verified
// puzzle bank as Chessdle, a ticking clock, -5s per miss, and a local high
// score to chase. Trains pattern recognition: the #1 beginner superpower.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import MiniChester from '@/components/MiniChester';
import { MATE_PUZZLES } from '@/lib/mate-puzzles';

const SPRINT_SECONDS = 60;
const MISS_PENALTY = 5;
const BEST_KEY = 'mate-sprint-best';

function shuffledOrder(): number[] {
  const order = MATE_PUZZLES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export default function MateSprintPage() {
  const [phase, setPhase] = useState<'ready' | 'running' | 'over'>('ready');
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [order, setOrder] = useState<number[]>(() => shuffledOrder());
  const [cursor, setCursor] = useState(0);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [copied, setCopied] = useState(false);
  const endAtRef = useRef(0);
  const [chesterEvent, setChesterEvent] = useState<{ type: string; seed: number } | null>(null);

  useEffect(() => {
    try { setBest(Number(window.localStorage.getItem(BEST_KEY)) || 0); } catch { /* private browsing */ }
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(timer);
        setPhase('over');
        setBest((current) => {
          const next = Math.max(current, scoreRef.current);
          try { window.localStorage.setItem(BEST_KEY, String(next)); } catch { /* private browsing */ }
          if (scoreRef.current > current && scoreRef.current > 0) setNewBest(true);
          return next;
        });
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  const scoreRef = useRef(0);
  scoreRef.current = score;

  const start = () => {
    setOrder(shuffledOrder());
    setCursor(0);
    setScore(0);
    setMisses(0);
    setFlash(null);
    setNewBest(false);
    setSecondsLeft(SPRINT_SECONDS);
    endAtRef.current = Date.now() + SPRINT_SECONDS * 1000;
    setPhase('running');
    setChesterEvent({ type: 'start', seed: 1 });
  };

  useEffect(() => {
    if (phase === 'over') setChesterEvent({ type: scoreRef.current >= 4 ? 'win' : 'lose', seed: scoreRef.current + misses + 1 });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const puzzle = MATE_PUZZLES[order[cursor % order.length]];

  const attempt = useCallback((from: string, to: string, promotion?: string) => {
    if (phase !== 'running') return;
    try {
      const chess = new Chess(puzzle.fen);
      chess.move({ from, to, promotion: promotion || 'q' });
      if (chess.isCheckmate()) {
        setScore((s) => s + 1);
        setCursor((c) => c + 1);
        setFlash('hit');
        setChesterEvent({ type: 'hit', seed: scoreRef.current + 1 });
      } else {
        endAtRef.current = Math.max(Date.now(), endAtRef.current - MISS_PENALTY * 1000);
        setMisses((m) => m + 1);
        setFlash('miss');
        setChesterEvent({ type: 'miss', seed: misses + 1 });
      }
      window.setTimeout(() => setFlash(null), 450);
    } catch { /* illegal taps are ignored by the board anyway */ }
  }, [phase, puzzle]);

  const share = async () => {
    const text = `MATE SPRINT ⏱ I found ${score} ${score === 1 ? 'mate' : 'mates'} in 60 seconds${newBest ? ' - a new personal best!' : ''} Beat that:\n${window.location.origin}/mate-sprint`;
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

  const clockTone = secondsLeft <= 10 ? 'minigame-clock--danger' : secondsLeft <= 25 ? 'minigame-clock--warm' : '';

  return <main className="minigame-page">
    <header className="minigame-head">
      <span className="minigame-kicker">MINI GAME · PATTERN SPEED FOR FIRST-TIMERS</span>
      <h1>MATE <em>SPRINT</em></h1>
      <p>Every position is mate in one. Find as many as you can in {SPRINT_SECONDS} seconds. A miss costs you {MISS_PENALTY}.</p>
    </header>

    {phase !== 'ready' && <div className="minigame-hud">
      <span className={`minigame-clock ${clockTone}`}>⏱ {secondsLeft}s</span>
      <span className="minigame-score">🏆 {score}</span>
      <span className="minigame-best">BEST {Math.max(best, score)}</span>
    </div>}

    {phase === 'ready' && <section className="minigame-result minigame-ready">
      <p>White to play, every time. Tap a piece, tap the killer square, next puzzle. Your high score: <b>{best}</b>.</p>
      <button type="button" className="minigame-cta" onClick={start}>START THE CLOCK ⏱</button>
      <div className="minigame-links"><Link href="/">← Back to Chesterville</Link></div>
    </section>}

    {phase === 'running' && <>
      <div className={`minigame-board ${flash === 'hit' ? 'minigame-board--hit' : ''} ${flash === 'miss' ? 'minigame-board--miss' : ''}`}>
        <TapBoard key={`${cursor}`} fen={puzzle.fen} onMove={attempt} label="Mate Sprint puzzle - white to play and mate in one" />
      </div>
      <p className="minigame-message" aria-live="polite">{flash === 'hit' ? '✅ Mate! Next…' : flash === 'miss' ? `❌ Not mate - minus ${MISS_PENALTY} seconds!` : 'White to play and mate in one.'}</p>
    </>}

    {phase === 'over' && <section className="minigame-result">
      <h2 className="minigame-final">{score} {score === 1 ? 'MATE' : 'MATES'} IN 60 SECONDS {newBest ? '· NEW BEST 🏆' : ''}</h2>
      <p className="minigame-sub">{score >= 8 ? 'You see the board like a boss.' : score >= 4 ? 'Real pattern instincts. Again?' : 'Every sprint makes the next one faster.'}{misses ? ` ${misses} ${misses === 1 ? 'miss' : 'misses'} cost you ${misses * MISS_PENALTY}s.` : ' Clean run - zero misses!'} Best: {best}.</p>
      <div className="minigame-result__actions">
        <button type="button" className="minigame-cta" onClick={start}>SPRINT AGAIN ⏱</button>
        <button type="button" className="minigame-cta minigame-cta--ghost" onClick={share}>{copied ? 'SCORE COPIED ✓' : 'FLEX YOUR SCORE 📋'}</button>
      </div>
      <div className="minigame-links">
        <Link href="/chessdle">Try today&apos;s CHESSDLE →</Link>
        <Link href="/">← Back to Chesterville</Link>
      </div>
    </section>}
    <MiniChester game="mate-sprint" label="SPRINT COACH" event={chesterEvent} />
  </main>;
}
