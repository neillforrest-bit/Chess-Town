'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChesterTeleprompter } from '@/components/ChesterUI';

type Player = 'p1' | 'p2';
type Category = { id: number; name: string };
type Question = { category: string; question: string; answers: string[] };
type Room = {
  categories: Record<Player, number[]>;
  answers: Partial<Record<Player, string>>;
  score: Record<Player, number>;
  sabotage: Record<Player, boolean>;
  sabotageTarget: Player | null;
  sabotageRound: number | null;
  hostMessage: string;
  phase: 'draft' | 'intro' | 'question' | 'banter' | 'finished';
  round: number;
  currentQuestion: Question | null;
  roundResult: { correctAnswer: string; p1Correct: boolean; p2Correct: boolean } | null;
};

const EMPTY_ROOM: Room = { categories: { p1: [], p2: [] }, answers: {}, score: { p1: 0, p2: 0 }, sabotage: { p1: false, p2: false }, sabotageTarget: null, sabotageRound: null, hostMessage: '', phase: 'draft', round: 0, currentQuestion: null, roundResult: null };

function getMatchId(): string {
  const existing = new URLSearchParams(window.location.search).get('match');
  return existing && /^[a-z0-9]{6,24}$/i.test(existing) ? existing : Math.random().toString(36).slice(2, 10);
}

async function updateRoom(matchId: string, player: Player, body: Record<string, unknown>): Promise<Room> {
  const response = await fetch('/api/trivia-brawl/sync', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, player, ...body }) });
  const data = await response.json() as Room & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Brawl update failed');
  return data;
}

export default function TriviaBrawlPage() {
  const [matchId, setMatchId] = useState('');
  const [player, setPlayer] = useState<Player>('p1');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [room, setRoom] = useState<Room>(EMPTY_ROOM);
  const [hostText, setHostText] = useState('Welcome to Trivia Brawl. Pick three categories and pray your rival chooses badly.');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const announcedRoundRef = useRef(-1);

  const syncRoom = async (id: string) => {
    const response = await fetch(`/api/trivia-brawl/sync?match=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The Trivia Brawl room is unavailable');
    setRoom(await response.json() as Room);
  };

  useEffect(() => {
    const id = getMatchId();
    const role = new URLSearchParams(window.location.search).get('role') === 'p2' ? 'p2' : 'p1';
    void (async () => {
      setMatchId(id);
      setPlayer(role);
      const categoryResponse = await fetch('https://opentdb.com/api_category.php');
      const categoryPayload = await categoryResponse.json() as { trivia_categories?: Category[] };
      setCategories(categoryPayload.trivia_categories || []);
      const roomResponse = await fetch(`/api/trivia-brawl/sync?match=${encodeURIComponent(id)}`);
      if (roomResponse.status === 404 && role === 'p1') {
        const created = await fetch('/api/trivia-brawl/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: id }) });
        if (!created.ok) throw new Error('Could not create Trivia Brawl room');
      }
      await syncRoom(id);
    })().catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not open Trivia Brawl.'));
  }, []);

  useEffect(() => {
    if (!matchId) return;
    const interval = window.setInterval(() => void syncRoom(matchId).catch(() => undefined), 1200);
    return () => window.clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    if (room.phase !== 'question' || !room.currentQuestion || announcedRoundRef.current === room.round) return;
    announcedRoundRef.current = room.round;
    const isSabotaged = room.sabotageTarget === player && room.sabotageRound === room.round;
    setHostText(isSabotaged ? 'Hear ye, thou bewildered scholar: decipher this cursed query if thy courage permits.' : `Round ${room.round + 1}. ${room.currentQuestion.category} is on the tap; answer boldly.`);
  }, [player, room.currentQuestion, room.phase, room.round, room.sabotageRound, room.sabotageTarget]);

  useEffect(() => {
    if (player !== 'p1' || room.phase !== 'banter' || !room.currentQuestion || !room.roundResult) return;
    void fetch('/api/trivia-commentary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        mode: 'brawl-round', question: room.currentQuestion.question, correctAnswer: room.roundResult.correctAnswer,
        p1Correct: room.roundResult.p1Correct, p2Correct: room.roundResult.p2Correct,
      }),
    }).then(async (response) => {
      const data = await response.json() as { reply?: string };
      if (data.reply) void updateRoom(matchId, player, { hostMessage: data.reply }).then(setRoom).catch(() => undefined);
    }).catch(() => void updateRoom(matchId, player, { hostMessage: `The answer was ${room.roundResult?.correctAnswer}. Chester has recorded the carnage.` }).then(setRoom).catch(() => undefined));
  }, [matchId, player, room.currentQuestion, room.phase, room.roundResult]);

  const toggleCategory = (categoryId: number) => setSelectedCategories((current) => current.includes(categoryId) ? current.filter((id) => id !== categoryId) : current.length < 3 ? [...current, categoryId] : current);
  const patchRoom = async (body: Record<string, unknown>): Promise<Room> => {
    const data = await updateRoom(matchId, player, body);
    setRoom(data);
    return data;
  };
  const submitDraft = async () => {
    if (selectedCategories.length !== 3) return;
    setIsSubmitting(true);
    try {
      const updatedRoom = await patchRoom({ categories: selectedCategories });
      const names = selectedCategories.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean).join(', ');
      if (updatedRoom.phase === 'question') {
        const p1Categories = updatedRoom.categories.p1.map((id) => categories.find((category) => category.id === id)?.name).filter((name): name is string => Boolean(name));
        const p2Categories = updatedRoom.categories.p2.map((id) => categories.find((category) => category.id === id)?.name).filter((name): name is string => Boolean(name));
        const response = await fetch('/api/trivia-commentary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'brawl-intro', p1Categories, p2Categories }) });
        const data = await response.json() as { reply?: string };
        await patchRoom({ hostMessage: data.reply || 'The categories are locked and the pub is braced for impact.' });
      } else {
        setHostText(`Player ${player === 'p1' ? 'One' : 'Two'} has ordered ${names}. A suspiciously ambitious tab.`);
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not submit the draft.'); } finally { setIsSubmitting(false); }
  };
  const answer = async (selectedAnswer: string) => { try { await patchRoom({ answer: selectedAnswer }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not lock that answer.'); } };
  const sabotage = async () => { try { await patchRoom({ sabotage: true }); setHostText('Sabotage accepted. The next question shall arrive wearing a Shakespearean disguise.'); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Sabotage failed.'); } };
  const nextRound = async () => { try { await patchRoom({ advance: true }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not advance the round.'); } };
  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/trivia-brawl?match=${matchId}&role=p2`;
  const visibleHostText = (room.phase === 'intro' || room.phase === 'banter') && room.hostMessage ? room.hostMessage : hostText;

  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Trivia Brawl</h1></div><Link href="/arena">Arena</Link></header>
    <div className="trivia-brawl-score"><span>ROUND {Math.min(room.round + 1, 6)}/6</span><b>PLAYER 1 {room.score.p1}</b><b>PLAYER 2 {room.score.p2}</b></div>
    <ChesterTeleprompter text={visibleHostText} isThinking={isSubmitting} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    {room.phase === 'draft' ? <section className="trivia-brawl-draft"><h2>Player {player === 'p1' ? 'One' : 'Two'}: Choose 3 Categories</h2>{player === 'p1' && <input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Invite link for Player 2" />}{categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggleCategory(category.id)} aria-pressed={selectedCategories.includes(category.id)}>{category.name}</button>)}</div> : <p>Loading the pub ledger...</p>}<button className="trivia-brawl-primary" disabled={selectedCategories.length !== 3 || isSubmitting} onClick={() => void submitDraft()}>LOCK CATEGORIES ({selectedCategories.length}/3)</button><p>{room.categories.p1.length}/3 Player 1 choices · {room.categories.p2.length}/3 Player 2 choices</p></section> : room.phase === 'intro' ? <section className="trivia-brawl-question"><h2>The categories are locked.</h2><p>{player === 'p1' ? 'The house is ready. Start when Chester finishes his warning.' : 'Awaiting Player One to begin the Brawl.'}</p>{player === 'p1' && <button className="trivia-brawl-primary" onClick={() => void patchRoom({ start: true })}>START THE BRAWL</button>}</section> : room.phase === 'finished' ? <section className="trivia-brawl-question"><h2>Final call.</h2><p>{room.score.p1 === room.score.p2 ? 'A dead heat. Chester demands a rematch.' : `Player ${room.score.p1 > room.score.p2 ? '1' : '2'} wins the tab.`}</p></section> : <section className="trivia-brawl-question"><span>{room.currentQuestion?.category}</span><h2>{room.currentQuestion?.question}</h2><div className="trivia-brawl-answers">{room.currentQuestion?.answers.map((option) => <button key={option} onClick={() => void answer(option)} disabled={Boolean(room.answers[player]) || room.phase !== 'question'}>{room.phase === 'banter' && option === room.roundResult?.correctAnswer ? `${option} ✓` : option}</button>)}</div>{room.phase === 'question' && <button className="trivia-brawl-sabotage" disabled={room.sabotage[player] || room.round >= 5} onClick={() => void sabotage()}>{room.sabotage[player] ? 'SABOTAGE SPENT' : 'SABOTAGE: NEXT QUESTION IN SHAKESPEAREAN'}</button>}{room.phase === 'question' && room.answers[player] && <p>Answer locked. Awaiting the rival.</p>}{room.phase === 'banter' && player === 'p1' && <button className="trivia-brawl-primary" onClick={() => void nextRound()}>NEXT ROUND</button>}</section>}
  </main>;
}
