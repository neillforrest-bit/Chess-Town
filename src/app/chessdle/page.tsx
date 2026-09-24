'use client';

// CHESSDLE - the daily mate-in-1. One puzzle per UTC day, same for every player
// worldwide, six guesses, a streak counter and a spoiler-free emoji share grid.
// Fully offline: the puzzle bank ships with the app and chess.js checks mates.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import TapBoard from '@/components/TapBoard';
import MiniChester from '@/components/MiniChester';
import { describeMove } from '@/lib/move-words';
import {
  MAX_GUESSES, buildShareText, classifyGuess, feedbackEmoji,
  getChessdleState, recordChessdleResult, todaysChessdle, type GuessFeedback,
} from '@/lib/chessdle';

const FEEDBACK_LINES: Record<GuessFeedback, string> = {
  mate: 'CHECKMATE! You found it.',
  check: 'That checks the king - very close, but not mate.',
  capture: 'A capture! Good instinct - not the killer blow though.',
  other: 'Nothing forcing there. Look for checks, captures and threats.',
};

export default function ChessdlePage() {
  const { puzzle, number, day } = useMemo(() => todaysChessdle(), []);
  const [guesses, setGuesses] = useState<{ uci: string; feedback: GuessFeedback; san: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = getChessdleState(day).result;
    if (!saved) return [];
    return saved.guesses.map((uci) => {
      const classified = classifyGuess(puzzle.fen, uci.slice(0, 2), uci.slice(2, 4));
      return classified ? { uci, feedback: classified.feedback, san: classified.san } : null;
    }).filter(Boolean) as { uci: string; feedback: GuessFeedback; san: string }[];
  });
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [chesterEvent, setChesterEvent] = useState<{ type: string; seed: number } | null>(null);

  const won = guesses.some((g) => g.feedback === 'mate');
  const done = won || guesses.length >= MAX_GUESSES;
  const { streak, bestStreak } = typeof window === 'undefined' ? { streak: 0, bestStreak: 0 } : getChessdleState(day);

  const guess = (from: string, to: string, promotion?: string) => {
    if (done) return;
    const classified = classifyGuess(puzzle.fen, from, to);
    if (!classified) return;
    const next = [...guesses, { uci: `${from}${to}${promotion || ''}`, feedback: classified.feedback, san: classified.san }];
    setGuesses(next);
    const nowDone = classified.feedback === 'mate' || next.length >= MAX_GUESSES;
    if (nowDone) recordChessdleResult(day, next.map((g) => g.uci), classified.feedback === 'mate');
    if (classified.feedback === 'mate') { setMessage(`CHECKMATE in ${next.length}! ${next.length === 1 ? 'First guess - are you Joseph in disguise?' : 'The town salutes you.'}`); setChesterEvent({ type: 'win', seed: next.length }); }
    else if (next.length >= MAX_GUESSES) { setMessage(`Out of guesses. The mate was ${describeMove(puzzle.fen, puzzle.solution) || 'there all along'}. Tomorrow is a new puzzle.`); setChesterEvent({ type: 'lose', seed: next.length }); }
    else { setMessage(FEEDBACK_LINES[classified.feedback]); setChesterEvent({ type: classified.feedback === 'other' ? 'miss' : 'close', seed: next.length }); }
  };

  const share = async () => {
    const text = buildShareText(number, guesses.map((g) => g.feedback), won, streak);
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
      <span className="minigame-kicker">ONE PUZZLE · ONE DAY · EVERY PLAYER ON EARTH</span>
      <h1>CHESSDLE <em>#{number}</em></h1>
      <p>White to play. Find checkmate in one move - you have {MAX_GUESSES} guesses. 🟩 mate · 🟨 check or capture · ⬛ nothing forcing</p>
    </header>

    <div className="minigame-board">
      <TapBoard fen={puzzle.fen} locked={done} onMove={guess} label={`Chessdle #${number}: white to play and mate in one`} />
    </div>

    <div className="chessdle-guesses" aria-live="polite">
      {guesses.map((g, i) => <span key={i} className={`chessdle-guess chessdle-guess--${g.feedback}`} title={g.san}>{feedbackEmoji(g.feedback)}</span>)}
      {!done && Array.from({ length: MAX_GUESSES - guesses.length }).map((_, i) => <span key={`e${i}`} className="chessdle-guess chessdle-guess--empty" />)}
    </div>

    {message && <p className={`minigame-message ${won ? 'minigame-message--win' : ''}`}>{message}</p>}

    {done && <section className="minigame-result">
      <div className="chessdle-streaks">
        <div><b>{streak}</b><span>STREAK</span></div>
        <div><b>{bestStreak}</b><span>BEST</span></div>
      </div>
      <button type="button" className="minigame-cta" onClick={share}>{copied ? 'COPIED - PASTE IT TO A FRIEND ✓' : 'SHARE YOUR GRID 📋'}</button>
      <p className="minigame-sub">Spoiler-free: your friends see the emojis, never the moves. New puzzle at midnight.</p>
      <div className="minigame-links">
        <Link href="/mate-sprint">Can&apos;t wait? Play MATE SPRINT →</Link>
        <Link href="/">← Back to Chesterville</Link>
      </div>
    </section>}

    {!done && guesses.length > 0 && <p className="minigame-sub">{MAX_GUESSES - guesses.length} {MAX_GUESSES - guesses.length === 1 ? 'guess' : 'guesses'} left. Tap a white piece, then tap where it goes.</p>}
    {!done && guesses.length === 0 && <p className="minigame-sub">Tap a white piece, then tap where it goes.</p>}
    <MiniChester game="chessdle" label="PUZZLE CORNER" event={chesterEvent} />
  </main>;
}
