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
  const challengeRoom = (searchParams.get('room') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const isRemoteDuel = requestedMode === '1v1' && challengeRoom.length > 0;
  const mode = isRemoteDuel ? 'PVP_REMOTE' : requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode || 'COACH_OPENING';
  const [remoteRole, setRemoteRole] = useState<'w' | 'b' | null>(null);
  const [remoteStatus, setRemoteStatus] = useState(isRemoteDuel ? 'OPENING CHALLENGE ROOM...' : '');

  useEffect(() => {
    if (!isRemoteDuel) return;
    let cancelled = false;
    let peer: any = null;
    let connection: any = null;
    const configure = (conn: any, role: 'w' | 'b') => {
      connection = conn;
      conn.on('open', () => {
        if (cancelled) return;
        setRemoteRole(role);
        setRemoteStatus(role === 'w' ? 'CHALLENGER CONNECTED - YOU ARE WHITE' : 'CONNECTED - YOU ARE BLACK');
      });
      conn.on('data', (data: any) => {
        if (data?.type === 'move') window.dispatchEvent(new CustomEvent('remote-chess-move', { detail: data }));
      });
      conn.on('close', () => { if (!cancelled) setRemoteStatus('OPPONENT DISCONNECTED'); });
      conn.on('error', () => { if (!cancelled) setRemoteStatus('CONNECTION INTERRUPTED - REOPEN THE LINK'); });
    };
    const sendLocal = (event: Event) => connection?.open && connection.send({ type: 'move', ...(event as CustomEvent).detail });
    window.addEventListener('local-chess-move', sendLocal);
    void import('peerjs').then(({ default: Peer }) => {
      if (cancelled) return;
      // First device to claim the room id hosts (plays white); the second joins as black.
      peer = new Peer(`chess-town-${challengeRoom}`);
      peer.on('open', () => { if (!cancelled) setRemoteStatus('ROOM OPEN - SHARE THE LINK, YOU ARE WHITE'); });
      peer.on('connection', (conn: any) => configure(conn, 'w'));
      peer.on('error', (err: any) => {
        if (cancelled) return;
        if (err?.type === 'unavailable-id') {
          peer?.destroy?.();
          peer = new Peer();
          peer.on('open', () => {
            if (cancelled) return;
            setRemoteStatus('JOINING CHALLENGE...');
            configure(peer.connect(`chess-town-${challengeRoom}`, { reliable: true }), 'b');
          });
          peer.on('error', () => { if (!cancelled) setRemoteStatus('COULD NOT JOIN - ASK FOR A FRESH LINK'); });
        } else {
          setRemoteStatus('COULD NOT OPEN THE ROOM - TRY AGAIN');
        }
      });
    });
    return () => {
      cancelled = true;
      window.removeEventListener('local-chess-move', sendLocal);
      try { connection?.close?.(); } catch {}
      try { peer?.destroy?.(); } catch {}
    };
  }, [isRemoteDuel, challengeRoom]);
  // Onboarding skill (set on /chess): tailors Chester's opening and the engine level.
  const skill = searchParams.get('skill') || '';
  const difficulty = skill === 'good' ? 'EXPERT' : skill === 'decent' ? 'INTERMEDIATE' : 'BEGINNER';
  const opponentLabel = mode === 'PVP_REMOTE' ? 'REMOTE CHALLENGER' : mode === 'PVP_LOCAL' ? 'YOUR RIVAL' : mode === '2V2' ? "CHESTER'S CHAOS CREW" : 'CHESTER';
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
    <ChessGameBoardShell capturedPieces={capturedPieces} commentary={commentary} isThinking={isThinking} opponentLabel={opponentLabel} opponentStatus={mode === 'PVP_REMOTE' ? (remoteStatus || 'CONNECTING...') : mode === 'PVP_LOCAL' ? 'LOCAL 1V1 DUEL' : mode === '2V2' ? '2V2 CHAOS' : 'LIVE ENGINE'} helpText="Start with checks, captures, and threats. Then choose the move that improves your center control or development without exposing your king." chatContext={`Chess Town game mode: ${mode}.`}>
      <DojoEngine mode={mode} playerColor={mode === 'PVP_REMOTE' ? remoteRole : null} difficulty={difficulty} />
    </ChessGameBoardShell>
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} onClose={() => setReport(null)} />}
  </>;
}

export default function PlayChesterPage() {
  return <Suspense fallback={<main className="play-chester-page" aria-label="Loading Play Chester" />}><PlayChesterGame /></Suspense>;
}
