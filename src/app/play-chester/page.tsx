'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { askChesterChat } from '@/app/actions';
import type { CapturedPiece } from '@/components/CapturedPieceJails';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import ChessGameBoardShell from '@/components/ChessGameBoardShell';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type GameReport = { gradeHistory: GradedMove[] };
type CoachPrompt = { kind: 'move' | 'help'; move?: string; fen: string; bestMove?: string | null; continuation?: string[]; evaluation?: number | string | null };

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Easy' },
  { value: 'INTERMEDIATE', label: 'Medium' },
  { value: 'ADVANCED', label: 'Hard' },
  { value: 'EXPERT', label: 'Expert' },
];

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode || 'COACH_OPENING';
  const opponentLabel = mode === 'PVP_LOCAL' ? 'YOUR RIVAL' : mode === '2V2' ? "CHESTER'S CHAOS CREW" : 'CHESTER';
  const [difficulty, setDifficulty] = useState<Difficulty>('INTERMEDIATE');
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [commentary, setCommentary] = useState('Your board is live. Claim the center and make Chester work for his lunch.');
  const [isThinking, setIsThinking] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<CoachPrompt | null>(null);
  const [coachReply, setCoachReply] = useState('');
  const [helpRemaining, setHelpRemaining] = useState(3);
  const [report, setReport] = useState<GameReport | null>(null);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    setHelpRemaining(3);
    setCoachPrompt(null);
    const startGame = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const handleCapture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const handleBanter = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; move?: string; grade?: string }>).detail;
      if (!detail) return;
      setCommentary(detail.grade ? `${detail.move || 'That move'} earns a ${detail.grade}. ${detail.message || 'Chester has thoughts.'}` : detail.message || 'Chester is watching.');
    };
    const handleReport = (event: Event) => setReport((event as CustomEvent<GameReport>).detail);
    const coach = (event: Event) => setCoachPrompt({ kind: 'move', ...(event as CustomEvent<CoachPrompt>).detail });
    const help = (event: Event) => setCoachPrompt({ kind: 'help', ...(event as CustomEvent<CoachPrompt>).detail });
    window.addEventListener('piece-captured', handleCapture);
    window.addEventListener('dojo-banter', handleBanter);
    window.addEventListener('game-report', handleReport);
    window.addEventListener('chester-coaching-pause', coach);
    window.addEventListener('chester-help-response', help);
    return () => {
      window.clearTimeout(startGame);
      window.removeEventListener('piece-captured', handleCapture);
      window.removeEventListener('dojo-banter', handleBanter);
      window.removeEventListener('game-report', handleReport);
      window.removeEventListener('chester-coaching-pause', coach);
      window.removeEventListener('chester-help-response', help);
    };
  }, [mode]);

  useEffect(() => {
    if (!coachPrompt) return;
    setIsThinking(true);
    setCoachReply('');
    const context = coachPrompt.kind === 'help'
      ? `The player used a limited help call. Position FEN: ${coachPrompt.fen}. Engine-recommended move: ${coachPrompt.bestMove || 'unavailable'}. Suggested continuation: ${(coachPrompt.continuation || []).join(' ') || 'unavailable'}. Explain the idea without assuming UCI notation is readable.`
      : `The player just played ${coachPrompt.move} in FEN ${coachPrompt.fen}. Engine-recommended alternative: ${coachPrompt.bestMove || 'unavailable'}. Principal variation: ${(coachPrompt.continuation || []).join(' ') || 'unavailable'}. Ask one reflective question about that move, name the recommended alternative or plan when available, and explain the chess principle in plain language.`;
    void askChesterChat(JSON.stringify({ type: 'coach', message: coachPrompt.kind === 'help' ? 'Call Chester for help.' : `Coach my move ${coachPrompt.move}.`, context }))
      .then((reply) => { setCoachReply(reply); setCommentary(reply); })
      .finally(() => setIsThinking(false));
  }, [coachPrompt]);

  useEffect(() => {
    if (!report) return;
    setReviewLoading(true);
    void askChesterChat(JSON.stringify({
      type: 'post-game-report',
      gradeHistory: report.gradeHistory,
      instruction: 'You are Chester, a witty but constructive chess coach. Give a fun Sunday-morning-quarterback review of this match: name one strength, one next improvement, and the final GPA. Do not invent moves not in the history.',
    })).then(setReview).finally(() => setReviewLoading(false));
  }, [report]);

  const resumeGame = () => {
    setCoachPrompt(null);
    setCoachReply('');
    window.dispatchEvent(new CustomEvent('chester-resume-game'));
  };
  const callForHelp = () => {
    if (!helpRemaining || isThinking || coachPrompt) return;
    setHelpRemaining((current) => current - 1);
    setIsThinking(true);
    window.dispatchEvent(new CustomEvent('chester-help-request'));
  };

  return <>
    <ChessGameBoardShell capturedPieces={capturedPieces} commentary={commentary} isThinking={isThinking} opponentLabel={opponentLabel} opponentStatus={mode === 'PVP_LOCAL' ? 'LOCAL 1V1 DUEL' : mode === '2V2' ? '2V2 CHAOS' : 'LIVE SPOTFISH ENGINE'} helpText="Start with checks, captures, and threats. Then choose the move that improves your center control or development without exposing your king." chatContext={`Chess Town game mode: ${mode}.`} boardHeader={<div className="play-chester-controls"><div role="group" aria-label="Chester difficulty">{DIFFICULTIES.map(({ value, label }) => <button key={value} type="button" className={difficulty === value ? 'is-active' : ''} onClick={() => setDifficulty(value)} disabled={Boolean(coachPrompt)}>{label}</button>)}</div><button type="button" className="chester-help-button" onClick={callForHelp} disabled={!helpRemaining || isThinking || Boolean(coachPrompt)}>Call Chester for Help ({helpRemaining})</button></div>}>
      <DojoEngine mode={mode} difficulty={difficulty} />
    </ChessGameBoardShell>
    {coachPrompt && <section className="chester-coach-pause" role="dialog" aria-modal="true" aria-label="Chester coaching pause"><b>{coachPrompt.kind === 'help' ? 'CHESTER TO THE RESCUE' : `MOVE REVIEW: ${coachPrompt.move}`}</b><p>{isThinking ? 'Chester is studying the board...' : coachReply}</p>{!isThinking && <button type="button" onClick={resumeGame}>Continue game</button>}</section>}
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} onClose={() => setReport(null)} />}
  </>;
}

export default function PlayChesterPage() {
  return <Suspense fallback={<main className="play-chester-page" aria-label="Loading Play Chester" />}><PlayChesterGame /></Suspense>;
}
