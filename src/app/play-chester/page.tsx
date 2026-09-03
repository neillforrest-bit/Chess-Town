'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { askChesterChat } from '@/app/actions';
import { CapturedPieceJail, type CapturedPiece } from '@/components/CapturedPieceJails';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import { ChessGameTools, ChesterTeleprompter } from '@/components/ChesterUI';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

type GameReport = { gradeHistory: GradedMove[] };

export default function PlayChesterPage() {
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [commentary, setCommentary] = useState('Your board is live. Claim the center and make Chester work for his lunch.');
  const [isThinking, setIsThinking] = useState(false);
  const [report, setReport] = useState<GameReport | null>(null);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const startGame = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode: 'COACH_OPENING' } })), 0);
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
  }, []);

  useEffect(() => {
    if (!report) return;
    setReviewLoading(true);
    void askChesterChat(JSON.stringify({
      type: 'post-game-report',
      gradeHistory: report.gradeHistory,
      instruction: 'You are Chester, a witty but constructive chess coach. Review this complete move-grade history. Give a concise personalized performance review, call out one strength and one next improvement, and mention the final GPA. Do not invent moves not in the history.',
    })).then(setReview).finally(() => setReviewLoading(false));
  }, [report]);

  return <main className="play-chester-page" aria-label="Play Chester">
    <header className="play-chester-opponent"><span>OPPONENT</span><b>CHESTER</b><small>LIVE ENGINE</small></header>
    <section className="play-chester-board-stack">
      <CapturedPieceJail capturedPieces={capturedPieces} color="b" label="CHESTER CAPTURED" />
      <div className="play-chester-board aspect-square"><DojoEngine mode="COACH_OPENING" difficulty="INTERMEDIATE" /></div>
      <CapturedPieceJail capturedPieces={capturedPieces} color="w" label="YOU CAPTURED" />
      <ChesterTeleprompter text={commentary} isThinking={isThinking} isMobile />
      <ChessGameTools helpText="Start with checks, captures, and threats. Then choose the move that improves your center control or development without exposing your king." context="Play Chester single-player game." />
    </section>
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} onClose={() => setReport(null)} />}
  </main>;
}
