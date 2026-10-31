'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { askChesterChat } from '@/app/actions';
import type { CapturedPiece } from '@/components/CapturedPieceJails';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import ChessGameBoardShell from '@/components/ChessGameBoardShell';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

type GameReport = { gradeHistory: GradedMove[] };

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode || 'COACH_OPENING';
  // Onboarding skill (set on /chess): tailors Chester's opening and the engine level.
  const skill = searchParams.get('skill') || '';
  const difficulty = skill === 'good' ? 'EXPERT' : skill === 'decent' ? 'INTERMEDIATE' : 'BEGINNER';
  const opponentLabel = mode === 'PVP_LOCAL' ? 'YOUR RIVAL' : mode === '2V2' ? "CHESTER'S CHAOS CREW" : 'CHESTER';
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const openingLines: Record<string, string> = {
    never: "Welcome! Tap any white piece and I'll light up where it can move. I'll coach you through your very first game.",
    bit: "Welcome back to the board! I'll coach as we go - tap a piece to see your options.",
    hard: "Deep breath - chess is just one good move at a time. Tap a piece, I'll show your options, and I'll explain every step.",
    decent: 'A proper game, then. I play fair, I coach light, and I grade honestly. Your move.',
    good: 'No mercy tonight. Full-strength Chester, honest grading. Show me what you have.',
  };
  const [commentary, setCommentary] = useState(openingLines[skill] || 'Your board is live. Claim the center and make Chester work for his lunch.');
  const [isThinking, setIsThinking] = useState(false);
  const [report, setReport] = useState<GameReport | null>(null);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const startGame = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const handleCapture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const handleBanter = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; move?: string; grade?: string }>).detail;
      if (!detail) return;
      setCommentary(detail.grade ? `${detail.move || 'That move'} earns a ${detail.grade}. ${detail.message || 'Chester has thoughts.'}` : detail.message || 'Chester is watching.');
    };
    const handleReport = (event: Event) => setReport((event as CustomEvent<GameReport>).detail);
    window.addEventListener('piece-captured', handleCapture);
    window.addEventListener('dojo-banter', handleBanter);
    window.addEventListener('game-report', handleReport);
    return () => {
      window.clearTimeout(startGame);
      window.removeEventListener('piece-captured', handleCapture);
      window.removeEventListener('dojo-banter', handleBanter);
      window.removeEventListener('game-report', handleReport);
    };
  }, [mode]);

  useEffect(() => {
    if (!report) return;
    setReviewLoading(true);
    void askChesterChat(JSON.stringify({
      type: 'post-game-report',
      gradeHistory: report.gradeHistory,
      instruction: 'You are Chester, a witty but constructive chess coach. Review this complete move-grade history. Give a concise personalized performance review, call out one strength and one next improvement, and mention the final GPA. Do not invent moves not in the history.',
    })).then(setReview).finally(() => setReviewLoading(false));
  }, [report]);

  return <>
    <ChessGameBoardShell capturedPieces={capturedPieces} commentary={commentary} isThinking={isThinking} opponentLabel={opponentLabel} opponentStatus={mode === 'PVP_LOCAL' ? 'LOCAL 1V1 DUEL' : mode === '2V2' ? '2V2 CHAOS' : 'LIVE ENGINE'} helpText="Start with checks, captures, and threats. Then choose the move that improves your center control or development without exposing your king." chatContext={`Chess Town game mode: ${mode}.`}>
      <DojoEngine mode={mode} difficulty={difficulty} />
    </ChessGameBoardShell>
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} onClose={() => setReport(null)} />}
  </>;
}

export default function PlayChesterPage() {
  return <Suspense fallback={<main className="play-chester-page" aria-label="Loading Play Chester" />}><PlayChesterGame /></Suspense>;
}
