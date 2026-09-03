'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getProfile, recordDailyAttempt, type ProfileState } from '@/lib/profile';
import NeonChessboard from '@/components/NeonChessboard';
import { ChesterTeleprompter, ChessGameTools } from '@/components/ChesterUI';
import ChesterHost from '@/components/ChesterHost';

const PUZZLES = [
  { phase: 'MIDGAME', title: 'Break the Pin', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 4 6', line: ['d4', 'Re1'], choices: [['d4', 'h3', 'Re1'], ['Re1', 'h3', 'a3']] },
  { phase: 'ENDGAME', title: 'Activate the King', fen: '8/5pk1/3p2p1/3Pp3/2P1P3/1P3K2/6PP/8 w - - 0 35', line: ['Ke3', 'b4'], choices: [['Ke3', 'h4', 'b4'], ['b4', 'h4', 'g4']] },
  { phase: 'MIDGAME', title: 'Castle Before Chaos', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 4', line: ['O-O', 'Re1'], choices: [['O-O', 'Qe2', 'a3'], ['Re1', 'h3', 'a3']] },
];
const seededLeaderboard = [{ name: 'Brendan', time: 14200, accuracy: 100 }, { name: 'Z-Man', time: 18900, accuracy: 100 }, { name: 'Gabe', time: 26300, accuracy: 92 }];

function utcDate() { return new Date().toISOString().slice(0, 10); }
function formatTime(milliseconds: number) { return `${String(Math.floor(milliseconds / 60000)).padStart(2, '0')}:${((milliseconds % 60000) / 1000).toFixed(1).padStart(4, '0')}s`; }
function getTimestamp() { return performance.now(); }
export default function DailyChallengePage() {
  const date = utcDate();
  const puzzle = PUZZLES[Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) % PUZZLES.length];
  const [profile, setProfile] = useState<ProfileState>(() => getProfile());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; timeMs?: number; points?: number; message: string } | null>(() => {
    const attempt = getProfile().dailyAttempts[date];
    return attempt ? { correct: true, timeMs: attempt.timeMs, points: attempt.points, message: 'You have already completed today’s challenge.' } : null;
  });
  const chooseMove = (move: string) => {
    if (!profile || result?.correct) return;
    const firstMoveAt = startedAt ?? getTimestamp();
    if (!startedAt) setStartedAt(firstMoveAt);
    const correct = move === puzzle.line[moveIndex];
    if (!correct) { setMistakes((current) => current + 1); setResult({ correct: false, message: 'Not quite. Chester has noted the attempt; find the forcing idea.' }); return; }
    if (moveIndex < puzzle.line.length - 1) { setMoveIndex((current) => current + 1); setResult({ correct: false, message: 'Good. Keep converting the advantage.' }); return; }
    const timeMs = Math.round(getTimestamp() - firstMoveAt);
    const saved = recordDailyAttempt({ date, timeMs, accuracy: Math.max(0, 100 - mistakes * 25) });
    setProfile(saved.profile);
    setResult({ correct: true, timeMs, points: saved.points, message: saved.alreadyCompleted ? 'Today is already in your scorebook.' : 'Solved. Chester approves this bit of violence.' });
  };
  const leaderboard = [...seededLeaderboard, ...(profile?.dailyAttempts[date] ? [{ name: profile.username, time: profile.dailyAttempts[date].timeMs, accuracy: profile.dailyAttempts[date].accuracy }] : [])].sort((left, right) => left.time - right.time).slice(0, 10);
  const commentary = result?.message || `Find the forcing line. Chester is watching move ${moveIndex + 1} of ${puzzle.line.length}.`;
  return <main className="daily-page"><header className="daily-header"><div><span>CHESTER CHALLENGE · {date} UTC</span><h1>Win the Position.</h1></div><Link href="/">Town</Link></header><ChesterHost eyebrow="CHESTER'S DAILY ORDER" instruction={`Solve today's ${puzzle.title} puzzle in ${puzzle.line.length} moves or I am revoking your grandmaster card. Find the forcing line.`} /><section className="daily-grid"><div className="daily-puzzle"><span className="daily-phase">{puzzle.phase} START · MOVE {moveIndex + 1}/{puzzle.line.length}</span><h2>{puzzle.title}</h2><NeonChessboard fen={puzzle.fen} label={`${puzzle.phase} position`} /><div className="daily-commentary"><ChesterTeleprompter text={commentary} isThinking={false} isMobile /></div><ChessGameTools helpText="Look for forcing moves first: checks, captures, and immediate threats. Then compare each candidate against the puzzle's objective." context={`Daily Challenge: ${puzzle.title}. Move ${moveIndex + 1} of ${puzzle.line.length}.`} /><div className="daily-choices">{puzzle.choices[moveIndex].map((move) => <button key={move} onClick={() => chooseMove(move)} disabled={result?.correct}>{move}</button>)}</div>{result && <p className={result.correct ? 'daily-success' : 'daily-error'}>{result.message}{result.timeMs ? ` ${formatTime(result.timeMs)} · +${result.points} points.` : ''}</p>}</div><aside className="daily-leaderboard"><h2>Top 10 Fastest</h2><div className="daily-row daily-row--head"><span>Rank</span><span>Player</span><span>Time</span><span>Accuracy</span></div>{leaderboard.map((entry, index) => <div className="daily-row" key={`${entry.name}-${index}`}><span>#{index + 1}</span><b>{entry.name}</b><span>{formatTime(entry.time)}</span><span>{entry.accuracy}%</span></div>)}<small>Leaderboard entries are stored in this browser until shared accounts are configured.</small></aside></section></main>;
}