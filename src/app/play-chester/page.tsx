'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { askChesterChat } from '@/app/actions';
import type { CapturedPiece } from '@/components/CapturedPieceJails';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type GameReport = { gradeHistory: GradedMove[] };
type CoachPrompt = { kind: 'move' | 'help'; move?: string; fen: string; bestMove?: string | null; continuation?: string[]; evaluation?: number | string | null };
const LEVELS: { value: Difficulty; label: string; note: string }[] = [
  { value: 'BEGINNER', label: 'ROOKIE', note: 'Chester leaves the door open' },
  { value: 'INTERMEDIATE', label: 'CLUB', note: 'A fair fight with teeth' },
  { value: 'ADVANCED', label: 'MASTER', note: 'Punishes loose pieces' },
  { value: 'EXPERT', label: 'NIGHTMARE', note: 'No mercy, no refunds' },
];
const LESSONS = [
  { title: 'Take the centre', body: 'Move a centre pawn. Pieces gain space and your army gets exits.' },
  { title: 'Develop with purpose', body: 'Bring out a knight or bishop. One move, one useful piece.' },
  { title: 'Protect the king', body: 'Prepare to castle. A safe king lets the rest of your army attack.' },
];

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode || 'COACH_OPENING';
  const [difficulty, setDifficulty] = useState<Difficulty>('BEGINNER');
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [commentary, setCommentary] = useState('Welcome to your first lesson. Take the centre. One brave pawn, no interpretive dancing.');
  const [isThinking, setIsThinking] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<CoachPrompt | null>(null);
  const [coachReply, setCoachReply] = useState('');
  const [helpRemaining, setHelpRemaining] = useState(3);
  const [report, setReport] = useState<GameReport | null>(null);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [lessonStep, setLessonStep] = useState(0);
  const [activePanel, setActivePanel] = useState<'board' | 'coach'>('board');
  const selectedLevel = useMemo(() => LEVELS.find((level) => level.value === difficulty)!, [difficulty]);

  useEffect(() => {
    if (!started) return;
    setHelpRemaining(3); setCoachPrompt(null);
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const capture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const banter = (event: Event) => { const d = (event as CustomEvent<{ message?: string; move?: string; grade?: string }>).detail; if (d) setCommentary(d.grade ? `${d.move || 'That move'} earns ${d.grade}. ${d.message || ''}` : d.message || 'Chester is watching.'); };
    const gameReport = (event: Event) => setReport((event as CustomEvent<GameReport>).detail);
    const coach = (event: Event) => { setCoachPrompt({ kind: 'move', ...(event as CustomEvent<CoachPrompt>).detail }); setActivePanel('coach'); setLessonStep((step) => Math.min(2, step + 1)); };
    const help = (event: Event) => { setCoachPrompt({ kind: 'help', ...(event as CustomEvent<CoachPrompt>).detail }); setActivePanel('coach'); };
    window.addEventListener('piece-captured', capture); window.addEventListener('dojo-banter', banter); window.addEventListener('game-report', gameReport); window.addEventListener('chester-coaching-pause', coach); window.addEventListener('chester-help-response', help);
    return () => { window.clearTimeout(timer); window.removeEventListener('piece-captured', capture); window.removeEventListener('dojo-banter', banter); window.removeEventListener('game-report', gameReport); window.removeEventListener('chester-coaching-pause', coach); window.removeEventListener('chester-help-response', help); };
  }, [mode, started]);

  useEffect(() => {
    if (!coachPrompt) return;
    setIsThinking(true); setCoachReply('');
    const fallback = coachPrompt.kind === 'help'
      ? `Try ${coachPrompt.bestMove || 'a developing move'}. Look for checks, captures and threats, then improve your least active piece.`
      : `${coachPrompt.move || 'That move'} is in the book. Compare it with ${coachPrompt.bestMove || 'the engine plan'} and ask: did I improve a piece, protect my king or create a threat?`;
    const context = coachPrompt.kind === 'help'
      ? `Position ${coachPrompt.fen}. Best move ${coachPrompt.bestMove || 'unavailable'}. Line ${(coachPrompt.continuation || []).join(' ') || 'unavailable'}. Give one plain-English idea and one move.`
      : `Player played ${coachPrompt.move}. Position ${coachPrompt.fen}. Better move ${coachPrompt.bestMove || 'unavailable'}. Line ${(coachPrompt.continuation || []).join(' ') || 'unavailable'}. Give one short lesson and one next action.`;
    void askChesterChat(JSON.stringify({ type: 'coach', message: coachPrompt.kind === 'help' ? 'Help me.' : `Coach ${coachPrompt.move}.`, context }))
      .then((reply) => { const text = reply || fallback; setCoachReply(text); setCommentary(text); })
      .catch(() => { setCoachReply(fallback); setCommentary(fallback); })
      .finally(() => setIsThinking(false));
  }, [coachPrompt]);

  useEffect(() => { if (!report) return; setReviewLoading(true); void askChesterChat(JSON.stringify({ type: 'post-game-report', gradeHistory: report.gradeHistory, instruction: 'Give a concise Chester match review: one strength, one improvement and final GPA.' })).then(setReview).catch(() => setReview('Good fight. Keep developing before attacking and your next game will feel far less like a furniture fire.')).finally(() => setReviewLoading(false)); }, [report]);

  const resume = () => { setCoachPrompt(null); setCoachReply(''); setActivePanel('board'); window.dispatchEvent(new CustomEvent('chester-resume-game')); };
  const help = () => { if (!helpRemaining || isThinking || coachPrompt) return; setHelpRemaining((n) => n - 1); setIsThinking(true); setActivePanel('coach'); window.dispatchEvent(new CustomEvent('chester-help-request')); };

  if (!started) return <main className="chester-start-screen">
    <section><span>CHESS-TOWN ACADEMY</span><h1>PLAY CHESTER</h1><p>Pick your opponent. Chester coaches the first three decisions, then lets you fight.</p>
      <div className="chester-level-grid">{LEVELS.map((level) => <button key={level.value} className={difficulty === level.value ? 'is-active' : ''} onClick={() => setDifficulty(level.value)}><b>{level.label}</b><small>{level.note}</small></button>)}</div>
      <button className="chester-start-button" onClick={() => setStarted(true)}>START GUIDED GAME <i>→</i></button>
    </section>
  </main>;

  const lesson = LESSONS[lessonStep];
  return <main className="chester-game" aria-label="Play Chester guided game">
    <header className="chester-game__top"><div><span>PLAYING CHESTER</span><b>{selectedLevel.label}</b></div><div className="chester-game__progress"><small>LESSON {lessonStep + 1}/3</small><i style={{ width: `${((lessonStep + 1) / 3) * 100}%` }} /></div><button onClick={() => setStarted(false)}>LEVELS</button></header>
    <nav className="chester-mobile-tabs"><button className={activePanel === 'board' ? 'is-active' : ''} onClick={() => setActivePanel('board')}>♟ BOARD</button><button className={activePanel === 'coach' ? 'is-active' : ''} onClick={() => setActivePanel('coach')}>🎙 CHESTER {coachPrompt ? '•' : ''}</button></nav>
    <section className={`chester-game__board ${activePanel !== 'board' ? 'is-hidden-mobile' : ''}`}><div className="chester-board-frame"><DojoEngine mode={mode} difficulty={difficulty} /></div><div className="chester-game__actions"><button onClick={help} disabled={!helpRemaining || isThinking || Boolean(coachPrompt)}>💡 HINT <small>{helpRemaining} LEFT</small></button><button onClick={() => window.dispatchEvent(new CustomEvent('request-resign'))}>🏳 RESIGN</button></div></section>
    <aside className={`chester-game__coach ${activePanel !== 'coach' ? 'is-hidden-mobile' : ''}`}>
      <div className="chester-coach-card"><span>CHESTER’S LESSON</span><h2>{coachPrompt?.kind === 'help' ? 'A nudge from the knight' : coachPrompt ? `Your move: ${coachPrompt.move}` : lesson.title}</h2><p>{coachPrompt ? (isThinking ? 'Studying the board…' : coachReply) : lesson.body}</p>{coachPrompt && !isThinking && <button onClick={resume}>BACK TO THE BOARD →</button>}</div>
      <div className="chester-commentary"><b>LIVE FROM CHESTER</b><p>{commentary}</p></div>
      <ol>{LESSONS.map((item, index) => <li key={item.title} className={index === lessonStep ? 'is-active' : index < lessonStep ? 'is-done' : ''}><i>{index < lessonStep ? '✓' : index + 1}</i><span>{item.title}</span></li>)}</ol>
    </aside>
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} isLoading={reviewLoading} onClose={() => setReport(null)} />}
  </main>;
}

export default function PlayChesterPage() { return <Suspense fallback={<main className="chester-start-screen" />}><PlayChesterGame /></Suspense>; }
