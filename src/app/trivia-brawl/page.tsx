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

function BrawlGame({ matchId: initialMatch, role }: { matchId: string; role: Player }) {
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
    const id = initialMatch;
    void (async () => {
      setMatchId(id);
      setPlayer(role);
      window.history.replaceState(null, '', `/trivia-brawl?match=${id}&role=${role}`);
      const categoryResponse = await fetch('https://opentdb.com/api_category.php');
      const categoryPayload = await categoryResponse.json() as { trivia_categories?: Category[] };
      setCategories(categoryPayload.trivia_categories || []);
      const roomResponse = await fetch(`/api/trivia-brawl/sync?match=${encodeURIComponent(id)}`);
      if (roomResponse.status === 404) {
        // Either role may create: serverless rooms are per-instance, so a guest
        // landing on a cold lambda must be able to re-open the room.
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
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Trivia Brawl</h1></div><Link href="/trivia-brawl">← Pub door</Link></header>
    <div className="trivia-brawl-score"><span>ROUND {Math.min(room.round + 1, 6)}/6</span><b>PLAYER 1 {room.score.p1}</b><b>PLAYER 2 {room.score.p2}</b></div>
    <ChesterTeleprompter text={visibleHostText} isThinking={isSubmitting} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    {room.phase === 'draft' ? <section className="trivia-brawl-draft"><h2>Player {player === 'p1' ? 'One' : 'Two'}: Choose 3 Categories</h2>{player === 'p1' && room.categories.p2.length === 0 && <div style={{ display: 'grid', gap: '.45rem' }}>
          <button type="button" className="trivia-brawl-primary" onClick={() => { if (typeof navigator.share === 'function') { void navigator.share({ title: 'Trivia Brawl', text: 'Chester is hosting. You, me, six rounds.', url: inviteUrl }).catch(() => undefined); } else { void navigator.clipboard?.writeText(inviteUrl).catch(() => undefined); } }}>📮 SEND THE INVITE</button>
          <input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Invite link for Player 2" />
        </div>}{categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggleCategory(category.id)} aria-pressed={selectedCategories.includes(category.id)}>{category.name}</button>)}</div> : <p>Loading the pub ledger...</p>}<button className="trivia-brawl-primary" disabled={selectedCategories.length !== 3 || isSubmitting} onClick={() => void submitDraft()}>LOCK CATEGORIES ({selectedCategories.length}/3)</button><p>{room.categories.p1.length}/3 Player 1 choices · {room.categories.p2.length}/3 Player 2 choices</p></section> : room.phase === 'intro' ? <section className="trivia-brawl-question"><h2>The categories are locked.</h2><p>{player === 'p1' ? 'The house is ready. Start when Chester finishes his warning.' : 'Awaiting Player One to begin the Brawl.'}</p>{player === 'p1' && <button className="trivia-brawl-primary" onClick={() => void patchRoom({ start: true })}>START THE BRAWL</button>}</section> : room.phase === 'finished' ? <section className="trivia-brawl-question"><h2>Final call.</h2><p>{room.score.p1 === room.score.p2 ? 'A dead heat. Chester demands a rematch.' : `Player ${room.score.p1 > room.score.p2 ? '1' : '2'} wins the tab.`}</p></section> : <section className="trivia-brawl-question"><span>{room.currentQuestion?.category}</span><h2>{room.currentQuestion?.question}</h2><div className="trivia-brawl-answers">{room.currentQuestion?.answers.map((option) => <button key={option} onClick={() => void answer(option)} disabled={Boolean(room.answers[player]) || room.phase !== 'question'}>{room.phase === 'banter' && option === room.roundResult?.correctAnswer ? `${option} ✓` : option}</button>)}</div>{room.phase === 'question' && <button className="trivia-brawl-sabotage" disabled={room.sabotage[player] || room.round >= 5} onClick={() => void sabotage()}>{room.sabotage[player] ? 'SABOTAGE SPENT' : 'SABOTAGE: NEXT QUESTION IN SHAKESPEAREAN'}</button>}{room.phase === 'question' && room.answers[player] && <p>Answer locked. Awaiting the rival.</p>}{room.phase === 'banter' && player === 'p1' && <button className="trivia-brawl-primary" onClick={() => void nextRound()}>NEXT ROUND</button>}</section>}
  </main>;
}


const SOLO_SCORES_KEY = 'ct-trivia-solo-v1';
type SoloScore = { date: string; you: number; chester: number };
type SoloQuestion = { category: string; question: string; correctAnswer: string; answers: string[]; chesterCorrect: boolean };

function decodeHtmlClient(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function shuffled<T>(items: T[]): T[] { const r = [...items]; for (let i = r.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function loadSoloScores(): SoloScore[] {
  try { return JSON.parse(window.localStorage.getItem(SOLO_SCORES_KEY) || '[]') as SoloScore[]; } catch { return []; }
}

const SOLO_LINES = {
  draft: 'Pick three categories. I will pick three of mine. Six rounds, loser buys the next round.',
  correct: ['Clean hit. The pub applauds politely.', 'Correct. I taught you well. Obviously.', 'A point for the challenger. Noted in the ledger.'],
  wrong: ['Wrong. The bar winces in unison.', 'A swing and a miss. Chester does not forget.', 'The correct answer was right there, being correct.'],
  win: 'You beat me in my own pub. Frame the receipt. I demand a rematch.',
  lose: 'The house wins. The house is me. The house always remembers.',
  draw: 'A dead heat. The pub demands a tiebreaker next time.',
};

function SoloBrawl({ onExit }: { onExit: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [phase, setPhase] = useState<'draft' | 'question' | 'reveal' | 'finished'>('draft');
  const [queue, setQueue] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<SoloQuestion | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [score, setScore] = useState({ you: 0, chester: 0 });
  const [hostLine, setHostLine] = useState(SOLO_LINES.draft);
  const [error, setError] = useState('');

  useEffect(() => {
    window.history.replaceState(null, '', '/trivia-brawl?solo=1');
    void fetch('https://opentdb.com/api_category.php')
      .then((r) => r.json())
      .then((data: { trivia_categories?: Category[] }) => setCategories(data.trivia_categories || []))
      .catch(() => setError('Could not load the pub ledger. Check your connection.'));
  }, []);

  const toggle = (id: number) => setPicked((current) => current.includes(id) ? current.filter((c) => c !== id) : current.length < 3 ? [...current, id] : current);

  const fetchSoloQuestion = async (categoryId: number): Promise<SoloQuestion> => {
    const response = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${categoryId}`, { cache: 'no-store' });
    const payload = await response.json() as { response_code: number; results: Array<{ category: string; question: string; correct_answer: string; incorrect_answers: string[] }> };
    const source = payload.results[0];
    if (payload.response_code !== 0 || !source) throw new Error('The pub ran dry of questions for that category.');
    const correctAnswer = decodeHtmlClient(source.correct_answer);
    const wrongPool = source.incorrect_answers.map(decodeHtmlClient);
    // Chester answers 72% correct; when wrong he picks a random wrong option.
    const chesterCorrect = Math.random() < 0.72;
    return { category: decodeHtmlClient(source.category), question: decodeHtmlClient(source.question), correctAnswer, answers: shuffled([correctAnswer, ...wrongPool]), chesterCorrect };
  };

  const startGame = async () => {
    if (picked.length !== 3) return;
    const chesterPool = shuffled(categories.map((c) => c.id).filter((id) => !picked.includes(id))).slice(0, 3);
    const rounds = shuffled([...picked, ...chesterPool]);
    setQueue(rounds);
    setRound(0);
    setScore({ you: 0, chester: 0 });
    setError('');
    try {
      const first = await fetchSoloQuestion(rounds[0]);
      setQuestion(first);
      setLocked(null);
      setPhase('question');
      setHostLine(`Round 1 of 6. ${first.category} is on the tap. Answer boldly.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not draw the first question.'); }
  };

  const answerSolo = (option: string) => {
    if (locked || !question) return;
    setLocked(option);
    const youRight = option === question.correctAnswer;
    const chesterRight = question.chesterCorrect;
    setScore((current) => ({ you: current.you + (youRight ? 1 : 0), chester: current.chester + (chesterRight ? 1 : 0) }));
    const pool = youRight ? SOLO_LINES.correct : SOLO_LINES.wrong;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setHostLine(`${line} ${chesterRight ? 'I scored that one too.' : 'I missed it as well. The shame is shared.'}`);
    setPhase('reveal');
  };

  const nextSolo = async () => {
    const nextRound = round + 1;
    if (nextRound >= 6) {
      const final = { you: score.you, chester: score.chester };
      const record: SoloScore = { date: new Date().toISOString().slice(0, 10), you: final.you, chester: final.chester };
      try { window.localStorage.setItem(SOLO_SCORES_KEY, JSON.stringify([record, ...loadSoloScores()].slice(0, 20))); } catch { /* private browsing */ }
      setHostLine(final.you > final.chester ? SOLO_LINES.win : final.you < final.chester ? SOLO_LINES.lose : SOLO_LINES.draw);
      setPhase('finished');
      return;
    }
    setRound(nextRound);
    setLocked(null);
    setError('');
    try {
      const next = await fetchSoloQuestion(queue[nextRound]);
      setQuestion(next);
      setHostLine(`Round ${nextRound + 1} of 6. ${next.category} is on the tap.`);
      setPhase('question');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not draw the next question.'); }
  };

  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>SOLO AT THE BAR</span><h1>You vs Chester</h1></div><button type="button" className="trivia-brawl-sabotage" onClick={onExit}>← Pub door</button></header>
    <div className="trivia-brawl-score"><span>ROUND {Math.min(round + 1, 6)}/6</span><b>YOU {score.you}</b><b>CHESTER {score.chester}</b></div>
    <ChesterTeleprompter text={hostLine} isThinking={false} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    {phase === 'draft' && <section className="trivia-brawl-draft"><h2>Choose your 3 categories</h2>
      {categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggle(category.id)} aria-pressed={picked.includes(category.id)}>{category.name}</button>)}</div> : <p>Loading the pub ledger...</p>}
      <button className="trivia-brawl-primary" disabled={picked.length !== 3} onClick={() => void startGame()}>BELLYS UP - START ({picked.length}/3)</button>
    </section>}
    {(phase === 'question' || phase === 'reveal') && question && <section className="trivia-brawl-question"><span>{question.category}</span><h2>{question.question}</h2>
      <div className="trivia-brawl-answers">{question.answers.map((option) => <button key={option} onClick={() => answerSolo(option)} disabled={phase === 'reveal'}>{phase === 'reveal' && option === question.correctAnswer ? `${option} ✓` : phase === 'reveal' && option === locked ? `${option} ✗` : option}</button>)}</div>
      {phase === 'reveal' && <button className="trivia-brawl-primary" onClick={() => void nextSolo()}>{round + 1 >= 6 ? 'FINAL CALL' : 'NEXT ROUND'}</button>}
    </section>}
    {phase === 'finished' && <section className="trivia-brawl-question"><h2>{score.you} - {score.chester}</h2>
      <p>{score.you > score.chester ? 'You take the tab. Chester is already plotting the rematch.' : score.you < score.chester ? 'Chester takes it. The ledger remembers.' : 'Dead heat. The pub wants a tiebreaker.'}</p>
      <button className="trivia-brawl-primary" onClick={() => { setPhase('draft'); setPicked([]); setRound(0); setScore({ you: 0, chester: 0 }); setQuestion(null); setHostLine(SOLO_LINES.draft); }}>RUN IT BACK</button>
    </section>}
  </main>;
}

function TriviaLobby({ onHost, onSolo }: { onHost: () => void; onSolo: () => void }) {
  const [scores, setScores] = useState<SoloScore[]>([]);
  useEffect(() => { setScores(loadSoloScores().slice(0, 5)); }, []);
  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Trivia Brawl</h1></div><Link href="/">← Chesterville</Link></header>
    <ChesterTeleprompter text="Welcome to my pub. Play me solo, or host a brawl and send the link - I host, I judge, I remember everything." isThinking={false} isMobile />
    <section className="trivia-brawl-draft">
      <h2>Take a seat</h2>
      <button className="trivia-brawl-primary" onClick={onSolo}>🧠 PLAY SOLO VS CHESTER</button>
      <button className="trivia-brawl-primary" onClick={onHost}>📮 HOST A BRAWL - SEND THE LINK</button>
    </section>
    <section className="trivia-brawl-draft">
      <h2>Honour board</h2>
      {scores.length ? scores.map((entry, index) => <p key={`${entry.date}-${index}`} style={{ margin: 0 }}>{entry.date} · YOU {entry.you} - {entry.chester} CHESTER {entry.you > entry.chester ? '🏆' : entry.you < entry.chester ? '💀' : '🤝'}</p>) : <p style={{ margin: 0 }}>No results yet. The ledger awaits its first entry.</p>}
    </section>
  </main>;
}

function makeMatchId(): string { return Math.random().toString(36).slice(2, 10); }

export default function TriviaBrawlPage() {
  const [view, setView] = useState<'lobby' | 'brawl' | 'solo'>('lobby');
  const [match, setMatch] = useState('');
  const [role, setRole] = useState<Player>('p1');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMatch = params.get('match');
    if (urlMatch && /^[a-z0-9]{6,24}$/i.test(urlMatch)) {
      setMatch(urlMatch);
      setRole(params.get('role') === 'p2' ? 'p2' : 'p1');
      setView('brawl');
    } else if (params.get('solo') === '1') {
      setView('solo');
    }
    setReady(true);
  }, []);

  if (!ready) return <main className="trivia-brawl-page" />;
  if (view === 'solo') return <SoloBrawl onExit={() => { window.history.replaceState(null, '', '/trivia-brawl'); setView('lobby'); }} />;
  if (view === 'brawl') return <BrawlGame matchId={match} role={role} />;
  return <TriviaLobby
    onSolo={() => setView('solo')}
    onHost={() => { const id = makeMatchId(); setMatch(id); setRole('p1'); setView('brawl'); }}
  />;
}
