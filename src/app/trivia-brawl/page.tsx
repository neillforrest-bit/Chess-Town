'use client';

import { useEffect, useRef, useState } from 'react';
import { TRIVIA_ACC, getTrvRoad, setTrvRoad, TRV_ROAD_MAX } from '@/games/trivia/road';
import Link from 'next/link';
import { ChesterTeleprompter } from '@/components/ChesterUI';
import { applyRoomAction, createRoom, planRoomMatch, serializeRoom, type PublicRoom, type TriviaRoom } from '@/lib/trivia-room';
import {
  MATCH_ROUNDS, QUESTIONS_PER_ROUND, advanceMatch, applyAnswer, applyDuelPick, applyFlashAnswer, applyWildcard, currentQuestionOf, resolveFlashTimeout,
  loadAllRounds, markRoundLoaded, planMatch, roundSummary, viewerQuestion,
  type MatchState, type ViewerQuestion, type WildcardId,
} from '@/lib/trivia-match';
import { PEER_CONFIG } from '@/lib/p2p';
import { LOCAL_CATEGORIES, categoryQuip, pickLocalQuestion, revealQuip, roundEndLine, ROUND_INTROS, ROULETTE_LINES, FLASH_INTROS, FLASH_RESOLVE_LINES, ON_THE_HOUSE_LINES } from '@/lib/trivia-local';

type Player = 'p1' | 'p2';
type Category = { id: number; name: string };
type Room = PublicRoom;

// BUILD 183 - five rounds of five shared questions, rising heat, wildcards and doubles.
const WILDCARDS: Array<{ id: WildcardId; icon: string; label: string; hint: string }> = [
  { id: 'shakespeare', icon: '🎭', label: 'SHAKESPEARE', hint: "Opponent's next question arrives in disguise" },
  { id: 'fiftyfifty', icon: '🍸', label: 'FIFTY-FIFTY', hint: 'Two wrong answers vanish for you' },
  { id: 'doubledown', icon: '💰', label: 'DOUBLE DOWN', hint: 'Your points on this question count double' },
  { id: 'pickpocket', icon: '🤑', label: 'PICKPOCKET', hint: "If you're right and they're wrong, steal a point" },
];

function getMatchId(): string {
  const existing = new URLSearchParams(window.location.search).get('match');
  return existing && /^[a-z0-9]{6,24}$/i.test(existing) ? existing : Math.random().toString(36).slice(2, 10);
}

// BUILD 117 live scorebug: names, big digits, round pips, leader glow.
function Scorebug({ p1Name, p2Name, p1Score, p2Score, round, qIndex, lastCall, finished, total = MATCH_ROUNDS }: { p1Name: string; p2Name: string; p1Score: number; p2Score: number; round: number; qIndex?: number; lastCall?: boolean; finished: boolean; total?: number }) {
  const midLabel = lastCall ? 'LAST CALL' : finished ? 'FINAL CALL' : `ROUND ${Math.min(round + 1, total)}/${total}`;
  return <div className="trivia-scorebug" aria-live="polite">
    <div className={`trivia-scorebug__side ${p1Score > p2Score ? 'is-leading' : ''}`}><small>{p1Name}</small><b>{p1Score}</b></div>
    <div className="trivia-scorebug__mid"><span>{midLabel}</span>
      <div className="trivia-scorebug__pips">{Array.from({ length: total }, (_, i) => <i key={i} className={finished || i < round ? 'is-done' : i === round ? 'is-live' : ''} />)}</div>
      {!finished && !lastCall && typeof qIndex === 'number' && <span className="trivia-scorebug__q">QUESTION {qIndex + 1}/{QUESTIONS_PER_ROUND}</span>}
    </div>
    <div className={`trivia-scorebug__side is-right ${p2Score > p1Score ? 'is-leading' : ''}`}><b>{p2Score}</b><small>{p2Name}</small></div>
  </div>;
}

// Badges over the question: heat, doubles, power rounds, streaks.

const FLASH_LABEL: Record<string, string> = { riddle: "CHESTER'S RIDDLE", teaser: 'BRAIN TEASER', fastest: 'FASTEST FINGER', duel: 'THE TWENTY', lastorders: 'LAST ORDERS' };

function FlashBanner({ banner }: { banner: string | null }) {
  if (!banner) return null;
  return <div className="trivia-flash-banner" role="status"><div className="trivia-flash-banner__card">{banner}</div></div>;
}

function LeaderboardCard({ p1Name, p2Name, score, history, streak, cardsUsed }: { p1Name: string; p2Name: string; score: { p1: number; p2: number }; history: Array<{ round: number; p1Correct: boolean; p2Correct: boolean; p1Points: number; p2Points: number; flash?: string }>; streak: { p1: number; p2: number }; cardsUsed?: Record<Player, Record<WildcardId, boolean>> | null }) {
  const total = Math.max(1, score.p1 + score.p2);
  const p1Share = Math.round((score.p1 / total) * 100);
  const leader = score.p1 === score.p2 ? null : score.p1 > score.p2 ? 'p1' : 'p2';
  const rounds = [0, 1, 2, 3, 4];
  const roundStats = rounds.map((r) => {
    const slice = history.filter((h) => h.round === r && !h.flash);
    const flash = history.find((h) => h.round === r && h.flash);
    return {
      p1Hits: slice.filter((h) => h.p1Correct).length,
      p2Hits: slice.filter((h) => h.p2Correct).length,
      p1Pts: slice.reduce((sum, h) => sum + h.p1Points, 0) + (flash?.p1Points || 0),
      p2Pts: slice.reduce((sum, h) => sum + h.p2Points, 0) + (flash?.p2Points || 0),
      flash: Boolean(flash),
    };
  });
  const cards: Array<[WildcardId, string]> = [['shakespeare', '🎭'], ['fiftyfifty', '🍸'], ['doubledown', '💰'], ['pickpocket', '🤑']];
  const cardChips = (who: Player) => cardsUsed ? cards.map(([id, icon]) => <span key={id} className={cardsUsed[who]?.[id] ? 'trivia-leaderboard__card is-spent' : 'trivia-leaderboard__card'}>{icon}</span>) : null;
  return <div className="trivia-leaderboard">
    <div className="trivia-leaderboard__top">
      <div className="trivia-leaderboard__side"><b>{leader === 'p1' ? '👑 ' : ''}{p1Name}</b><span className="trivia-leaderboard__points">{score.p1}</span>{streak.p1 >= 2 ? <span>🔥{streak.p1}</span> : null}<div>{cardChips('p1')}</div></div>
      <div className="trivia-leaderboard__mid">THE LEDGER</div>
      <div className="trivia-leaderboard__side is-right"><b>{leader === 'p2' ? '👑 ' : ''}{p2Name}</b><span className="trivia-leaderboard__points">{score.p2}</span>{streak.p2 >= 2 ? <span>🔥{streak.p2}</span> : null}<div>{cardChips('p2')}</div></div>
    </div>
    <div className="trivia-leaderboard__tug"><div className="trivia-leaderboard__tug-p1" style={{ width: `${p1Share}%` }} /></div>
    <div className="trivia-leaderboard__grid">
      <span />{rounds.map((r) => <span key={r} className="trivia-leaderboard__col">R{r + 1}</span>)}
      <span className="trivia-leaderboard__row">{p1Name}</span>{rounds.map((r) => <span key={r} className={roundStats[r].p1Pts ? 'trivia-leaderboard__cell' : 'trivia-leaderboard__cell is-empty'}>{roundStats[r].p1Pts || '·'}{roundStats[r].flash ? '⚡' : ''}</span>)}
      <span className="trivia-leaderboard__row">{p2Name}</span>{rounds.map((r) => <span key={r} className={roundStats[r].p2Pts ? 'trivia-leaderboard__cell' : 'trivia-leaderboard__cell is-empty'}>{roundStats[r].p2Pts || '·'}{roundStats[r].flash ? '⚡' : ''}</span>)}
    </div>
  </div>;
}

function useFlashBanner(watch: string | null): string | null {
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    if (!watch) return;
    setBanner(watch);
    const timer = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(timer);
  }, [watch]);
  return banner;
}

function MatchBadges({ difficulty, isDouble, powerForMe, streak, lastCall, roulette }: { difficulty?: string; isDouble: boolean; powerForMe: boolean; streak: number; lastCall?: boolean; roulette?: boolean }) {
  return <div className="trivia-badges">
    {roulette ? <span className="trivia-badge trivia-badge--roulette">🎰 CHESTER'S ROULETTE · TRIPLE POINTS</span> : lastCall ? <span className="trivia-badge trivia-badge--hot">⚡ SUDDEN DEATH</span> : difficulty ? <span className={`trivia-badge trivia-badge--${difficulty}`}>{difficulty === 'house' ? '🏠 HOUSE' : `${difficulty.toUpperCase()} HEAT`}</span> : null}
    {isDouble && <span className="trivia-badge trivia-badge--double">⭐ WORTH DOUBLE</span>}
    {powerForMe && <span className="trivia-badge trivia-badge--power">🔥 YOUR POWER ROUND</span>}
    {streak >= 2 && <span className="trivia-badge trivia-badge--streak">🎳 ON A ROLL x{streak}</span>}
  </div>;
}

function WildcardBar({ cardsUsed, activeCards, canPlayAnswers, canShakespeare, onPlay }: {
  cardsUsed: Record<WildcardId, boolean>;
  activeCards: Partial<Record<'fiftyfifty' | 'doubledown' | 'pickpocket', boolean>>;
  canPlayAnswers: boolean;
  canShakespeare: boolean;
  onPlay: (card: WildcardId) => void;
}) {
  return <div className="trivia-wildcards">
    {WILDCARDS.map((card) => {
      const used = cardsUsed[card.id];
      const active = card.id === 'shakespeare' ? false : Boolean(activeCards[card.id as 'fiftyfifty']);
      const enabled = card.id === 'shakespeare' ? canShakespeare && !used : canPlayAnswers && !used && !active;
      return <button key={card.id} type="button" className={`trivia-wildcard ${active ? 'is-active' : ''}`} disabled={!enabled} title={card.hint}
        onClick={() => onPlay(card.id)}>
        {used ? `${card.icon} SPENT` : active ? `${card.icon} ARMED` : `${card.icon} ${card.label}`}
      </button>;
    })}
  </div>;
}

// BUILD 183: unmistakable per-player reveal after every question.
function RevealCards({ p1Name, p2Name, answers, result }: { p1Name: string; p2Name: string; answers: Partial<Record<Player, string>>; result: NonNullable<Room['result']> }) {
  const card = (player: Player, name: string, correct: boolean, points: number, streakBonus: boolean) => {
    const stole = result.stolenFrom && result.stolenFrom !== player;
    const robbed = result.stolenFrom === player;
    return <div className={`trivia-reveal-card ${correct ? 'is-right' : 'is-wrong'}`}>
      <small>{name}</small>
      <b>{correct ? '✓ RIGHT' : '✗ WRONG'}</b>
      <span className="trivia-reveal-card__answer">{answers[player] || 'No answer'}</span>
      <span className="trivia-reveal-card__points">
        {points > 0 ? `+${points}` : '+0'}
        {result.double && correct ? ' · ⭐ DOUBLE' : ''}
        {result.roulette && correct ? ' · 🎰 ROULETTE' : ''}
        {result.powerPlayers.includes(player) && correct ? ' · 🔥 POWER' : ''}
        {streakBonus ? ' · 🎳 ROLL +1' : ''}
        {stole ? ' · 🤑 STOLEN' : ''}
        {robbed ? ' · 🤑 -1 PICKED' : ''}
      </span>
    </div>;
  };
  return <div className="trivia-reveal">
    {card('p1', p1Name, result.p1Correct, result.p1Points, result.p1StreakBonus)}
    {card('p2', p2Name, result.p2Correct, result.p2Points, result.p2StreakBonus)}
  </div>;
}

function questionText(view: ViewerQuestion | null): { question: string; answers: string[] } {
  if (!view) return { question: '', answers: [] };
  return view.disguise ? { question: view.disguise.question, answers: view.disguise.answers } : { question: view.question, answers: view.answers };
}


function FlashBrawl({ flash, player, p1Name, p2Name, onAnswer, onPick }: { flash: NonNullable<Room['flash']>; player: Player; p1Name: string; p2Name: string; onAnswer: (answer: string) => void; onPick: (option: string) => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timed = flash.type === 'lastorders' || flash.type === 'fastest';
  useEffect(() => {
    if (!timed) { setSecondsLeft(null); return; }
    setSecondsLeft(20);
    const tick = setInterval(() => setSecondsLeft((cur) => (cur === null || cur <= 0 ? 0 : cur - 1)), 1000);
    return () => clearInterval(tick);
  }, [timed, flash.question]);
  const nameOf = (who: Player) => (who === 'p1' ? p1Name : p2Name);
  return <section className="trivia-brawl-question trivia-flash">
    <span className="trivia-badge trivia-badge--flash">⚡ FLASH FINALE · {FLASH_LABEL[flash.type]} · DOUBLE POINTS</span>
    {flash.type === 'duel' && flash.options ? <>
      <h2>{flash.prompt}</h2>
      <p>Take turns tapping one option. A wrong tap is a strike - three strikes and {nameOf(flash.turn === 'p1' ? 'p2' : 'p1')} banks the flash. Clear all ten and the fuller basket wins (level baskets split it, one each).</p>
      <p className="trivia-flash-turn">{flash.done ? 'Board settled.' : `${nameOf(flash.turn || 'p1')} to tap`} · Strikes: {p1Name} {flash.strikes?.p1 ?? 0}/3 · {p2Name} {flash.strikes?.p2 ?? 0}/3</p>
      <div className="trivia-duel-grid">{flash.options.map((option) => {
        const picked = flash.picked?.includes(option);
        const wasCorrect = picked && (flash.correctPicks?.p1.includes(option) || flash.correctPicks?.p2.includes(option));
        const revealed = flash.done && flash.correct?.includes(option);
        return <button key={option} disabled={flash.done || picked || flash.turn !== player} onClick={() => onPick(option)} className={wasCorrect ? 'is-correct' : picked ? 'is-strike' : revealed ? 'is-revealed' : ''}>{option}{wasCorrect ? ' ✓' : picked ? ' ✗' : ''}</button>;
      })}</div>
      {flash.turn !== player && !flash.done && <p>Awaiting {nameOf(flash.turn || 'p1')}...</p>}
    </> : <>
      <span>{flash.category}</span>
      <h2>{flash.question}</h2>
      {timed && secondsLeft !== null && <div className="trivia-flash-timer"><div style={{ width: `${(secondsLeft / 20) * 100}%` }} /><span>{secondsLeft}s</span></div>}
      {flash.type === 'fastest' && <p>First CORRECT answer banks the double. A wrong lunge locks you out - the rival gets a free swing. Chester’s table judges by the order answers arrive at the host’s phone - his call is final.</p>}
      {flash.type === 'lastorders' && <p>Both of you can bank double - and the swifter correct glass gets a +1 top-up, judged by arrival at the host’s phone. Twenty seconds.</p>}
      <div className="trivia-brawl-answers">{(flash.answers || []).map((option) => <button key={option} disabled={Boolean(flash.answered[player]) || (timed && secondsLeft === 0)} onClick={() => onAnswer(option)}>{option}</button>)}</div>
      {flash.answered[player] && <p>Locked. Awaiting the rival...</p>}
    </>}
  </section>;
}

function PpCountdown({ seconds, resetKey }: { seconds: number; resetKey: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const tick = setInterval(() => setLeft((cur) => (cur <= 0 ? 0 : cur - 1)), 1000);
    return () => clearInterval(tick);
  }, [seconds, resetKey]);
  return <div className="trivia-flash-timer"><div style={{ width: `${(left / seconds) * 100}%` }} /><span>{left}s</span></div>;
}

function FlashResultBrawl({ flash, result, p1Name, p2Name, player, advancing, onAdvance }: { flash: NonNullable<Room['flash']>; result: NonNullable<Room['result']>; p1Name: string; p2Name: string; player: Player; advancing: boolean; onAdvance: () => void }) {
  return <section className="trivia-brawl-question trivia-flash">
    <span className="trivia-badge trivia-badge--flash">⚡ {FLASH_LABEL[flash.type]} - SETTLED</span>
    <h2>{flash.question || flash.prompt}</h2>
    {flash.type === 'duel' ? <p>{flash.resolvedNote === 'void' ? 'The Twenty was called off - no flash points. The rest of the scores stand as they were.' : result.p1Points === result.p2Points ? (result.p1Points ? 'Level baskets - a point each.' : 'The Twenty passed with nothing banked.') : `${result.p1Points > result.p2Points ? p1Name : p2Name} takes The Twenty and banks double.`} {flash.correct ? `The full shelf: ${flash.correct.join(', ')}.` : ''}</p>
      : <p>The answer was <b>{result.correctAnswer}</b>. {result.p1Points === result.p2Points ? (result.p1Points ? 'Both bank double.' : 'Nobody banked it.') : `${result.p1Points > result.p2Points ? p1Name : p2Name} banks ${Math.max(result.p1Points, result.p2Points)}.`}</p>}
    <p>{FLASH_RESOLVE_LINES[flash.type]}</p>
    {player === 'p1' ? <button className="trivia-brawl-primary" disabled={advancing} onClick={onAdvance}>ROUND SUMMARY</button> : <p>Awaiting the host...</p>}
  </section>;
}

const HOST_QUIET_MSG = 'The host table has gone quiet - if it stays quiet, ask the host to reopen the table.';

function BrawlGame({ matchId: initialMatch, role }: { matchId: string; role: Player }) {
  const [matchId, setMatchId] = useState('');
  const [player, setPlayer] = useState<Player>(role);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [powerId, setPowerId] = useState<number | null>(null);
  const [myName, setMyName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [hostText, setHostText] = useState('Welcome to the Brawl. Three categories each, one starred as your POWER category, five rounds of five - Chester hosting, loser buys the next round.');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [linked, setLinked] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);
  const [series, setSeries] = useState({ p1: 0, p2: 0, draws: 0 });
  const seriesCountedRef = useRef(false);
  const linkedRef = useRef(false);
  const announcedQuestionRef = useRef('');
  const fullRoomRef = useRef<TriviaRoom | null>(null);
  const guestLinkRef = useRef<any>(null);
  const guestSeenAtRef = useRef<number>(0);
  const hostLinkRef = useRef<any>(null);
  const hostSeenAtRef = useRef<number>(0);
  const categoriesRef = useRef<Category[]>([]);
  categoriesRef.current = categories;
  const nameOf = (categoryId: number) => categoriesRef.current.find((category) => category.id === categoryId)?.name;

  const publishRoom = (next: TriviaRoom) => {
    fullRoomRef.current = next;
    setRoom(serializeRoom(next, 'p1'));
    try { guestLinkRef.current?.send?.({ type: 'room', room: serializeRoom(next, 'p2') }); } catch { /* guest resyncs on the next change */ }
  };

  // Background pour: rounds arrive one at a time; merge each into the LATEST room
  // so in-flight answers and cards are never clobbered.
  const pourRounds = (match: MatchState) => {
    void loadAllRounds(match, (roundIndex, questions) => {
      const latest = fullRoomRef.current;
      if (!latest?.match) return;
      publishRoom({ ...latest, match: markRoundLoaded(latest.match, roundIndex, questions), updatedAt: Date.now() });
    });
  };

  const hostApplyNow = async (asPlayer: Player, body: Record<string, unknown>) => {
    const current = fullRoomRef.current;
    if (!current) return;
    const result = await applyRoomAction(current, asPlayer, body);
    if (result.error) {
      if (asPlayer === 'p1') setError(result.error);
      else { try { guestLinkRef.current?.send?.({ type: 'guest-error', message: result.error }); } catch { /* best effort */ } }
      return;
    }
    let roomAfter = result.room;
    if (result.justLocked) {
      roomAfter = { ...planRoomMatch(roomAfter, nameOf), phase: 'intro' as const };
      publishRoom(roomAfter);
      if (roomAfter.match) pourRounds(roomAfter.match);
      const p1Categories = roomAfter.categories.p1.map(nameOf).filter((name): name is string => Boolean(name));
      const p2Categories = roomAfter.categories.p2.map(nameOf).filter((name): name is string => Boolean(name));
      void fetch('/api/trivia-commentary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'brawl-intro', p1Categories, p2Categories, p1Name: roomAfter.names.p1, p2Name: roomAfter.names.p2 }) })
        .then(async (response) => {
          const data = await response.json() as { reply?: string };
          const latest = fullRoomRef.current;
          if (data.reply && latest && latest.phase === 'intro') publishRoom({ ...latest, hostMessage: data.reply });
        })
        .catch(() => undefined);
      return;
    }
    publishRoom(roomAfter);
  };

  const applyQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const hostApply = (asPlayer: Player, body: Record<string, unknown>): Promise<void> => {
    const run = applyQueueRef.current.then(() => hostApplyNow(asPlayer, body));
    applyQueueRef.current = run.catch(() => undefined);
    return run;
  };

  useEffect(() => {
    const id = initialMatch;
    let cancelled = false;
    let peer: any = null;
    setMatchId(id);
    window.history.replaceState(null, '', `/trivia-brawl?match=${id}&role=${role}`);
    void (async () => {
      // The pub table must open even if the online quiz service is slow or down: local categories first, online ones merged in later.
      setCategories(LOCAL_CATEGORIES);
      void fetch('https://opentdb.com/api_category.php', { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).then((d: { trivia_categories?: Category[] }) => { if (!cancelled && d.trivia_categories?.length) setCategories([...LOCAL_CATEGORIES, ...d.trivia_categories]); }).catch(() => undefined);
      const { default: Peer } = await import('peerjs');
      if (cancelled) return;
      let hosting = role === 'p1';
      let joinAttempts = 0;
      const joinGuest = () => {
        joinAttempts += 1;
        const my = joinAttempts;
        // Retire the old peer BEFORE destroying it: a destroy fires events, and a
        // zombie handler acting through the shared 'peer' variable hits the NEW peer.
        const retired = peer;
        peer = null;
        try { retired?.destroy?.(); } catch { /* teardown */ }
        peer = new Peer(PEER_CONFIG as any);
        const mine = peer;
        peer.on('open', () => {
          if (cancelled || joinAttempts !== my || peer !== mine) return;
          const link = peer.connect(`ct-trivia-${id}`, { reliable: true });
          hostLinkRef.current = link;
          link.on('open', () => { setLinked(true); hostSeenAtRef.current = Date.now(); });
          link.on('data', (message: any) => { hostSeenAtRef.current = Date.now(); setError((cur) => cur === HOST_QUIET_MSG ? '' : cur); if (message?.type === 'room') setRoom(message.room as Room); if (message?.type === 'guest-error') setError(String(message.message || 'The pub table hiccuped - try that again.')); });
          link.on('close', () => { setLinked(false); setError('The host left the pub. Ask for a fresh invite.'); });
          link.on('error', () => { setLinked(false); setError('The pub table link dropped. Ask the host to reopen it.'); });
          // A knock can vanish silently if the host's tab was asleep when it arrived.
          // Never wait forever on one knock - close it and knock again.
          window.setTimeout(() => {
            if (cancelled || linkedRef.current || joinAttempts !== my) return;
            try { link.close(); } catch { /* best effort */ }
            setError('The knock went unanswered - knocking again...');
            joinGuest();
          }, 9000);
        });
        peer.on('disconnected', () => { if (peer !== mine) return; try { peer.reconnect(); } catch { /* dropped */ } });
        peer.on('error', (peerError: any) => {
          if (cancelled || joinAttempts !== my || peer !== mine) return;
          if (peerError?.type === 'peer-unavailable' && my < 40) {
            setError('The pub table is still opening - knocking again...');
            window.setTimeout(() => { if (!cancelled && !linkedRef.current && joinAttempts === my) joinGuest(); }, 3000);
            return;
          }
          setError(peerError?.type === 'peer-unavailable' ? 'No pub table at that link. Ask the host for a fresh invite.' : 'The pub table connection hiccuped - holding on...');
        });
      };
      const openHost = (resumeAttempt: number, freshOpen = false) => {
        const retired = peer;
        peer = null;
        try { retired?.destroy?.(); } catch { /* teardown */ }
        peer = new Peer(`ct-trivia-${id}`, PEER_CONFIG as any);
        const mine = peer;
        peer.on('connection', (link: any) => {
          if (peer !== mine) { try { link.close(); } catch { /* stray */ } return; }
          guestLinkRef.current = link;
          link.on('open', () => {
            if (cancelled) return;
            setLinked(true);
            setGuestJoined(true);
            guestSeenAtRef.current = Date.now();
            const current = fullRoomRef.current;
            if (current) { try { link.send({ type: 'room', room: serializeRoom(current, 'p2') }); } catch { /* next change resyncs */ } }
          });
          link.on('data', (message: any) => { guestSeenAtRef.current = Date.now(); if (message?.type === 'ping') { try { link.send({ type: 'pong' }); } catch { /* link gone */ } } if (message?.type === 'action') void hostApply('p2', message.body || {}); });
          link.on('close', () => setLinked(false));
          link.on('error', () => setLinked(false));
          link.on('iceStateChanged', (st: string) => { if (st === 'disconnected' || st === 'failed' || st === 'closed') setLinked(false); });
        });
        peer.on('disconnected', () => { if (peer !== mine) return; try { peer.reconnect(); } catch { /* dropped */ } });
        peer.on('error', (peerError: any) => {
          if (cancelled || peer !== mine) return;
          if (peerError?.type === 'unavailable-id') {
            // The id is taken: either a live host elsewhere (shared link opened on a
            // second device) or a zombie registration - our own one, lingering at the
            // broker for up to a couple of minutes after a tab reload or iOS discard.
            // Probe the table: a live host answers a knock, a zombie does not.
            if (hosting && !linkedRef.current && resumeAttempt < 24) {
              const probe = new Peer(PEER_CONFIG as any);
              let probeDone = false;
              const probeFinish = (liveHost: boolean) => {
                if (probeDone) return;
                probeDone = true;
                try { probe.destroy(); } catch { /* teardown */ }
                if (cancelled || !hosting || linkedRef.current) return;
                if (liveHost) {
                  if (freshOpen) {
                    // Genuinely hosted elsewhere - take the guest seat instead of
                    // dying on the doorstep.
                    hosting = false;
                    try { peer.destroy(); } catch { /* teardown */ }
                    setPlayer('p2');
                    joinGuest();
                  }
                  return;
                }
                // Zombie: wait for the broker to release it, then reclaim OUR table.
                window.setTimeout(() => { if (!cancelled && hosting && !linkedRef.current) openHost(resumeAttempt + 1, freshOpen); }, 4000);
              };
              probe.on('open', () => {
                const knock = probe.connect(`ct-trivia-${id}`, { reliable: true });
                knock.on('open', () => probeFinish(true));
                knock.on('error', () => probeFinish(false));
                window.setTimeout(() => probeFinish(false), 5000);
              });
              probe.on('error', () => probeFinish(false));
              return;
            }
            return;
          }
          setError('The pub table connection hiccuped - holding on...');
        });
      };
      // iOS suspends background tabs and can silently kill the broker socket while the
      // host is off in iMessage/WhatsApp sending the invite. On resume, re-register
      // the table from scratch (same ID) so the next knock lands.
      const onVisible = () => {
        if (document.visibilityState !== 'visible' || cancelled || linkedRef.current) return;
        if (hosting && !guestLinkRef.current) { openHost(0); return; }
        if (peer && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch { /* dropped */ } }
      };
      document.addEventListener('visibilitychange', onVisible);
      if (role === 'p1') {
        publishRoom(createRoom());
        openHost(-1, true);
      } else {
        joinGuest();
      }
    })().catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not open Trivia Brawl.'); });
    return () => { cancelled = true; try { peer?.destroy?.(); } catch { /* teardown */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { linkedRef.current = linked; }, [linked]);

  // Guest heartbeat: a killed tab fires no reliable close event, so liveness
  // is proven by traffic, not by the transport.
  useEffect(() => {
    if (player !== 'p2' || !linked) return;
    const beat = window.setInterval(() => { try { hostLinkRef.current?.send?.({ type: 'ping' }); } catch { /* link gone */ } }, 5000);
    return () => window.clearInterval(beat);
  }, [player, linked]);

  // Guest side: the host proves life by answering pings. 20s of silence = the
  // table has gone quiet (killed host tab fires no reliable close event).
  useEffect(() => {
    if (player !== 'p2' || !linked) return;
    const watch = window.setInterval(() => {
      if (hostSeenAtRef.current && Date.now() - hostSeenAtRef.current > 20000) setError(HOST_QUIET_MSG);
    }, 5000);
    return () => window.clearInterval(watch);
  }, [player, linked]);

  // Host side of the heartbeat: 15s of silence from a joined guest = away.
  useEffect(() => {
    if (player !== 'p1' || !linked || !guestJoined) return;
    const watch = window.setInterval(() => {
      if (guestSeenAtRef.current && Date.now() - guestSeenAtRef.current > 15000) setLinked(false);
    }, 5000);
    return () => window.clearInterval(watch);
  }, [player, linked, guestJoined]);

  // Rematch resets the room to draft; tally the series once per finished game.
  useEffect(() => {
    if (!room) return;
    if (room.phase === 'finished' && !seriesCountedRef.current) {
      seriesCountedRef.current = true;
      setSeries((cur) => room.score.p1 === room.score.p2 ? { ...cur, draws: cur.draws + 1 } : room.score.p1 > room.score.p2 ? { ...cur, p1: cur.p1 + 1 } : { ...cur, p2: cur.p2 + 1 });
    }
    if (room.phase === 'draft') {
      if (seriesCountedRef.current) setHostText('Rematch! Same pub, fresh beer mats. Pick three new categories each - and star your POWER category.');
      seriesCountedRef.current = false;
      announcedQuestionRef.current = '';
      setSelectedCategories([]);
      setPowerId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase]);

  // Chester's live line: round intros escalate, per-question reveals call the score.
  useEffect(() => {
    if (!room || room.phase !== 'question') return;
    const key = `${room.round}:${room.qIndex}`;
    if (announcedQuestionRef.current === key) return;
    announcedQuestionRef.current = key;
    const isSabotaged = room.cardsUsed && room.round > 0 && room.currentQuestion?.disguise;
    if (room.qIndex === 0) {
      const intro = room.lastCall
        ? 'LAST CALL. Sudden death - one hard question at a time until somebody blinks.'
        : `${ROUND_INTROS[Math.min(room.round, ROUND_INTROS.length - 1)][room.round % 2]} ${room.currentQuestion ? categoryQuip(room.currentQuestion.category, room.round) : ''}`;
      setHostText(isSabotaged ? `Hear ye, thou bewildered scholar: decipher this cursed query if thy courage permits. ${intro}` : intro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, room?.round, room?.qIndex]);

  useEffect(() => {
    if (!room || room.phase !== 'reveal' || !room.result) return;
    const rr = room.result;
    const outcome = rr.p1Correct && rr.p2Correct ? 'bothRight' : !rr.p1Correct && !rr.p2Correct ? 'bothWrong' : 'oneRight';
    const who = rr.p1Correct && !rr.p2Correct ? `${room.names.p1} takes it.` : rr.p2Correct && !rr.p1Correct ? `${room.names.p2} takes it.` : '';
    const extras = [rr.double ? 'That one poured double.' : '', rr.stolenFrom ? 'A point changed pockets.' : '', rr.p1StreakBonus || rr.p2StreakBonus ? 'Somebody is on a roll.' : ''].filter(Boolean).join(' ');
    setHostText(`${revealQuip(outcome, room.round, room.qIndex)} ${who} The answer was ${rr.correctAnswer}. ${extras}`.replace(/\s+/g, ' ').trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, room?.result]);

  // End-of-round summary: the paid Chester voice once per round (as before),
  // with the local tiered line ready the instant he is quiet.
  useEffect(() => {
    if (!room || player !== 'p1' || room.phase !== 'banter') return;
    const match = fullRoomRef.current?.match;
    if (!match) return;
    const summary = roundSummary(match, room.round);
    const fallback = roundEndLine(room.round, room.names.p1, room.names.p2, room.score.p1, room.score.p2, room.lastCall);
    const roundMeta = room.roundMeta?.[room.round];
    void fetch('/api/trivia-commentary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        mode: 'brawl-round', roundIndex: room.round, roundTotal: MATCH_ROUNDS,
        category: roundMeta?.categoryName || 'House Special', difficulty: roundMeta?.difficulty,
        p1Hits: summary.p1Hits, p2Hits: summary.p2Hits,
        p1Score: room.score.p1, p2Score: room.score.p2,
        events: summary.events.join('; '), lastCall: room.lastCall,
        p1Name: room.names.p1, p2Name: room.names.p2,
      }),
    }).then(async (response) => {
      const data = await response.json() as { reply?: string; isFallback?: boolean };
      void hostApply('p1', { hostMessage: data.reply || fallback });
    }).catch(() => { void hostApply('p1', { hostMessage: fallback }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, room?.phase, room?.round]);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((current) => {
      if (current.includes(categoryId)) {
        if (powerId === categoryId) setPowerId(null);
        return current.filter((id) => id !== categoryId);
      }
      return current.length < 3 ? [...current, categoryId] : current;
    });
  };
  const starPower = (categoryId: number) => { if (selectedCategories.includes(categoryId)) setPowerId(categoryId); };
  const patchRoom = async (body: Record<string, unknown>) => {
    setError('');
    if (player === 'p1') { await hostApply('p1', body); return; }
    if (!hostLinkRef.current?.open) { setError('Not connected to the host table yet - hold on, or ask for a fresh invite.'); throw new Error('not linked'); }
    hostLinkRef.current.send({ type: 'action', body });
  };
  const submitDraft = async () => {
    if (selectedCategories.length !== 3) return;
    setIsSubmitting(true);
    try {
      if (myName.trim()) await patchRoom({ name: myName });
      await patchRoom({ categories: selectedCategories, power: powerId ?? selectedCategories[0] });
      const names = selectedCategories.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean).join(', ');
      setHostText(`${myName.trim() || (player === 'p1' ? 'Player One' : 'Player Two')} has ordered ${names}, with ${categories.find((category) => category.id === (powerId ?? selectedCategories[0]))?.name || 'their favourite'} starred as the POWER round. Chester is scribbling twenty-five questions on beer mats...`);
    } catch { /* error already on screen */ } finally { setIsSubmitting(false); }
  };
  const answer = async (selectedAnswer: string) => { try { await patchRoom({ answer: selectedAnswer }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not lock that answer.'); } };
  const playWildcard = async (card: WildcardId) => {
    try {
      await patchRoom({ wildcard: card });
      setHostText(card === 'shakespeare' ? 'Sabotage accepted. The next question shall arrive wearing a Shakespearean disguise.' : card === 'fiftyfifty' ? 'Fifty-fifty poured: two wrong answers just left the bar.' : card === 'doubledown' ? 'Double down armed. This question pays you double.' : 'Pickpocket armed. Get it right while they slip and their point is yours.');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'That card failed to land.'); }
  };
  const advance = async () => { setAdvancing(true); try { await patchRoom({ advance: true }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not advance.'); } finally { setAdvancing(false); } };
  // Timed flashes: the host rings the bell after 20 seconds so a stalled race still settles.
  const flashKey = room?.phase === 'flash' && room.flash ? `${room.round}-${room.flash.type}` : null;
  useEffect(() => {
    if (!flashKey || player !== 'p1' || !room?.flash || room.flash.type === 'duel') return;
    const bell = setTimeout(() => { void patchRoom({ flashTimeout: true }).catch(() => undefined); }, 20500);
    return () => clearTimeout(bell);
  }, [flashKey, player]);

  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/trivia-brawl?match=${matchId}&role=p2`;
  // Flash stages speak for themselves - never the previous question's reveal line.
  const visibleHostText = room && room.phase === 'flash' && room.flash ? FLASH_INTROS[room.flash.type][0]
    : room && room.phase === 'flashReveal' && room.flash ? FLASH_RESOLVE_LINES[room.flash.type]
    : (room && (room.phase === 'intro' || room.phase === 'banter') && room.hostMessage) ? room.hostMessage : hostText;

  const rouletteWatch = room?.phase === 'question' && room.currentQuestion?.roulette ? `bell-${room.round}-${room.qIndex}` : null;
  const houseWatch = room?.phase === 'reveal' && room.result?.onTheHouse ? `house-${room.round}-${room.qIndex}` : null;
  const flashWatch = room?.phase === 'flash' && room.flash ? `flash-${room.round}-${room.flash.type}` : null;
  const bannerText = rouletteWatch ? ROULETTE_LINES[0] : houseWatch ? ON_THE_HOUSE_LINES[0] : flashWatch && room?.flash ? FLASH_INTROS[room.flash.type][0] : null;
  const banner = useFlashBanner(bannerText ? `${rouletteWatch || houseWatch || flashWatch}:${bannerText}` : null);
  const bannerBody = banner ? banner.slice(banner.indexOf(':') + 1) : null;

  const view = room ? questionText(room.currentQuestion) : { question: '', answers: [] };
  const myCardsUsed = room?.cardsUsed?.[player] || { shakespeare: false, fiftyfifty: false, doubledown: false, pickpocket: false };
  const myActiveCards = room?.activeCards?.[player] || {};
  const nextRoundReady = room?.phase === 'banter' ? (room.round + 1 >= MATCH_ROUNDS || room.lastCall ? true : Boolean(room.roundMeta?.[room.round + 1]?.ready)) : true;

  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Trivia Brawl</h1></div><Link href="/trivia-brawl">← Pub door</Link></header>
    {room && <Scorebug p1Name={room.names.p1} p2Name={room.names.p2} p1Score={room.score.p1} p2Score={room.score.p2} round={room.round} qIndex={room.qIndex} lastCall={room.lastCall} finished={room.phase === 'finished'} />}
    <ChesterTeleprompter text={visibleHostText} isThinking={isSubmitting} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    <FlashBanner banner={bannerBody} />
    {room && !error && !linked && <p className="trivia-brawl-error">{player === 'p1' ? (guestJoined && room.phase !== 'draft' ? `${room.names.p2} has left the table - they can rejoin from the same invite link.` : 'Pub table open - send the invite and hold this screen.') : 'Connecting to the host table...'}</p>}
    {room && !error && player === 'p1' && !linked && guestJoined && room.phase === 'flash' && room.flash?.type === 'duel' && !room.flash.done && <div className="trivia-brawl-void">
      <button className="trivia-brawl-primary" onClick={() => void patchRoom({ voidFlash: true }).catch(() => undefined)}>🚫 VOID THE DUEL - NO FLASH POINTS</button>
      <p>Only here while {room.names.p2} is away - nobody banks, scores so far stand.</p>
    </div>}
    {!room ? <section className="trivia-brawl-question"><h2>Opening the pub table...</h2></section> : room.phase === 'draft' ? <section className="trivia-brawl-draft"><h2>{room.names[player] !== (player === 'p1' ? 'PLAYER 1' : 'PLAYER 2') ? room.names[player] : `Player ${player === 'p1' ? 'One' : 'Two'}`}: Choose 3 Categories</h2>
      <input value={myName} onChange={(event) => setMyName(event.target.value)} onBlur={() => { if (myName.trim()) void patchRoom({ name: myName }).catch(() => undefined); }} placeholder={player === 'p1' ? 'Your name (host)' : 'Your name'} maxLength={14} aria-label="Your name" />{player === 'p1' && room.categories.p2.length === 0 && <div style={{ display: 'grid', gap: '.45rem' }}>
          <button type="button" className="trivia-brawl-primary" onClick={() => { if (typeof navigator.share === 'function') { void navigator.share({ title: 'Trivia Brawl', text: 'Chester is hosting. Five rounds of five - you, me, no mercy.', url: inviteUrl }).catch(() => undefined); } else { void navigator.clipboard?.writeText(inviteUrl).catch(() => undefined); } }}>📮 SEND THE INVITE</button>
          <input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Invite link for Player 2" />
        </div>}{categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggleCategory(category.id)} aria-pressed={selectedCategories.includes(category.id)}>{selectedCategories.includes(category.id) && powerId === category.id ? `⭐ ${category.name}` : category.name}</button>)}</div> : <p>Loading the pub ledger...</p>}
      {selectedCategories.length === 3 && <div className="trivia-power"><span>⭐ Star your POWER category - your points count double in its round:</span><div className="trivia-power__picks">{selectedCategories.map((id) => <button key={id} type="button" className={powerId === id ? 'is-starred' : ''} onClick={() => starPower(id)}>{powerId === id ? '⭐ ' : ''}{categories.find((category) => category.id === id)?.name || `Category ${id}`}</button>)}</div></div>}
      <button className="trivia-brawl-primary" disabled={selectedCategories.length !== 3 || isSubmitting} onClick={() => void submitDraft()}>LOCK CATEGORIES ({selectedCategories.length}/3)</button><p>{room.categories.p1.length}/3 Player 1 choices · {room.categories.p2.length}/3 Player 2 choices</p></section>
    : room.phase === 'intro' ? <section className="trivia-brawl-question"><h2>The categories are locked.</h2><p>{room.roundMeta?.[0]?.ready ? (player === 'p1' ? 'The house is ready. Start when Chester finishes his warning.' : 'Awaiting Player One to begin the Brawl.') : 'Chester is scribbling the opening round on beer mats...'}</p>{player === 'p1' && <button className="trivia-brawl-primary" disabled={!room.roundMeta?.[0]?.ready} onClick={() => void patchRoom({ start: true })}>START THE BRAWL</button>}</section>
    : room.phase === 'finished' ? <section className="trivia-brawl-question"><h2>{room.score.p1} - {room.score.p2}</h2><p>{room.score.p1 === room.score.p2 ? 'A dead heat. Chester demands a rematch - the pub insists.' : `${room.score.p1 > room.score.p2 ? room.names.p1 : room.names.p2} wins the tab. Chester raises a glass to you both.`}</p>{(series.p1 + series.p2 + series.draws) > 0 && <p className="trivia-series">SERIES · {room.names.p1} {series.p1} - {series.p2} {room.names.p2}{series.draws ? ` (${series.draws} draw${series.draws > 1 ? 's' : ''})` : ''}</p>}<button className="trivia-brawl-primary" onClick={() => void patchRoom({ rematch: true })}>🔁 REMATCH - SAME PUB, NEW QUESTIONS</button></section>
    : <section className="trivia-brawl-question">
      {room.phase !== 'flash' && room.phase !== 'flashReveal' && room.phase !== 'banter' && <>
        <MatchBadges difficulty={room.lastCall ? undefined : room.roundMeta?.[room.round]?.difficulty} isDouble={room.isDoubleQuestion} powerForMe={room.powerRoundFor.includes(player)} streak={room.streak[player]} lastCall={room.lastCall} roulette={Boolean(room.currentQuestion?.roulette)} />
        <span>{room.currentQuestion?.category}</span>
        <h2>{view.question || 'Chester is still scribbling this round...'}</h2>
      </>}
      {room.phase === 'flash' && room.flash ? <FlashBrawl flash={room.flash} player={player} p1Name={room.names.p1} p2Name={room.names.p2} onAnswer={(a) => void patchRoom({ flashAnswer: a }).catch(() => undefined)} onPick={(o) => void patchRoom({ duelPick: o }).catch(() => undefined)} />
      : room.phase === 'flashReveal' && room.flash && room.result ? <FlashResultBrawl flash={room.flash} result={room.result} p1Name={room.names.p1} p2Name={room.names.p2} player={player} advancing={advancing} onAdvance={() => void advance()} />
      : room.phase === 'reveal' && room.result ? <>
        <RevealCards p1Name={room.names.p1} p2Name={room.names.p2} answers={room.answers} result={room.result} />
        {player === 'p1' && <button className="trivia-brawl-primary" disabled={advancing} onClick={() => void advance()}>{room.lastCall ? (room.score.p1 === room.score.p2 ? 'NEXT DECIDER' : 'FINAL CALL') : room.qIndex + 1 >= QUESTIONS_PER_ROUND ? '⚡ FLASH FINALE' : 'NEXT QUESTION'}</button>}
        {player !== 'p1' && <p>Awaiting the host to pour the next one...</p>}
      </> : room.phase === 'banter' ? <>
        <LeaderboardCard p1Name={room.names.p1} p2Name={room.names.p2} score={room.score} history={room.history} streak={room.streak} cardsUsed={room.cardsUsed} />
        <p>{room.hostMessage || roundEndLine(room.round, room.names.p1, room.names.p2, room.score.p1, room.score.p2, room.lastCall)}</p>
        {player === 'p1' && <button className="trivia-brawl-primary" disabled={advancing || !nextRoundReady} onClick={() => void advance()}>{nextRoundReady ? (room.lastCall || (room.round + 1 >= MATCH_ROUNDS && room.score.p1 === room.score.p2) ? 'LAST CALL - SUDDEN DEATH' : room.round + 1 >= MATCH_ROUNDS ? 'FINAL CALL' : 'NEXT ROUND') : 'CHESTER IS SCRIBBLING...'}</button>}
        {player !== 'p1' && <p>Awaiting the host...</p>}
      </> : <>
        <div className="trivia-brawl-answers">{view.answers.map((option, index) => <button key={`${index}-${room.currentQuestion?.answers[index] ?? option}`} onClick={() => void answer(room.currentQuestion?.answers[index] ?? option)} disabled={Boolean(room.answers[player])}>{option}</button>)}</div>
        <WildcardBar cardsUsed={myCardsUsed} activeCards={myActiveCards} canPlayAnswers={!room.answers[player] && Boolean(room.currentQuestion)} canShakespeare={!room.lastCall && room.round < MATCH_ROUNDS - 1} onPlay={(card) => void playWildcard(card)} />
        {room.answers[player] && <p>Answer locked. Awaiting the rival.</p>}
      </>}
    </section>}
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
  draft: 'Pick three categories and I shall pick three of mine. Best of five rounds - loser buys the next round.',
  correct: ['Clean hit! The whole pub felt that one.', 'Correct, and stylishly done. I am making a note in the ledger.', 'A point for the challenger - the bar regulars approve loudly.', 'Right answer. I taught you everything you know. Do not quote me on that.'],
  wrong: ['Oh, the bar winced in unison. It was not that one.', 'A swing and a miss - the correct answer was right there, being correct.', 'Not this time. Chester quietly slides the answer across the bar.', 'Wrong, but committed to it - and confidence counts for something. Not points, but something.'],
  win: 'You beat me in my own pub. Frame the receipt - I demand a rematch.',
  lose: 'The house wins. The house is me. The house always remembers.',
  draw: 'A dead heat! The pub demands a tiebreaker next time.',
};

function SoloBrawl({ onExit, road = false }: { onExit: () => void; road?: boolean }) {
  const [roadLv] = useState<number | null>(() => (road && typeof window !== 'undefined' ? getTrvRoad() : null));
  const [roadNote, setRoadNote] = useState('');
  const chesterAcc = roadLv ? TRIVIA_ACC[roadLv - 1] : 0.72;
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
    window.history.replaceState(null, '', road ? '/trivia-brawl?road=1' : '/trivia-brawl?solo=1');
    setCategories(LOCAL_CATEGORIES);
    void fetch('https://opentdb.com/api_category.php', { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((data: { trivia_categories?: Category[] }) => { if (data.trivia_categories?.length) setCategories([...LOCAL_CATEGORIES, ...data.trivia_categories]); })
      .catch(() => undefined);
  }, []);

  useEffect(() => { if (phase !== 'finished' || !roadLv) return; if (score.you > score.chester) { if (roadLv < TRV_ROAD_MAX) setTrvRoad(roadLv + 1); setRoadNote(roadLv < TRV_ROAD_MAX ? `Level ${roadLv} cleared. Next: level ${roadLv + 1}.` : 'THE LANDLORD IS BEATEN. The pub is yours.'); } else setRoadNote('Not this time. Same level, go again.'); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => setPicked((current) => current.includes(id) ? current.filter((c) => c !== id) : current.length < 3 ? [...current, id] : current);

  const fetchSoloQuestion = async (categoryId: number): Promise<SoloQuestion> => {
    if (categoryId < 0) {
      const source = pickLocalQuestion(categoryId);
      if (!source) throw new Error('That category is still being written on beer mats.');
      return { category: LOCAL_CATEGORIES.find((c) => c.id === categoryId)?.name || 'House Special', question: source.question, correctAnswer: source.correct, answers: shuffled([source.correct, ...source.wrong]), chesterCorrect: Math.random() < chesterAcc };
    }
    let payload: { response_code: number; results: Array<{ category: string; question: string; correct_answer: string; incorrect_answers: string[] }> };
    try {
      const response = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${categoryId}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      payload = await response.json();
    } catch { return fetchSoloQuestion(shuffled(LOCAL_CATEGORIES)[0].id); }
    const source = payload.results?.[0];
    if (payload.response_code !== 0 || !source) return fetchSoloQuestion(shuffled(LOCAL_CATEGORIES)[0].id);
    const correctAnswer = decodeHtmlClient(source.correct_answer);
    const wrongPool = source.incorrect_answers.map(decodeHtmlClient);
    // Chester answers 72% correct; when wrong he picks a random wrong option.
    const chesterCorrect = Math.random() < chesterAcc;
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
      setHostLine(`Round 1 of 5 - ${first.category}. ${categoryQuip(first.category, 0)}`);
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
    if (nextRound >= 5) {
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
      setHostLine(`Round ${nextRound + 1} of 5 - ${next.category}. ${categoryQuip(next.category, nextRound)}`);
      setPhase('question');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not draw the next question.'); }
  };

  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>SOLO AT THE BAR</span><h1>You vs Chester</h1></div><button type="button" className="trivia-brawl-sabotage" onClick={onExit}>← Pub door</button></header>
    <Scorebug p1Name="YOU" p2Name="CHESTER" p1Score={score.you} p2Score={score.chester} round={round} finished={phase === 'finished'} />
    <ChesterTeleprompter text={hostLine} isThinking={false} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    {phase === 'draft' && <section className="trivia-brawl-draft"><h2>Choose your 3 categories</h2>
      {categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggle(category.id)} aria-pressed={picked.includes(category.id)}>{category.name}</button>)}</div> : <p>Loading the pub ledger...</p>}
      <button className="trivia-brawl-primary" disabled={picked.length !== 3} onClick={() => void startGame()}>BELLYS UP - START ({picked.length}/3)</button>
    </section>}
    {(phase === 'question' || phase === 'reveal') && question && <section className="trivia-brawl-question"><span>{question.category}</span><h2>{question.question}</h2>
      <div className="trivia-brawl-answers">{question.answers.map((option) => <button key={option} onClick={() => answerSolo(option)} disabled={phase === 'reveal'}>{phase === 'reveal' && option === question.correctAnswer ? `${option} ✓` : phase === 'reveal' && option === locked ? `${option} ✗` : option}</button>)}</div>
      {phase === 'reveal' && <button className="trivia-brawl-primary" onClick={() => void nextSolo()}>{round + 1 >= 5 ? 'FINAL CALL' : 'NEXT ROUND'}</button>}
    </section>}
    {phase === 'finished' && <section className="trivia-brawl-question"><h2>{score.you} - {score.chester}</h2>
      <p>{score.you > score.chester ? 'You take the tab. Chester is already plotting the rematch.' : score.you < score.chester ? 'Chester takes it. The ledger remembers.' : 'Dead heat. The pub wants a tiebreaker.'}</p>
      {roadLv && <p>{roadNote}</p>}
      {roadLv && <a className="trivia-brawl-primary" href="/road/trivia" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>BACK TO THE MAP</a>}
      {!roadLv && <button className="trivia-brawl-primary" onClick={() => { setPhase('draft'); setPicked([]); setRound(0); setScore({ you: 0, chester: 0 }); setQuestion(null); setHostLine(SOLO_LINES.draft); }}>RUN IT BACK</button>}
    </section>}
  </main>;
}
// BUILD 183 - Pass & Play over the shared match engine: one phone, two players,
// five rounds of five, wildcards on your own turn, all banter local (no LLM, no cost).
function PassAndPlay({ onExit }: { onExit: () => void }) {
  type PPPhase = 'names' | 'draftA' | 'draftB' | 'building' | 'askA' | 'cover' | 'askB' | 'reveal' | 'flashA' | 'flashCover' | 'flashB' | 'flashShared' | 'flashReveal' | 'roundEnd' | 'finished';
  const [phase, setPhase] = useState<PPPhase>('names');
  const [names, setNames] = useState({ a: '', b: '' });
  const [categories, setCategories] = useState<Category[]>(LOCAL_CATEGORIES);
  const [picks, setPicks] = useState<{ a: number[]; b: number[] }>({ a: [], b: [] });
  const [power, setPower] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [match, setMatch] = useState<MatchState | null>(null);
  const [series, setSeries] = useState({ a: 0, b: 0, draws: 0 });
  const [hostLine, setHostLine] = useState('One phone, two players, five rounds of five. Type your names - no peeking, Chester is watching.');
  const [error, setError] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const matchRef = useRef<MatchState | null>(null);
  const nameA = names.a.trim() || 'PLAYER 1';
  const nameB = names.b.trim() || 'PLAYER 2';

  useEffect(() => {
    window.history.replaceState(null, '', '/trivia-brawl?pass=1');
    void fetch('https://opentdb.com/api_category.php', { signal: AbortSignal.timeout(5000) }).then((r) => r.json())
      .then((data: { trivia_categories?: Category[] }) => setCategories([...LOCAL_CATEGORIES, ...(data.trivia_categories || [])]))
      .catch(() => undefined);
  }, []);

  const commitMatch = (next: MatchState) => { matchRef.current = next; setMatch(next); };
  const nameOf = (id: number) => categories.find((category) => category.id === id)?.name || (id < 0 ? 'House Special' : `Category ${id}`);

  const toggle = (who: 'a' | 'b', id: number) => setPicks((cur) => {
    const list = cur[who];
    if (list.includes(id)) { if ((who === 'a' ? power.a : power.b) === id) setPower((p) => ({ ...p, [who]: null })); return { ...cur, [who]: list.filter((c) => c !== id) }; }
    return list.length < 3 ? { ...cur, [who]: [...list, id] } : cur;
  });
  const starPower = (who: 'a' | 'b', id: number) => { if (picks[who].includes(id)) setPower((p) => ({ ...p, [who]: id })); };

  const buildGame = async () => {
    setPhase('building');
    setError('');
    setHostLine('Chester is scribbling twenty-five questions on beer mats. Hands off the phone for a moment...');
    const toPicks = (ids: number[]) => ids.map((id) => ({ id, name: nameOf(id) }));
    const built = planMatch(toPicks(picks.a), toPicks(picks.b), { p1: power.a ?? picks.a[0], p2: power.b ?? picks.b[0] });
    commitMatch(built);
    // Round one pours first; the rest arrive in the background while they play.
    await new Promise<void>((resolve) => {
      void loadAllRounds(built, (roundIndex, questions) => {
        const latest = matchRef.current;
        if (latest) commitMatch(markRoundLoaded(latest, roundIndex, questions));
        if (roundIndex === 0) resolve();
      });
    });
    setPhase('askA');
    setHostLine(`${ROUND_INTROS[0][0]} ${nameA}, you first. ${nameB}, look away!`);
  };

  const playCard = (who: Player, card: WildcardId) => {
    const current = matchRef.current;
    if (!current) return;
    const applied = applyWildcard(current, who, card);
    if (applied.error) { setError(applied.error); return; }
    commitMatch(applied.state);
    setHostLine(card === 'shakespeare' ? `Sabotage! ${who === 'p1' ? nameB : nameA}'s next question arrives in Shakespearean disguise.` : card === 'fiftyfifty' ? 'Fifty-fifty poured - two wrong answers just left the bar.' : card === 'doubledown' ? 'Double down armed. This question pays you double.' : 'Pickpocket armed. Get it right while they slip and their point is yours.');
  };

  const answerFor = (who: Player, option: string) => {
    const current = matchRef.current;
    if (!current) return;
    const applied = applyAnswer(current, who, option);
    if (applied.error) { setError(applied.error); return; }
    commitMatch(applied.state);
    if (applied.state.phase === 'reveal') {
      const rr = applied.state.result;
      if (!rr) return;
      if (rr.onTheHouse) setPpBannerWatch(`house-${applied.state.round}-${applied.state.qIndex}:${ON_THE_HOUSE_LINES[0]}`);
      const outcome = rr.p1Correct && rr.p2Correct ? 'bothRight' : !rr.p1Correct && !rr.p2Correct ? 'bothWrong' : 'oneRight';
      const whoTook = rr.p1Correct && !rr.p2Correct ? `${nameA} takes it.` : rr.p2Correct && !rr.p1Correct ? `${nameB} takes it.` : '';
      const extras = [rr.double ? 'That one poured double.' : '', rr.stolenFrom ? 'A point changed pockets.' : '', rr.p1StreakBonus || rr.p2StreakBonus ? 'Somebody is on a roll.' : ''].filter(Boolean).join(' ');
      setHostLine(`${revealQuip(outcome, applied.state.round, applied.state.qIndex)} ${whoTook} The answer was ${rr.correctAnswer}. ${extras}`.replace(/\s+/g, ' ').trim());
      setPhase('reveal');
      return;
    }
    setPhase('cover');
    setHostLine(`${who === 'p1' ? nameA : nameB} has locked in. Pass the phone - and no whispering.`);
  };

  const next = async () => {
    const current = matchRef.current;
    if (!current) return;
    setAdvancing(true);
    const advanced = await advanceMatch(current);
    setAdvancing(false);
    if (advanced.error) { setError(advanced.error); return; }
    const nextState = advanced.state;
    commitMatch(nextState);
    if (nextState.phase === 'finished') {
      setSeries((cur) => nextState.score.p1 === nextState.score.p2 ? { ...cur, draws: cur.draws + 1 } : nextState.score.p1 > nextState.score.p2 ? { ...cur, a: cur.a + 1 } : { ...cur, b: cur.b + 1 });
      setHostLine(nextState.score.p1 === nextState.score.p2 ? 'A dead heat! The pub insists on a rematch.' : `${nextState.score.p1 > nextState.score.p2 ? nameA : nameB} wins the tab. Chester raises a glass to you both.`);
      setPhase('finished');
      return;
    }
    if (nextState.phase === 'banter') {
      setHostLine(roundEndLine(nextState.round, nameA, nameB, nextState.score.p1, nextState.score.p2, nextState.lastCall));
      setPhase('roundEnd');
      return;
    }
    if (nextState.phase === 'flash' && nextState.flash) {
      const type = nextState.flash.type;
      setPpBannerWatch(`flash-${nextState.round}-${type}:${FLASH_INTROS[type][0]}`);
      if (type === 'fastest' || type === 'duel' || type === 'lastorders') {
        setHostLine(FLASH_INTROS[type][0]);
        setPhase('flashShared');
      } else {
        setHostLine(`${FLASH_INTROS[type][0]} ${nameA}, you first. ${nameB}, look away!`);
        setPhase('flashA');
      }
      return;
    }
    if (nextState.qIndex === 0) {
      const intro = nextState.lastCall ? 'LAST CALL. Sudden death - first slip buys the tab.' : ROUND_INTROS[Math.min(nextState.round, ROUND_INTROS.length - 1)][nextState.round % 2];
      setHostLine(`${intro} ${nameA}, you first.`);
    } else if (currentQuestionOf(nextState)?.roulette) {
      setPpBannerWatch(`bell-${nextState.round}-${nextState.qIndex}:${ROULETTE_LINES[0]}`);
      setHostLine(`${ROULETTE_LINES[nextState.qIndex % ROULETTE_LINES.length]} ${nameA}, you ring it in.`);
    } else {
      setHostLine(`Question ${nextState.qIndex + 1} of ${QUESTIONS_PER_ROUND}. ${nameA}, back to you.`);
    }
    setPhase('askA');
  };


  const [ppBannerWatch, setPpBannerWatch] = useState<string | null>(null);
  const ppBanner = useFlashBanner(ppBannerWatch);
  const ppBannerBody = ppBanner ? ppBanner.slice(ppBanner.indexOf(':') + 1) : null;

  const answerFlashFor = (who: Player, option: string) => {
    const current = matchRef.current;
    if (!current) return;
    const applied = applyFlashAnswer(current, who, option);
    if (applied.error) { setError(applied.error); return; }
    commitMatch(applied.state);
    if (applied.state.phase === 'flashReveal') {
      const rr = applied.state.result;
      const note = rr ? (rr.p1Points === rr.p2Points ? (rr.p1Points ? 'Both bank double.' : 'Nobody banked it.') : `${rr.p1Points > rr.p2Points ? nameA : nameB} banks ${Math.max(rr.p1Points, rr.p2Points)}.`) : '';
      setHostLine(`${FLASH_RESOLVE_LINES[applied.state.flash?.type || 'riddle']} ${note}`.trim());
      setPhase('flashReveal');
      return;
    }
    if (applied.state.flash?.type === 'fastest' || applied.state.flash?.type === 'lastorders') {
      setHostLine(`${who === 'p1' ? nameA : nameB} has tapped. ${who === 'p1' ? nameB : nameA}, your glass is still pouring.`);
      return; // shared screen: the other player taps on the same screen
    }
    setPhase('flashCover');
    setHostLine(`${who === 'p1' ? nameA : nameB} has locked in. Pass the phone - the flash waits for no one.`);
  };

  const duelPickFor = (who: Player, option: string) => {
    const current = matchRef.current;
    if (!current) return;
    const applied = applyDuelPick(current, who, option);
    if (applied.error) { setError(applied.error); return; }
    commitMatch(applied.state);
    if (applied.state.phase === 'flashReveal') {
      const rr = applied.state.result;
      const note = rr ? (rr.p1Points === rr.p2Points ? 'Level baskets - a point each.' : `${rr.p1Points > rr.p2Points ? nameA : nameB} takes The Twenty and banks double.`) : '';
      setHostLine(`${FLASH_RESOLVE_LINES.duel} ${note}`.trim());
      setPhase('flashReveal');
    } else {
      setHostLine(`${applied.state.flash?.turn === 'p1' ? nameA : nameB}, your tap.`);
    }
  };

  const rematch = () => { setPicks({ a: [], b: [] }); setPower({ a: null, b: null }); matchRef.current = null; setMatch(null); setError(''); setPhase('draftA'); setHostLine(`Rematch! ${nameA}, choose three new categories - and star your POWER round. ${nameB}, eyes shut.`); };

  useEffect(() => {
    if (phase !== 'flashA' && phase !== 'flashB' && phase !== 'flashShared') return;
    if (matchRef.current?.flash?.type === 'duel') return;
    const bell = setTimeout(() => {
      const current = matchRef.current;
      if (!current || current.phase !== 'flash') return;
      if (phase === 'flashA') {
        // Player one stalled: they forfeit their turn, but player two still gets a full timed turn of their own.
        setHostLine(`Time! ${nameA} didn't bank it. Pass the phone - ${nameB}, the flash is still live for you.`);
        setPhase('flashCover');
        return;
      }
      const settled = resolveFlashTimeout(current);
      if (settled.error) return;
      commitMatch(settled.state);
      setHostLine('Chester rings the bell - the flash settles as it stood.');
      setPhase('flashReveal');
    }, 25000);
    return () => clearTimeout(bell);
  }, [phase]);

  const activePlayer: Player = phase === 'askB' ? 'p2' : 'p1';
  // One viewerQuestion per render: it shuffles and trims, so a second call inside the
  // answer map can disagree with what is displayed and submit the wrong raw answer.
  const activeView = match ? viewerQuestion(match, activePlayer) : null;
  const view = activeView ? questionText(activeView) : { question: '', answers: [] };
  const answeringName = phase === 'askB' ? nameB : nameA;
  const q = match ? currentQuestionOf(match) : null;

  const catGrid = (who: 'a' | 'b') => categories.length ? <div className="trivia-brawl-categories">{categories.map((category) => <button key={category.id} onClick={() => toggle(who, category.id)} aria-pressed={picks[who].includes(category.id)}>{picks[who].includes(category.id) && power[who] === category.id ? `⭐ ${category.name}` : category.name}</button>)}</div> : <p>Loading the pub ledger...</p>;
  const powerPicker = (who: 'a' | 'b') => picks[who].length === 3 ? <div className="trivia-power"><span>⭐ Star your POWER category - your points count double in its round:</span><div className="trivia-power__picks">{picks[who].map((id) => <button key={id} type="button" className={power[who] === id ? 'is-starred' : ''} onClick={() => starPower(who, id)}>{power[who] === id ? '⭐ ' : ''}{nameOf(id)}</button>)}</div></div> : null;

  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>ONE PHONE · TWO PLAYERS</span><h1>Pass &amp; Play</h1></div><button type="button" className="trivia-brawl-sabotage" onClick={onExit}>← Pub door</button></header>
    {match && <Scorebug p1Name={nameA} p2Name={nameB} p1Score={match.score.p1} p2Score={match.score.p2} round={match.round} qIndex={match.qIndex} lastCall={match.lastCall} finished={phase === 'finished'} />}
    <ChesterTeleprompter text={hostLine} isThinking={phase === 'building'} isMobile />
    {error && <p className="trivia-brawl-error">{error}</p>}
    <FlashBanner banner={ppBannerBody} />
    {phase === 'names' && <section className="trivia-brawl-draft"><h2>Who is playing?</h2>
      <input value={names.a} onChange={(e) => setNames((c) => ({ ...c, a: e.target.value }))} placeholder="Player one name" maxLength={14} aria-label="Player one name" />
      <input value={names.b} onChange={(e) => setNames((c) => ({ ...c, b: e.target.value }))} placeholder="Player two name" maxLength={14} aria-label="Player two name" />
      <button className="trivia-brawl-primary" onClick={() => { setPhase('draftA'); setHostLine(`${nameA}, choose three categories - and star your POWER round. ${nameB}, eyes shut - you pick next.`); }}>PULL UP A STOOL</button></section>}
    {phase === 'draftA' && <section className="trivia-brawl-draft"><h2>{nameA}: choose 3 categories</h2>{catGrid('a')}{powerPicker('a')}
      <button className="trivia-brawl-primary" disabled={picks.a.length !== 3} onClick={() => { setPhase('draftB'); setHostLine(`${nameB}, your turn. Three categories and a POWER star - ${nameA}, no peeking.`); }}>PASS TO {nameB.toUpperCase()} ({picks.a.length}/3)</button></section>}
    {phase === 'draftB' && <section className="trivia-brawl-draft"><h2>{nameB}: choose 3 categories</h2>{catGrid('b')}{powerPicker('b')}
      <button className="trivia-brawl-primary" disabled={picks.b.length !== 3} onClick={() => void buildGame()}>BELLYS UP - START ({picks.b.length}/3)</button></section>}
    {phase === 'building' && <section className="trivia-brawl-question"><h2>Pulling the pints...</h2><p>Hand-written shelves are instant. Online categories take a few seconds each - later rounds pour while you play.</p></section>}
    {(phase === 'askA' || phase === 'askB') && match && q && <section className="trivia-brawl-question">
      <MatchBadges difficulty={match.lastCall ? undefined : match.rounds[match.round]?.difficulty} isDouble={match.doubleQuestions.includes(`${match.round}:${match.qIndex}`)} powerForMe={match.power[activePlayer] === match.rounds[match.round]?.categoryId} streak={match.streak[activePlayer]} lastCall={match.lastCall} roulette={Boolean(activeView?.roulette)} />
      <span>{q.category} · {answeringName} to answer</span><h2>{view.question}</h2>
      <div className="trivia-brawl-answers">{view.answers.map((option, index) => { const raw = activeView?.answers[index] ?? option; return <button key={`${index}-${raw}`} onClick={() => answerFor(activePlayer, raw)}>{option}</button>; })}</div>
      <WildcardBar cardsUsed={match.cardsUsed[activePlayer]} activeCards={match.activeCards[activePlayer]} canPlayAnswers={!match.answers[activePlayer] && Boolean(q)} canShakespeare={!match.lastCall && match.round < MATCH_ROUNDS - 1} onPlay={(card) => playCard(activePlayer, card)} />
    </section>}
    {phase === 'cover' && <section className="trivia-brawl-question"><h2>🔒 Answer locked</h2><p>Pass the phone to {nameB}. The question is hidden until you take it.</p>
      <button className="trivia-brawl-primary" onClick={() => { setPhase('askB'); setHostLine(`${nameB}, same question. ${nameA} - eyes off the screen!`); }}>I AM {nameB.toUpperCase()} - SHOW QUESTION</button></section>}
    {(phase === 'flashA' || phase === 'flashB') && match?.flash?.question && <section className="trivia-brawl-question trivia-flash">
      <span className="trivia-badge trivia-badge--flash">⚡ FLASH FINALE · {FLASH_LABEL[match.flash.type]} · DOUBLE POINTS</span>
      <span>{match.flash.question.category} · {phase === 'flashB' ? nameB : nameA} to answer</span><PpCountdown seconds={25} resetKey={`${match.round}-${phase}`} /><h2>{match.flash.question.question}</h2>
      {match.flash.type === 'lastorders' && <p>Both of you can bank double - the swifter correct glass gets a +1 top-up. Quick about it.</p>}
      <div className="trivia-brawl-answers">{match.flash.question.answers.map((option) => <button key={option} onClick={() => answerFlashFor(phase === 'flashB' ? 'p2' : 'p1', option)}>{option}</button>)}</div>
    </section>}
    {phase === 'flashCover' && <section className="trivia-brawl-question"><h2>🔒 Flash answer locked</h2><p>Pass the phone to {nameB}. The flash question stays hidden.</p>
      <button className="trivia-brawl-primary" onClick={() => { setPhase('flashB'); setHostLine(`${nameB}, same flash. ${nameA} - eyes off!`); }}>I AM {nameB.toUpperCase()} - SHOW FLASH</button></section>}
    {phase === 'flashShared' && match?.flash && <section className="trivia-brawl-question trivia-flash">
      <span className="trivia-badge trivia-badge--flash">⚡ FLASH FINALE · {FLASH_LABEL[match.flash.type]} · DOUBLE POINTS</span>
      {match.flash.type === 'fastest' && match.flash.question && <>
        <span>{match.flash.question.category}</span><h2>{match.flash.question.question}</h2>
        <PpCountdown seconds={25} resetKey={`${match.round}-fastest`} />
        <p>Shared screen, two fingers. First tap on the CORRECT answer banks double - tap your own half of the answer!</p>
        <div className="trivia-brawl-answers trivia-flash-zones">{match.flash.question.answers.map((option) => <div key={option} className="trivia-flash-zone">
          <button disabled={Boolean(match.flash?.answers.p1)} onClick={() => answerFlashFor('p1', option)}>{nameA}</button>
          <span>{option}</span>
          <button disabled={Boolean(match.flash?.answers.p2)} onClick={() => answerFlashFor('p2', option)}>{nameB}</button>
        </div>)}</div>
        {(match.flash.answers.p1 || match.flash.answers.p2) && <p>{match.flash.answers.p1 ? `${nameA} lunged and missed! ` : ''}{match.flash.answers.p2 ? `${nameB} lunged and missed! ` : ''}Free swing for the rival.</p>}
      </>}
      {match.flash.type === 'lastorders' && match.flash.question && <>
        <span>{match.flash.question.category}</span><h2>{match.flash.question.question}</h2>
        <PpCountdown seconds={25} resetKey={`${match.round}-lastorders`} />
        <p>Shared screen, both of you tap your own half. Correct banks double for each of you - the FIRST correct tap gets a +1 top-up. Twenty-five seconds, one tap each.</p>
        <div className="trivia-brawl-answers trivia-flash-zones">{match.flash.question.answers.map((option) => <div key={option} className="trivia-flash-zone">
          <button disabled={Boolean(match.flash?.answers.p1)} onClick={() => answerFlashFor('p1', option)}>{nameA}</button>
          <span>{option}</span>
          <button disabled={Boolean(match.flash?.answers.p2)} onClick={() => answerFlashFor('p2', option)}>{nameB}</button>
        </div>)}</div>
        {(match.flash.answers.p1 || match.flash.answers.p2) && <p>{match.flash.answers.p1 ? `${nameA} has tapped. ` : ''}{match.flash.answers.p2 ? `${nameB} has tapped. ` : ''}</p>}
      </>}
      {match.flash.type === 'duel' && match.flash.board && <>
        <h2>{match.flash.board.prompt}</h2>
        <p>Take turns tapping one option. A wrong tap is a strike - three strikes and the flash is gone. Clear all ten and the fuller basket wins (level baskets split it).</p>
        <p className="trivia-flash-turn">{match.flash.turn === 'p1' ? nameA : nameB} to tap · Strikes: {nameA} {match.flash.strikes.p1}/3 · {nameB} {match.flash.strikes.p2}/3</p>
        <div className="trivia-duel-grid">{match.flash.board.options.map((option) => {
          const picked = match.flash?.picked.includes(option);
          const wasCorrect = picked && (match.flash?.picks.p1.includes(option) || match.flash?.picks.p2.includes(option));
          return <button key={option} disabled={Boolean(picked)} onClick={() => duelPickFor(match.flash?.turn || 'p1', option)} className={wasCorrect ? 'is-correct' : picked ? 'is-strike' : ''}>{option}{wasCorrect ? ' ✓' : picked ? ' ✗' : ''}</button>;
        })}</div>
      </>}
    </section>}
    {phase === 'flashReveal' && match?.result && match.flash && <section className="trivia-brawl-question trivia-flash">
      <span className="trivia-badge trivia-badge--flash">⚡ {FLASH_LABEL[match.flash.type]} - SETTLED</span>
      <h2>{match.flash.question?.question || match.flash.board?.prompt}</h2>
      {match.flash.type === 'duel' ? <p>{match.result.p1Points === match.result.p2Points ? 'Level baskets - a point each.' : `${match.result.p1Points > match.result.p2Points ? nameA : nameB} takes The Twenty and banks double.`} {`The full shelf: ${match.flash.board?.correct.join(', ')}.`}</p>
        : <p>The answer was <b>{match.result.correctAnswer}</b>. {match.result.p1Points === match.result.p2Points ? (match.result.p1Points ? 'Both bank double.' : 'Nobody banked it.') : `${match.result.p1Points > match.result.p2Points ? nameA : nameB} banks ${Math.max(match.result.p1Points, match.result.p2Points)}.`}</p>}
      <button className="trivia-brawl-primary" disabled={advancing} onClick={() => void next()}>{advancing ? 'POURING...' : 'ROUND SUMMARY'}</button></section>}
    {phase === 'reveal' && match?.result && q && <section className="trivia-brawl-question">
      <span>{q.category}</span><h2>{q.question}</h2>
      <RevealCards p1Name={nameA} p2Name={nameB} answers={match.answers} result={match.result} />
      <button className="trivia-brawl-primary" disabled={advancing} onClick={() => void next()}>{advancing ? 'POURING...' : match.lastCall ? (match.score.p1 === match.score.p2 ? 'NEXT DECIDER' : 'FINAL CALL') : match.qIndex + 1 >= QUESTIONS_PER_ROUND ? '⚡ FLASH FINALE' : 'NEXT QUESTION'}</button></section>}
    {phase === 'roundEnd' && match && <section className="trivia-brawl-question"><h2>Round {match.round + 1} of {MATCH_ROUNDS} poured.</h2>
      <LeaderboardCard p1Name={nameA} p2Name={nameB} score={match.score} history={match.history} streak={match.streak} cardsUsed={match.cardsUsed} />
      <button className="trivia-brawl-primary" disabled={advancing || (match.round + 1 < MATCH_ROUNDS && !match.rounds[match.round + 1]?.ready)} onClick={() => void next()}>{advancing ? 'POURING...' : (match.round + 1 < MATCH_ROUNDS && !match.rounds[match.round + 1]?.ready) ? 'CHESTER IS SCRIBBLING...' : match.round + 1 >= MATCH_ROUNDS ? (match.score.p1 === match.score.p2 ? 'LAST CALL - SUDDEN DEATH' : 'FINAL CALL') : 'NEXT ROUND'}</button></section>}
    {phase === 'finished' && match && <section className="trivia-brawl-question"><h2>{match.score.p1} - {match.score.p2}</h2>
      <p className="trivia-series">SERIES · {nameA} {series.a} - {series.b} {nameB}{series.draws ? ` (${series.draws} draw${series.draws > 1 ? 's' : ''})` : ''}</p>
      <button className="trivia-brawl-primary" onClick={rematch}>🔁 REMATCH - NEW CATEGORIES</button></section>}
  </main>;
}

function TriviaLobby({ onHost, onSolo, onPass }: { onHost: () => void; onSolo: () => void; onPass: () => void }) {
  const [scores, setScores] = useState<SoloScore[]>([]);
  useEffect(() => { setScores(loadSoloScores().slice(0, 5)); }, []);
  return <main className="trivia-brawl-page">
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Trivia Brawl</h1></div><Link href="/">← Chesterville</Link></header>
    <ChesterTeleprompter text="Welcome to my pub. Season Two: ten house categories, hundreds of questions, rematches, and one-phone Pass & Play. Play me solo, or host a brawl and send the link. I host, I judge, I remember everything." isThinking={false} isMobile />
    <section className="trivia-brawl-draft">
      <h2>Take a seat</h2>
      <button className="trivia-brawl-primary" onClick={onSolo}>🧠 PLAY SOLO VS CHESTER</button>
      <button className="trivia-brawl-primary" onClick={onPass}>📱 PASS &amp; PLAY - ONE PHONE, TWO PLAYERS</button>
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
  const [view, setView] = useState<'lobby' | 'brawl' | 'solo' | 'pass' | 'road'>('lobby');
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
    } else if (params.get('host') === '1') {
      setMatch(makeMatchId()); setRole('p1'); setView('brawl');
    } else if (params.get('road') === '1') {
      setView('road');
    } else if (params.get('pass') === '1') {
      setView('pass');
    }
    setReady(true);
  }, []);

  if (!ready) return <main className="trivia-brawl-page" />;
  if (view === 'solo') return <SoloBrawl onExit={() => { window.history.replaceState(null, '', '/trivia-brawl'); setView('lobby'); }} />;
  if (view === 'road') return <SoloBrawl road onExit={() => { window.location.href = '/road/trivia'; }} />;
  if (view === 'pass') return <PassAndPlay onExit={() => { window.history.replaceState(null, '', '/trivia-brawl'); setView('lobby'); }} />;
  if (view === 'brawl') return <BrawlGame matchId={match} role={role} />;
  return <TriviaLobby
    onSolo={() => setView('solo')}
    onPass={() => setView('pass')}
    onHost={() => { const id = makeMatchId(); setMatch(id); setRole('p1'); setView('brawl'); }}
  />;
}
