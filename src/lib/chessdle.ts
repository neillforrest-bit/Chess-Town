// Chessdle: one mate-in-1 puzzle per UTC day, same for every player worldwide.
// Streaks and results live in localStorage; share text is spoiler-free.
import { Chess } from 'chess.js';
import { MATE_PUZZLES, type MatePuzzle } from './mate-puzzles';

export type GuessFeedback = 'mate' | 'check' | 'capture' | 'other';
export type ChessdleResult = { day: number; guesses: string[]; won: boolean };
type ChessdleStore = { streak: number; bestStreak: number; results: Record<string, ChessdleResult> };

const STORE_KEY = 'chessdle-v1';
const EPOCH_DAY = Math.floor(Date.UTC(2026, 8, 23) / 86400000); // Chessdle #1
export const MAX_GUESSES = 6;

export function chessdleDay(now = new Date()): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

export function todaysChessdle(now = new Date()): { puzzle: MatePuzzle; number: number; day: number } {
  const day = chessdleDay(now);
  return { puzzle: MATE_PUZZLES[day % MATE_PUZZLES.length], number: day - EPOCH_DAY + 1, day };
}

export function classifyGuess(fen: string, from: string, to: string): { feedback: GuessFeedback; san: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({ from, to, promotion: 'q' });
    if (!move) return null;
    if (chess.isCheckmate()) return { feedback: 'mate', san: move.san };
    if (chess.isCheck()) return { feedback: 'check', san: move.san };
    if (move.captured) return { feedback: 'capture', san: move.san };
    return { feedback: 'other', san: move.san };
  } catch { return null; }
}

export function feedbackEmoji(feedback: GuessFeedback): string {
  return feedback === 'mate' ? '🟩' : feedback === 'check' || feedback === 'capture' ? '🟨' : '⬛';
}

function readStore(): ChessdleStore {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) { const parsed = JSON.parse(raw); return { streak: parsed.streak || 0, bestStreak: parsed.bestStreak || 0, results: parsed.results || {} }; }
  } catch { /* private browsing */ }
  return { streak: 0, bestStreak: 0, results: {} };
}

export function getChessdleState(day: number): { streak: number; bestStreak: number; result: ChessdleResult | null } {
  if (typeof window === 'undefined') return { streak: 0, bestStreak: 0, result: null };
  const store = readStore();
  return { streak: store.streak, bestStreak: store.bestStreak, result: store.results[String(day)] || null };
}

export function recordChessdleResult(day: number, guesses: string[], won: boolean): { streak: number; bestStreak: number } {
  const store = readStore();
  if (!store.results[String(day)]) {
    store.results[String(day)] = { day, guesses, won };
    const yesterday = store.results[String(day - 1)];
    store.streak = won ? (yesterday?.won ? store.streak + 1 : 1) : 0;
    store.bestStreak = Math.max(store.bestStreak, store.streak);
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* private browsing */ }
  }
  return { streak: store.streak, bestStreak: store.bestStreak };
}

export function buildShareText(number: number, feedbacks: GuessFeedback[], won: boolean, streak: number): string {
  const grid = feedbacks.map(feedbackEmoji).join('');
  return [
    `CHESSDLE #${number} ${won ? feedbacks.length : 'X'}/${MAX_GUESSES}`,
    grid,
    streak > 0 ? `Streak: ${streak}${streak >= 3 ? ' 🔥' : ''}` : '',
    typeof window !== 'undefined' ? `${window.location.origin}/chessdle` : 'chess-town.vercel.app/chessdle',
  ].filter(Boolean).join('\n');
}
