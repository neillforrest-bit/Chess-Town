'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { askChesterChat } from '@/app/actions';
import type { CapturedPiece } from '@/components/CapturedPieceJails';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import { buildStoryRecap, getVerdict, personaCoaching, chesterOfflineChat, PERSONA_DESC } from '@/lib/chester-voice';
import { phrasesFromPgn } from '@/lib/move-words';
import { ChesterChatOverlay } from '@/components/ChesterUI';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type GameReport = { gradeHistory: GradedMove[]; pgn?: string };
type CoachPrompt = { kind: 'move' | 'help'; move?: string; movePhrase?: string | null; bestMovePhrase?: string | null; fen: string; bestMove?: string | null; continuation?: string[]; evaluation?: number | string | null; classification?: string | null; evalDelta?: number | null; evaluationBefore?: number | null; evaluationAfter?: number | null; captured?: string | null; check?: boolean; mate?: boolean };
const LEVELS: { value: Difficulty; label: string; note: string }[] = [
  { value: 'BEGINNER', label: 'ROOKIE', note: 'Chester leaves the door open' },
  { value: 'INTERMEDIATE', label: 'CLUB', note: 'A fair fight with teeth' },
  { value: 'ADVANCED', label: 'MASTER', note: 'Punishes loose pieces' },
  { value: 'EXPERT', label: 'NIGHTMARE', note: 'No mercy, no refunds' },
];
const LESSONS = [
  { title: 'Take the centre', body: 'Tap a pawn in front of your king or queen, then tap a glowing square. That opens the road for your other pieces.' },
  { title: 'Develop with purpose', body: 'Tap a horse-shaped knight or a bishop, then choose a glowing square. Bring one new teammate into the game.' },
  { title: 'Protect the king', body: 'Move your king two squares toward a rook when the road is clear. That special move is castling: king safe, rook ready.' },
];

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode || 'COACH_OPENING';
  const [difficulty, setDifficulty] = useState<Difficulty>('BEGINNER');
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<CoachPrompt | null>(null);
  const [coachReply, setCoachReply] = useState('');
  const [helpRemaining, setHelpRemaining] = useState(3);
  const [report, setReport] = useState<GameReport | null>(null);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [lessonStep, setLessonStep] = useState(0);
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'chester'; text: string; kind?: 'chat' }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [lastFen, setLastFen] = useState(START_FEN);
  const [moveTrail, setMoveTrail] = useState<{ move: string; classification?: string | null }[]>([]);
  const [lastBest, setLastBest] = useState<string | null>(null);
  const selectedLevel = useMemo(() => LEVELS.find((level) => level.value === difficulty)!, [difficulty]);
  const modeKicker = mode === 'PVP_LOCAL' ? 'FRIENDLY DUEL' : mode === '2V2' ? 'TAG MATCH' : 'PLAYING CHESTER';
  const modeTitle = mode === 'PVP_LOCAL' ? 'PASS & PLAY' : mode === '2V2' ? '2V2 CHAOS' : selectedLevel.label;
  const isFriendMode = mode === 'PVP_LOCAL' || mode === '2V2';

  useEffect(() => {
    if (!started) return;
    setHelpRemaining(difficulty === 'BEGINNER' ? 5 : 3); setCoachPrompt(null);
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const capture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const gameReport = (event: Event) => setReport((event as CustomEvent<GameReport>).detail);
    const coach = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; setCoachPrompt({ ...detail, kind: 'move' }); setLessonStep((step) => Math.min(2, step + 1)); if (detail.fen) setLastFen(detail.fen); if (detail.move) setMoveTrail((t) => [...t.slice(-14), { move: detail.move!, classification: detail.classification }]); if (detail.bestMove) setLastBest(detail.bestMove); };
    const help = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; setCoachPrompt({ ...detail, kind: 'help' }); if (detail.fen) setLastFen(detail.fen); if (detail.bestMove) setLastBest(detail.bestMove); };
    window.addEventListener('piece-captured', capture); window.addEventListener('game-report', gameReport); window.addEventListener('chester-coaching-pause', coach); window.addEventListener('chester-help-response', help);
    return () => { window.clearTimeout(timer); window.removeEventListener('piece-captured', capture); window.removeEventListener('game-report', gameReport); window.removeEventListener('chester-coaching-pause', coach); window.removeEventListener('chester-help-response', help); };
  }, [mode, started]);

  useEffect(() => {
    if (!coachPrompt) return;
    setIsThinking(true); setCoachReply('');
    const grounded = personaCoaching(coachPrompt, difficulty);
    const context = `You are Chester, ${PERSONA_DESC[difficulty]}. Stay in that voice, at most 3 sentences. Use this Stockfish evidence only. Move: ${coachPrompt.move || 'help request'}. Classification: ${coachPrompt.classification || 'unknown'}. Eval swing: ${coachPrompt.evalDelta ?? 'unknown'} centipawns. Best move: ${coachPrompt.bestMove || 'unknown'}. Principal variation: ${(coachPrompt.continuation || []).slice(0, 4).join(' ') || 'unknown'}. Explain the threat, plan and why in plain English (no centipawns, no engine jargon). Give one concrete next action. Never invent board facts. NEVER use chess notation or coordinates - describe moves in words, like 'knight to the kingside' or 'pawn two squares up'.`;
    void askChesterChat(JSON.stringify({ type: 'coach', message: coachPrompt.kind === 'help' ? 'Give me a strategic hint.' : `Review ${coachPrompt.move}.`, context }))
      .then((reply) => { const text = reply && !/messenger|delayed|unavailable/i.test(reply) ? reply : grounded; setCoachReply(text); })
      .catch(() => { setCoachReply(grounded); })
      .finally(() => setIsThinking(false));
  }, [coachPrompt]);

  useEffect(() => {
    if (!report) return;
    const phraseMap = phrasesFromPgn(report.pgn || '');
    const story = buildStoryRecap(report.gradeHistory, difficulty, (ply) => phraseMap.get(ply) || null);
    setReview(story);
    setReviewLoading(false);
    void askChesterChat(JSON.stringify({ type: 'post-game-report', gradeHistory: report.gradeHistory, persona: PERSONA_DESC[difficulty], instruction: 'Tell the story of this match in Chester’s voice: the turning point, what the player did well, one lesson, one concrete thing to try next game. At most 4 sentences, plain English, no engine jargon, and NEVER chess notation or coordinates - describe moves in words, like \'knight to the kingside\'.' }))
      .then((reply) => { if (reply && !/messenger|delayed|unavailable/i.test(reply)) setReview(reply); })
      .catch(() => undefined);
  }, [report, difficulty]);

  const sendChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    setChatInput(''); setChatError('');
    const history = [...chatMessages, { role: 'user' as const, text: message }];
    setChatMessages(history);
    setChatBusy(true);
    const lastMove = moveTrail[moveTrail.length - 1];
    const fallback = () => chesterOfflineChat(message, { persona: difficulty, fen: lastFen, lastMove: lastMove?.move, classification: lastMove?.classification, bestMove: lastBest, capturedCount: capturedPieces.length, historyCount: history.length });
    const context = `You are Chester, ${PERSONA_DESC[difficulty]}. You are chatting mid-game with your student. Live board FEN: ${lastFen}. Moves so far: ${moveTrail.map((m) => m.move).join(' ') || 'none yet'}. Last graded student move: ${lastMove ? `${lastMove.move} (${lastMove.classification || 'ungraded'})` : 'none'}. Engine-preferred idea: ${lastBest || 'unknown'}. Answer the student directly in at most 3 sentences. Be funny AND educational: every joke carries a chess lesson, every lesson lands a joke. Use only the FEN and record above for board facts - never invent pieces, squares, or lines. Plain English, no centipawns, no engine jargon.`;
    try {
      const reply = await askChesterChat(JSON.stringify({ type: 'chat', message, context, conversationHistory: history.slice(-8).map((m) => ({ role: m.role, text: m.text })) }));
      const text = reply && !/messenger|delayed|unavailable/i.test(reply) ? reply : fallback();
      setChatMessages([...history, { role: 'chester', text, kind: 'chat' }]);
    } catch {
      setChatMessages([...history, { role: 'chester', text: fallback(), kind: 'chat' }]);
    } finally {
      setChatBusy(false);
    }
  };

  const help = () => { if (!helpRemaining || isThinking) return; setHelpRemaining((n) => n - 1); setIsThinking(true); window.dispatchEvent(new CustomEvent('chester-help-request')); };

  if (!started) return <main className="chester-start-screen">
    <section><span>{isFriendMode ? modeKicker : 'CHESS-TOWN ACADEMY'}</span><h1>{isFriendMode ? modeTitle : 'PLAY CHESTER'}</h1><p>{isFriendMode ? (mode === 'PVP_LOCAL' ? 'Two players, one device. Hand it over after each move - Chester commentates every blunder.' : 'Two versus two, one device. Chester keeps score and commentary.') : 'Pick your opponent. Chester coaches the first three decisions, then lets you fight.'}</p>
      {!isFriendMode && <div className="chester-level-grid">{LEVELS.map((level) => <button key={level.value} className={difficulty === level.value ? 'is-active' : ''} onClick={() => setDifficulty(level.value)}><b>{level.label}</b><small>{level.note}</small></button>)}</div>}
      <button className="chester-start-button" onClick={() => setStarted(true)}>{isFriendMode ? 'START FRIEND GAME' : 'START GUIDED GAME'} <i>→</i></button>
    </section>
  </main>;

  const lesson = LESSONS[lessonStep];
  return <main className="chester-game" aria-label="Play Chester guided game">
    <header className="chester-game__top"><div><span>{modeKicker}</span><b>{modeTitle}</b></div><div className="chester-game__progress"><small>{lessonStep < 2 ? `LESSON ${lessonStep + 1}/3` : 'MATCH COACH LIVE'}</small><i style={{ width: `${((lessonStep + 1) / 3) * 100}%` }} /></div><button onClick={() => setStarted(false)}>LEVELS</button></header>
    <section className="chester-game__board">
      <div className="chester-board-frame"><DojoEngine mode={mode} difficulty={difficulty} /></div>
      <div className={`chester-live-line ${coachPrompt ? 'is-reviewing' : ''}`} aria-live="polite" style={coachPrompt?.kind === 'move' ? ({ '--verdict-color': getVerdict(coachPrompt.classification).color } as React.CSSProperties) : undefined}>
        <div className="chester-live-line__avatar" key={coachPrompt ? `${coachPrompt.move}-${coachPrompt.classification}` : 'idle'} aria-hidden="true">{coachPrompt?.kind === 'move' ? getVerdict(coachPrompt.classification).emoji : '♞'}</div>
        <div><span>{isThinking ? 'CHESTER IS READING THE BOARD…' : coachPrompt ? 'CHESTER / LIVE MOVE' : 'CHESTER / YOUR GUIDE'}</span><b>{coachPrompt?.kind === 'help' ? 'Try this idea' : coachPrompt ? <>On {coachPrompt.move} <i className="chester-verdict">{getVerdict(coachPrompt.classification).word}</i></> : lesson.title}</b><p>{coachPrompt ? (isThinking ? 'I’m checking the danger and your strongest next idea. Keep your eyes on the board.' : coachReply) : lesson.body}</p></div>
        {!isThinking && coachPrompt && <em>YOUR MOVE CONTINUES →</em>}
      </div>
      <div className="chester-game__actions"><button onClick={help} disabled={!helpRemaining || isThinking}>💡 HINT <small>{helpRemaining} LEFT</small></button><button onClick={() => setChatOpen(true)}>💬 CHAT</button><button onClick={() => window.dispatchEvent(new CustomEvent('request-resign'))}>🏳 RESIGN</button></div>
    </section>
    <aside className="chester-game__coach chester-game__coach--route">
      <span>TONIGHT’S TRAINING ROUTE</span><h2>LEARN WHILE YOU PLAY</h2><p>Chester’s notes arrive beside the live board. No pop-ups, no dismissing, no break in the game.</p>
      <ol>{LESSONS.map((item, index) => <li key={item.title} className={index === lessonStep ? 'is-active' : index < lessonStep ? 'is-done' : ''}><i>{index < lessonStep ? '✓' : index + 1}</i><span>{item.title}</span></li>)}</ol>
    </aside>
    {chatOpen && <div className="chess-game-sheet" role="dialog" aria-modal="true" aria-label="Chat with Chester">
      <div className="chess-game-sheet__backdrop" onClick={() => setChatOpen(false)} />
      <section className="chess-game-sheet__content">
        <header><b>CHAT WITH CHESTER</b><button type="button" onClick={() => setChatOpen(false)} aria-label="Close">×</button></header>
        <ChesterChatOverlay chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} onSendMessage={sendChat} isThinking={chatBusy} chatError={chatError} isMobile defaultExpanded />
      </section>
    </div>}
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} pgn={report.pgn} onClose={() => setReport(null)} />}
  </main>;
}

export default function PlayChesterPage() { return <Suspense fallback={<main className="chester-start-screen" />}><PlayChesterGame /></Suspense>; }
