'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProfile, recordDailyAttempt, type ProfileState } from '@/lib/profile';
import NeonChessboard from '@/components/NeonChessboard';
import ChessGameBoardShell from '@/components/ChessGameBoardShell';

type Puzzle = { phase: string; title: string; fen: string; line: string[]; choices: string[][]; idea: string; why: string[]; hint: string; takeaway: string };
const PUZZLES: Puzzle[] = [
  {
    phase: 'MIDGAME', title: 'Break the Pin', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 4 6', line: ['d4', 'Re1'], choices: [['d4', 'h3', 'Re1'], ['Re1', 'h3', 'a3']],
    idea: 'One of your knights is pinned: moving it would expose your queen. You do not have to live with that. A well-timed pawn move can break the pin and start a fight on your terms.',
    why: ['The pawn breaks the centre. It attacks the bishop and unpins your knight at the same time: two jobs, one move.', 'The rook slides onto the central file. Rooks want open roads with no pawns in the way, and this one is now staring at the enemy half of the board.'],
    hint: 'Look for the most forcing idea first. A pawn shove in the centre asks the bishop a question it must answer right now.',
    takeaway: 'Pattern to keep: when a piece is pinned, a central pawn break can flip the pressure. Centre first, pin second.',
  },
  {
    phase: 'ENDGAME', title: 'Activate the King', fen: '8/5pk1/3p2p1/3Pp3/2P1P3/1P3K2/6PP/8 w - - 0 35', line: ['Ke3', 'b4'], choices: [['Ke3', 'h4', 'b4'], ['b4', 'h4', 'g4']],
    idea: 'Only pawns and kings are left. In an endgame the king stops hiding and becomes a fighting piece. Whoever wakes their king first usually wins.',
    why: ['The king walks toward the middle. In an endgame, every step your king takes toward the action is worth points.', 'Now the pawns start rolling. An active king plus advancing pawns is how endgames are actually won.'],
    hint: 'Forget pawn moves for a moment. Which piece has spent the whole game hiding in the corner and can finally lead?',
    takeaway: 'Pattern to keep: endgame rule number one is bring the king up. A king in the middle is a fighter, not a coward.',
  },
  {
    phase: 'MIDGAME', title: 'Castle Before Chaos', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 4', line: ['O-O', 'Re1'], choices: [['O-O', 'Qe2', 'a3'], ['Re1', 'h3', 'a3']],
    idea: 'Your king is still standing in the centre, exactly where the battle is about to start. Strong players tuck the king away early and fight with everything else.',
    why: ['Castling does two jobs at once: the king gets a bunker and the rook joins the game. It is the only move in chess that moves two pieces.', 'With the king safe, the rook takes the central file and starts asking the questions.'],
    hint: 'There is a special move available that moves two pieces at once and makes your king much harder to attack.',
    takeaway: 'Pattern to keep: castle inside your first ten moves and most beginner disasters simply never happen.',
  },
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
    return attempt ? { correct: true, timeMs: attempt.timeMs, points: attempt.points, message: `Already solved today. ${puzzle.takeaway}` } : null;
  });
  const chooseMove = (move: string) => {
    if (!profile || result?.correct) return;
    const firstMoveAt = startedAt ?? getTimestamp();
    if (!startedAt) setStartedAt(firstMoveAt);
    const correct = move === puzzle.line[moveIndex];
    if (!correct) { setMistakes((current) => current + 1); setResult({ correct: false, message: `Not that one. ${puzzle.hint}` }); return; }
    if (moveIndex < puzzle.line.length - 1) { setMoveIndex((current) => current + 1); setResult({ correct: false, message: `Yes. ${puzzle.why[moveIndex]} Now find the follow-up.` }); return; }
    const timeMs = Math.round(getTimestamp() - firstMoveAt);
    const saved = recordDailyAttempt({ date, timeMs, accuracy: Math.max(0, 100 - mistakes * 25) });
    setProfile(saved.profile);
    setResult({ correct: true, timeMs, points: saved.points, message: saved.alreadyCompleted ? `Today was already in your scorebook. ${puzzle.takeaway}` : `Solved${mistakes ? ` with ${mistakes} ${mistakes === 1 ? 'miss' : 'misses'}` : ' clean'}. ${puzzle.why[moveIndex]} ${puzzle.takeaway}` });
  };
  const leaderboard = [...seededLeaderboard, ...(profile?.dailyAttempts[date] ? [{ name: profile.username, time: profile.dailyAttempts[date].timeMs, accuracy: profile.dailyAttempts[date].accuracy }] : [])].sort((left, right) => left.time - right.time).slice(0, 10);
  const commentary = result?.message || `${puzzle.idea} Move ${moveIndex + 1} of ${puzzle.line.length}: find the forcing idea.`;
  return <ChessGameBoardShell commentary={commentary} opponentLabel="CHESTER" opponentStatus={`DAILY CHALLENGE · ${date}`} helpText={puzzle.hint} chatContext={`Daily Challenge: ${puzzle.title}. Move ${moveIndex + 1} of ${puzzle.line.length}. The idea: ${puzzle.idea}`} boardHeader={<div className="daily-board-heading"><span>{puzzle.phase} START · MOVE {moveIndex + 1}/{puzzle.line.length}</span><h2>{puzzle.title}</h2></div>} footer={<div className="daily-puzzle"><div className="daily-choices">{puzzle.choices[moveIndex].map((move) => <button key={move} onClick={() => chooseMove(move)} disabled={result?.correct}>{move}</button>)}</div>{result && <p className={result.correct ? 'daily-success' : 'daily-error'}>{result.message}{result.timeMs ? ` ${formatTime(result.timeMs)} · +${result.points} points.` : ''}</p>}{result?.correct && <p className="daily-success"><Link href="/play-chester">PRACTISE THIS PATTERN VS CHESTER →</Link></p>}</div>}><NeonChessboard fen={puzzle.fen} label={`${puzzle.phase} position`} /></ChessGameBoardShell>;
}
