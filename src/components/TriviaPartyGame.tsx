"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { TriviaSetupPanel } from './TriviaSetupPanel';
import { ChesterTeleprompter } from './ChesterUI';
import { usePartyConnection } from '@/lib/use-trivia-party';
import { LOCAL_CATEGORIES } from '@/lib/trivia-local';
import { PARTY_RULES, partyContext, type PartyView } from '@/lib/trivia-party';
import type { WildcardId } from '@/lib/trivia-match';
import { difficultyLabel, sportFocusLabel } from '@/lib/trivia-settings';

const FLASH_NAMES = { riddle: 'RIDDLE ME THIS', teaser: 'BRAIN TEASER', fastest: 'FASTEST FINGER', lastorders: 'LAST ORDERS', duel: 'THE TWENTY' };
const CARDS: Array<{ id: WildcardId; name: string; hint: string }> = [
  { id: 'fiftyfifty', name: 'FIFTY-FIFTY', hint: 'Two wrong answers vanish for you.' },
  { id: 'doubledown', name: 'DOUBLE DOWN', hint: 'Double your next correct base point.' },
  { id: 'pickpocket', name: 'PICKPOCKET', hint: 'Choose a rival. Right vs wrong steals one existing point.' },
  { id: 'shakespeare', name: 'SHAKESPEARE', hint: 'Choose a rival. Their next round gets a disguise.' },
];
function usePartyClock(view: PartyView | null) {
  const key = view ? `${partyContext(view)}:${view.flash?.turn}:${view.flash?.picked.length}:${JSON.stringify(view.flash?.strikes)}` : '';
  const [left, setLeft] = useState(0);
  const remaining = view?.remainingMs;
  useEffect(() => {
    if (remaining === undefined) return;
    const end = performance.now() + remaining;
    const update = () => setLeft(Math.max(0, Math.ceil((end - performance.now()) / 1000)));
    update(); const tick = setInterval(update, 50); return () => clearInterval(tick);
  }, [key, remaining]);
  return left;
}
export default function TriviaPartyGame({ roomId, isHost }: { roomId: string; isHost: boolean }) {
  const { view, seatId, online, busy, status, error, stopped, relay, act, retry } = usePartyConnection(roomId, isHost);
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<number[] | null>(null);
  const [target, setTarget] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [pending, setPending] = useState<{ context: string; answer: string } | null>(null);
  const pendingRef = useRef<{ context: string; answer: string } | null>(null);
  const stage = useRef<HTMLElement | null>(null);
  const seconds = usePartyClock(view);
  const context = view ? partyContext(view) : '';
  const me = view?.seats.find(s => s.id === seatId);
  const chosenCategories = categories ?? me?.categories ?? [];
  const minePending = pending?.context === context ? pending.answer : null;
  const inQuestion = view?.phase === 'question' || view?.phase === 'flash';
  const transition = view ? `${view.gameId}:${view.phase}:${view.round}:${view.qIndex}` : '';
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    node.scrollTop = 0;
    node.querySelector('.trivia-party-play-area')?.scrollIntoView({ block: 'start' });
  }, [transition]);
  const invite = typeof window === 'undefined' ? '' : `${window.location.origin}/trivia-party?room=${roomId}`;
  const choose = (answer: string) => {
    if (!view || !inQuestion || view.locked.includes(seatId) || seconds <= 0 || pendingRef.current?.context === context) return;
    const pick = { context, answer }; pendingRef.current = pick; setPending(pick); act({ answer });
  };
  const ready = () => { if (!me) return; if (!me.ready) { if (name.trim()) act({ name }); if (view?.settings.focus === 'open') act({ categories: chosenCategories }); } act({ ready: !me.ready }); };
  const sorted = view ? [...view.seats].sort((a, b) => b.score - a.score) : [];
  const maxScore = sorted[0]?.score;
  const right = view?.result?.right[seatId];
  const outcome = view?.phase === 'reveal' || view?.phase === 'flashReveal' ? right ? ' is-answer-right' : ' is-answer-wrong' : '';
  const duel = view?.phase === 'flash' && view.flash?.type === 'duel';
  const myTurn = duel && view.seats[view.flash!.turn]?.id === seatId;
  const canUseCards = view?.phase === 'question' && !view.locked.includes(seatId) && !minePending && seconds > 0;
  return <main ref={stage} className={`trivia-brawl-page trivia-showtime trivia-party${inQuestion && seconds <= 5 && seconds > 0 ? ' is-time-low' : ''}${outcome}`}>
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB · UP TO FIVE PHONES</span><h1>Party Table</h1></div><Link href="/trivia-brawl">← Pub door</Link></header>
    <p className="trivia-party-status" role="status">{isHost && view && view.phase !== 'lobby' ? 'Host owns this table. Keep this screen open.' : status}</p>
    {error && <p className="trivia-brawl-error" role="alert">{error}</p>}
    {stopped && !isHost && <button className="trivia-brawl-primary" onClick={() => { pendingRef.current = null; setPending(null); retry(); }}>TRY YOUR SAVED SEAT AGAIN</button>}
    {relay === false && <p className="trivia-brawl-error">No relay is configured. Some mobile/WiFi combinations may not connect.</p>}
    {!view || !me ? <section className="trivia-brawl-question"><h2>Opening the party table...</h2><p>Keep the host&apos;s screen open. New players can join before the quiz starts.</p></section> : <>
      <section className="trivia-party-roster" aria-label="Party scoreboard"><header><b>{view.phase === 'lobby' ? `${view.seats.length} / 5 SEATS` : view.phase === 'finished' ? 'THE FINAL TAB' : `ROUND ${view.round + 1} / 5${view.phase === 'question' || view.phase === 'reveal' ? ` · Q ${view.qIndex + 1} / 5` : ''}`}</b><span>{sportFocusLabel(view.settings.focus)} · {difficultyLabel(view.settings.difficulty)}</span></header>
        {sorted.map((seat, index) => <div key={seat.id} className={seat.id === seatId ? 'is-me' : ''}><span>{view.phase !== 'lobby' ? `${index + 1}. ` : ''}{seat.name}{seat.id === 'host' ? ' · HOST' : ''}{seat.id === seatId ? ' · YOU' : ''}</span><b>{view.phase === 'lobby' ? seat.ready ? '✓ Ready' : '○ Not ready' : seat.score}</b><small>{online.includes(seat.id) ? view.locked.includes(seat.id) && inQuestion && !duel ? '✓ LOCKED' : 'CONNECTED' : 'AWAY · SAVED SEAT'}</small>{isHost && view.phase === 'lobby' && seat.id !== 'host' && !busy && <button className="trivia-party-remove" onClick={() => { if (window.confirm(`Remove ${seat.name}'s saved lobby seat?`)) act({ removeSeat: seat.id }); }}>REMOVE SEAT</button>}</div>)}
      </section>
      <ChesterTeleprompter text={view.phase === 'lobby' ? 'One table, up to five phones. Pick your names and categories, then ready up. Host, keep the pub open.' : view.phase === 'intro' ? 'The whole table is ready. Same questions, one bell. Wildcards are in your hand - save them for a moment worth stealing.' : view.phase === 'finished' ? `${sorted.filter(s => s.score === maxScore).map(s => s.name).join(' and ')} ${sorted.filter(s => s.score === maxScore).length > 1 ? 'share the win' : 'wins the tab'}. The pub raises a glass.` : view.result ? `${view.result.note} ${view.result.correctAnswer ? `The answer: ${view.result.correctAnswer}.` : ''}` : duel ? `${view.seats[view.flash!.turn]?.name}, your turn at The Twenty. Ten seconds. Three strikes and you sit this one out.` : view.event ? view.event : minePending || view.myAnswer ? 'Your choice is on the table. Waiting for the rest of the pub.' : view.phase === 'flash' ? 'Twenty seconds for the flash question. Cards rest here. First correct arrival matters in the race formats.' : 'Ten seconds on the main questions. Still got cards? Give the pub something to talk about.'} isThinking={busy} isMobile trivia />
      {view.phase === 'lobby' && <section className="trivia-brawl-draft">
        <h2>{isHost ? 'Open your party table' : 'Take your saved seat'}</h2>
        <p>Two to five players, host included. Every player uses their own phone. House categories only for this first party version.</p>
        {isHost && <><label className="trivia-party-invite">INVITE FRIENDS<input aria-label="Party invite link" readOnly value={invite} onFocus={e => e.currentTarget.select()} /></label><button className="trivia-brawl-primary" onClick={() => { void navigator.clipboard?.writeText(invite).then(() => setCopyStatus('Invite copied.')).catch(() => setCopyStatus('Select the invite link above to copy it.')); }}>COPY PARTY INVITE</button><p role="status">{copyStatus}</p></>}
        <TriviaSetupPanel settings={view.settings} onChange={settings => { setCategories([]); act({ settings }); }} readOnly={!isHost || busy || view.seats.some(s => s.ready)} brawlModes powerRounds={false} />
        <label className="trivia-party-invite">YOUR NAME<input aria-label="Your party name" value={name} onChange={e => setName(e.target.value)} placeholder={me.name} maxLength={20} disabled={me.ready || busy} /></label>
        {view.settings.focus === 'open' && <><h3>YOUR THREE CATEGORIES</h3><div className="trivia-brawl-categories">{LOCAL_CATEGORIES.map(c => <button key={c.id} disabled={me.ready || busy} aria-pressed={chosenCategories.includes(c.id)} onClick={() => setCategories(current => { const picks = current ?? me.categories; return picks.includes(c.id) ? picks.filter(id => id !== c.id) : picks.length < 3 ? [...picks, c.id] : picks; })}>{c.name}</button>)}</div><p>{chosenCategories.length} / 3 selected. Everyone&apos;s picks feed the shared quiz. Party mode has no power category.</p></>}
        <button className="trivia-brawl-primary" disabled={busy || !me.ready && view.settings.focus === 'open' && chosenCategories.length !== 3} onClick={ready}>{me.ready ? 'NOT READY · CHANGE MY PICKS' : 'READY FOR THE PARTY'}</button>
        {isHost && <button className="trivia-brawl-primary" disabled={busy || view.seats.length < 2 || view.seats.some(s => !s.ready || !online.includes(s.id))} onClick={() => act({ start: true })}>{busy ? 'CHESTER IS PREPARING THE WHOLE QUIZ...' : 'LOCK ROSTER · PREPARE QUIZ'}</button>}
        <p className="trivia-setup__note">The host must stay on this screen. Host refresh or closure loses this table. Guest reconnects keep their saved seats; clocks do not pause. Four guests can use more relay data than one; no paid upgrade is enabled here.</p>
      </section>}
      <details className="trivia-brawl-draft trivia-lobby-more"><summary>PARTY RULES · SCORING &amp; WILDCARDS</summary>{PARTY_RULES.map(rule => <p key={rule}>{rule}</p>)}</details>
      {view.phase === 'intro' && <section className="trivia-brawl-question"><h2>Roster locked. Same quiz for everyone.</h2><p>{view.settings.focus === 'open' ? 'Mixed quiz from every player\'s three house categories.' : `${sportFocusLabel(view.settings.focus)} main questions. Flash finales can use other topics.`} Five rounds of five, ten seconds each. Five group flash finales. Late arrivals cannot join; saved seats can rejoin.</p>{isHost ? <button className="trivia-brawl-primary" disabled={view.seats.some(s => !online.includes(s.id))} onClick={() => act({ start: true })}>START THE PARTY</button> : <p>Waiting for the host to start.</p>}</section>}
      {inQuestion && <section className="trivia-brawl-question trivia-party-play-area">
        <span>{view.phase === 'flash' && view.flash ? `⚡ FLASH FINALE · ${FLASH_NAMES[view.flash.type]}` : 'SHARED QUESTION'}</span>
        <h2>{duel ? view.flash?.board?.prompt : view.question?.question}</h2>
        <div className={`trivia-question-timer${seconds <= 5 ? ' is-low' : ''}`} role="timer" aria-label={`${seconds} seconds remaining`}><b>{seconds > 0 ? `${seconds}s` : "TIME'S UP · HOST SETTLING"}</b><div style={{ width: `${seconds / (view.phase === 'flash' && !duel ? 20 : 10) * 100}%` }} /><small>{duel ? 'Ten seconds per turn. A timeout is a strike.' : 'The host judges arrival before the bell. No extra time for reconnects.'}</small></div>
        {duel ? <><p className="trivia-flash-turn">{myTurn ? 'YOUR TURN · PICK ONE' : `${view.seats[view.flash!.turn]?.name} IS CHOOSING`}</p><div className="trivia-party-duel-roster">{view.seats.map(s => <p key={s.id}>{s.name}: {view.flash!.finds[s.id]?.length || 0} finds · {view.flash!.strikes[s.id] || 0}/3 strikes</p>)}</div><div className="trivia-duel-grid">{view.flash?.board?.options.map(option => <button key={option} disabled={!myTurn || seconds <= 0 || view.flash!.picked.includes(option)} className={view.flash!.picked.includes(option) ? Object.values(view.flash!.finds).some(picks => picks.includes(option)) ? 'is-correct' : 'is-strike' : ''} onClick={() => act({ pick: option })}>{option}{view.flash!.picked.includes(option) ? Object.values(view.flash!.finds).some(picks => picks.includes(option)) ? ' ✓ FOUND' : ' ✗ STRIKE' : ''}</button>)}</div></> : <><div className="trivia-brawl-answers">{view.question?.answers.map(option => <button key={option} disabled={seconds <= 0 || Boolean(minePending) || view.locked.includes(seatId) || !online.includes(seatId)} className={minePending === option || view.myAnswer === option ? 'is-selected' : ''} aria-pressed={minePending === option || view.myAnswer === option} onClick={() => choose(option)}>{option}{minePending === option || view.myAnswer === option ? ' ✓' : ''}</button>)}</div>{(minePending || view.myAnswer) && <p role="status">{view.myAnswer ? '✓ Answer locked by the host.' : 'Sending. Your choice is not yet host-confirmed.'}</p>}</>}
        {view.phase === 'question' && <section className="trivia-wildcard-deck"><header><span>CHANGE THE GAME</span><b>YOUR WILDCARDS</b></header><label className="trivia-party-target">NAMED RIVAL FOR PICKPOCKET / SHAKESPEARE<select aria-label="Wildcard target" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a rival</option>{view.seats.filter(s => s.id !== seatId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="trivia-wildcards">{CARDS.map(card => <button key={card.id} className="trivia-wildcard" disabled={!canUseCards || me.used[card.id] || (card.id === 'pickpocket' || card.id === 'shakespeare') && !target || card.id === 'shakespeare' && view.round === 4} onClick={() => act({ card: card.id, target })}><span><b>{card.name}</b><small>{me.used[card.id] ? 'USED THIS MATCH' : card.hint}</small></span></button>)}</div></section>}
      </section>}
      {(view.phase === 'reveal' || view.phase === 'flashReveal') && view.result && <section className="trivia-brawl-question"><h2>{view.phase === 'flashReveal' ? 'Flash settled' : 'The answer is in'}</h2><p>{view.result.correctAnswer}</p><div className="trivia-party-results">{view.seats.map(s => <div key={s.id} className={view.result!.right[s.id] ? 'is-right' : 'is-wrong'}><b>{s.name}</b><span>{view.result!.answers[s.id] || 'No answer'}</span><strong>{view.result!.points[s.id] > 0 ? '+' : ''}{view.result!.points[s.id]} POINTS</strong></div>)}</div>{isHost ? <button className="trivia-brawl-primary" onClick={() => act({ advance: true })}>{view.phase === 'flashReveal' ? view.round === 4 ? 'FINAL TAB' : 'ROUND SCORES' : view.qIndex === 4 ? '⚡ GROUP FLASH FINALE' : 'NEXT QUESTION'}</button> : <p>Waiting for the host.</p>}</section>}
      {view.phase === 'roundEnd' && <section className="trivia-brawl-question"><h2>Round {view.round + 1} poured.</h2><p>Scores are above. Same five-phone table, next round.</p>{isHost && <button className="trivia-brawl-primary" onClick={() => act({ advance: true })}>NEXT ROUND</button>}</section>}
      {view.phase === 'finished' && <section className="trivia-brawl-question"><h2>{sorted.filter(s => s.score === maxScore).map(s => s.name).join(' & ')} {sorted.filter(s => s.score === maxScore).length > 1 ? 'share the win' : 'wins'}</h2><p>Final scores are above. The same seats can ready up for a fresh quiz.</p>{isHost && <button className="trivia-brawl-primary" onClick={() => { pendingRef.current = null; setPending(null); setCategories([]); act({ rematch: true }); }}>REMATCH · SAME TABLE</button>}</section>}
    </>}
  </main>;
}
