"use client";
import { versionLink } from '@/lib/version-link';


import Link from 'next/link';
import { QuizResultPages } from './QuizResultPages';
import {QuizGamePanel,QuizWildcardPicker} from '@/components/QuizPopup';
import { QuizChoicePages } from '@/components/QuizChoicePages';
import { QuizMaster, QuizCountdown } from './QuizMaster';
import { useEffect, useRef, useState } from 'react';
import { TriviaSetupPanel } from './TriviaSetupPanel';
import { ChesterTeleprompter } from './TriviaChesterUI';
import {useDurableParty} from '@/lib/use-durable-party';
import { usePartyConnection } from '@/lib/use-trivia-party';
import { LOCAL_CATEGORIES } from '@/lib/trivia-local';
import { PARTY_RULES, partyContext, type PartyView } from '@/lib/trivia-party';
import type { WildcardId } from '@/lib/trivia-match';
import { difficultyLabel, sportFocusLabel,type TriviaSettings } from '@/lib/trivia-settings';

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
export default function TriviaPartyGame(props:{roomId:string;isHost:boolean;durable?:boolean;creating?:boolean}){return props.durable?<DurableParty {...props}/>:<LegacyParty {...props}/>;}
function DurableParty({roomId,isHost,creating=false}:{roomId:string;isHost:boolean;creating?:boolean}){const connection=useDurableParty(roomId,isHost,creating);return <PartyScreen roomId={roomId} isHost={isHost} connection={connection} expiry={connection.expiry}/>;}
function LegacyParty({roomId,isHost}:{roomId:string;isHost:boolean}){const connection=usePartyConnection(roomId,isHost);return <PartyScreen roomId={roomId} isHost={isHost} connection={connection}/>;}
function PartyScreen({roomId,isHost,connection,expiry=''}:{roomId:string;isHost:boolean;connection:ReturnType<typeof usePartyConnection>;expiry?:string}){
  const {view,seatId,online,busy,status,error,stopped,relay,act,retry}=connection;
  const [name, setName] = useState('');
  const [lobbyStep,setLobbyStep]=useState<'invite'|'picks'|'players'|'setup'>('invite'),[lobbyPage,setLobbyPage]=useState(0),[rosterPage,setRosterPage]=useState(0);
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
    // Do not scroll an ancestor or the page behind the shared navigation.
  }, [transition]);
  const invite = typeof window === 'undefined' ? '' : versionLink(`${window.location.origin}/trivia-party?room=${roomId}${expiry?'&durable=1':''}`);
  const choose = (answer: string) => {
    if (!view || !inQuestion || view.locked.includes(seatId) || seconds <= 0 || pendingRef.current?.context === context) return;
    const pick = { context, answer }; pendingRef.current = pick; setPending(pick); act({ answer });
  };
  const ready = () => { if (!me) return; if(expiry){act(me.ready?{ready:false}:{...(name.trim()?{name}:{}),...(view?.settings.focus==='open'?{categories:chosenCategories}:{}),ready:true});return;} if (!me.ready) { if (name.trim()) act({ name }); if (view?.settings.focus === 'open') act({ categories: chosenCategories }); } act({ ready: !me.ready }); };
  const sorted = view ? [...view.seats].sort((a, b) => b.score - a.score) : [];
  const maxScore = sorted[0]?.score;
  const right = view?.result?.right[seatId];
  const outcome = view?.phase === 'reveal' || view?.phase === 'flashReveal' ? right ? ' is-answer-right' : ' is-answer-wrong' : '';
  const duel = view?.phase === 'flash' && view.flash?.type === 'duel';
  const myTurn = duel && view.seats[view.flash!.turn]?.id === seatId;
  const canUseCards = view?.phase === 'question' && !view.locked.includes(seatId) && !minePending && seconds > 0;
  if(expiry&&view?.phase==='lobby'&&me)return <main className="trivia-party-saved-lobby">
   <header><h1>Party Table</h1><Link href="/trivia-party">Pub door</Link></header>
   <p role="status">{status}</p><p className="party-expiry">Invite until {new Date(expiry).toLocaleDateString('en-GB')}. Host returns in this browser.</p>
   <nav aria-label="Party setup"><button aria-pressed={lobbyStep==='invite'} onClick={()=>setLobbyStep('invite')}>Invite</button><button aria-pressed={lobbyStep==='picks'} onClick={()=>setLobbyStep('picks')}>My picks</button><button aria-pressed={lobbyStep==='players'} onClick={()=>setLobbyStep('players')}>{view.seats.length}/5 players</button>{isHost&&<button aria-pressed={lobbyStep==='setup'} onClick={()=>setLobbyStep('setup')}>Setup</button>}</nav>
   <section>
    {lobbyStep==='invite'?<><h2>{isHost?'Your saved party':'Your saved seat'}</h2><p>{sportFocusLabel(view.settings.focus)} · {difficultyLabel(view.settings.difficulty)}. Everyone taps Ready, then host prepares.</p><label>Your name<input aria-label="Your party name" value={name} onChange={e=>setName(e.target.value)} placeholder={me.name} maxLength={20} disabled={me.ready||busy}/></label>{isHost&&<><input aria-label="Party invite link" readOnly value={invite} onFocus={e=>e.target.select()}/><button onClick={()=>void navigator.clipboard?.writeText(invite).then(()=>setCopyStatus('Copied. Send this link to up to four friends.')).catch(()=>setCopyStatus('Select and copy the link above.'))}>COPY PARTY INVITE</button><p role="status">{copyStatus}</p></>}<p>{me.ready?'You are ready.':view.settings.focus==='open'?chosenCategories.length+' / 3 categories chosen. Use My picks.':'Single topic fixed for everyone.'}</p></>:
    lobbyStep==='picks'?<><h2>Your three categories</h2>{view.settings.focus==='open'?<><p>{chosenCategories.length} / 3 chosen. No power rounds.</p><div className="party-pick-grid">{LOCAL_CATEGORIES.slice(lobbyPage*4,lobbyPage*4+4).map(c=><button key={c.id} disabled={me.ready||busy} aria-pressed={chosenCategories.includes(c.id)} onClick={()=>setCategories(current=>{const picks=current??me.categories;return picks.includes(c.id)?picks.filter(id=>id!==c.id):picks.length<3?[...picks,c.id]:picks;})}>{c.name}</button>)}</div><nav><button disabled={lobbyPage===0} onClick={()=>setLobbyPage(p=>p-1)}>Previous</button><span>{lobbyPage+1}/{Math.ceil(LOCAL_CATEGORIES.length/4)}</span><button disabled={(lobbyPage+1)*4>=LOCAL_CATEGORIES.length} onClick={()=>setLobbyPage(p=>p+1)}>More categories</button></nav></>:<p>All main questions use {sportFocusLabel(view.settings.focus)}. No category picks needed.</p>}</>:
    lobbyStep==='players'?<><h2>Saved players</h2>{view.seats.slice(Math.min(rosterPage,Math.floor((view.seats.length-1)/2))*2,Math.min(rosterPage,Math.floor((view.seats.length-1)/2))*2+2).map(s=><div className="party-saved-player" key={s.id}><b>{s.name}{s.id==='host'?' · HOST':''}</b><span>{s.ready?'Ready':'Not ready'} · {online.includes(s.id)?'Connected':'Away'}</span>{isHost&&s.id!=='host'&&<button disabled={busy} onClick={()=>{if(confirm('Remove '+s.name+' from this party?'))act({removeSeat:s.id});}}>REMOVE SEAT</button>}</div>)}{view.seats.length>2&&<nav><button disabled={rosterPage===0} onClick={()=>setRosterPage(p=>p-1)}>Previous</button><span>{rosterPage+1}/{Math.ceil(view.seats.length/2)}</span><button disabled={(rosterPage+1)*2>=view.seats.length} onClick={()=>setRosterPage(p=>p+1)}>More players</button></nav>}</>:
    <><h2>Quiz setup</h2><label>Topic<select aria-label="Party topic" value={view.settings.focus} disabled={busy||view.seats.some(s=>s.ready)} onChange={e=>{setCategories([]);act({settings:{...view.settings,focus:e.target.value as TriviaSettings['focus']}});}}>{[['open','Mixed house categories'],['grammar','Grammar'],['nba','NBA'],['nfl','NFL'],['premier-league','Premier League']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Difficulty<select aria-label="Party difficulty" value={view.settings.difficulty} disabled={busy||view.seats.some(s=>s.ready)} onChange={e=>act({settings:{...view.settings,difficulty:e.target.value as TriviaSettings['difficulty']}})}>{['classic','easy','medium','hard','master'].map(id=><option key={id}>{id}</option>)}</select></label><p>Five rounds of five, plus five group flashes. Everyone gets the same questions. Two to five phones.</p></>}
   </section>
   {error&&<p role="alert">{error}</p>}
   <button className="party-primary" disabled={busy||!online.includes('host')||!me.ready&&view.settings.focus==='open'&&chosenCategories.length!==3} onClick={ready}>{me.ready?'NOT READY · EDIT MY PICKS':'READY FOR THE PARTY'}</button>
   {isHost&&<button className="party-primary" disabled={busy||view.seats.length<2||view.seats.some(s=>!s.ready||!online.includes(s.id))} onClick={()=>act({start:true})}>{busy?'PREPARING QUIZ...':'LOCK ROSTER · PREPARE QUIZ'}</button>}
  </main>;
  return <main ref={stage} className={`trivia-brawl-page trivia-showtime trivia-party${view && view.phase !== 'lobby' ? ' trivia-party-active' : ''}${inQuestion && seconds <= 5 && seconds > 0 ? ' is-time-low' : ''}${outcome}`}>
    <header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB · UP TO FIVE PHONES</span><h1>Party Table</h1></div><Link href="/trivia-brawl">← Pub door</Link></header>
    <p className="trivia-party-status" role="status">{expiry?'Invite saved until '+new Date(expiry).toLocaleDateString('en-GB')+'. '+status:isHost && view && view.phase !== 'lobby' ? 'Host owns this table. Keep this screen open.' : status}</p>
    {error && <p className="trivia-brawl-error" role="alert">{error}</p>}
    {stopped && !isHost && <button className="trivia-brawl-primary" onClick={() => { pendingRef.current = null; setPending(null); retry(); }}>TRY YOUR SAVED SEAT AGAIN</button>}
    {relay === false && <p className="trivia-brawl-error">No relay is configured. Some mobile/WiFi combinations may not connect.</p>}
    {!view || !me ? <section className="trivia-brawl-question"><h2>{expiry?'Your place is saved':'Opening the party table...'}</h2><p>{expiry?'The host may be away. Reopen this same link to return. Host recovery needs the original browser.':'Keep the host screen open. New players join before the quiz starts.'}</p></section> : <>
      <section className="trivia-party-roster" aria-label="Party scoreboard"><header><b>{view.phase === 'lobby' ? `${view.seats.length} / 5 SEATS` : view.phase === 'finished' ? 'THE FINAL TAB' : `ROUND ${view.round + 1} / 5${view.phase === 'question' || view.phase === 'reveal' ? ` · Q ${view.qIndex + 1} / 5` : ''}`}</b><span>{sportFocusLabel(view.settings.focus)} · {difficultyLabel(view.settings.difficulty)}</span></header>
        {sorted.map((seat, index) => <div key={seat.id} className={seat.id === seatId ? 'is-me' : ''}><span>{seat.name}{view.phase === 'lobby' ? `${seat.id === 'host' ? ' · HOST' : ''}${seat.id === seatId ? ' · YOU' : ''}` : ''}</span><b>{view.phase === 'lobby' ? seat.ready ? '✓ Ready' : '○ Not ready' : seat.score}</b><small>{online.includes(seat.id) ? view.locked.includes(seat.id) && inQuestion && !duel ? '✓ LOCKED' : 'CONNECTED' : 'AWAY · SAVED SEAT'}</small>{isHost && view.phase === 'lobby' && seat.id !== 'host' && !busy && <button className="trivia-party-remove" onClick={() => { if (window.confirm(`Remove ${seat.name}'s saved lobby seat?`)) act({ removeSeat: seat.id }); }}>REMOVE SEAT</button>}</div>)}
      </section>
      <ChesterTeleprompter text={view.phase === 'lobby' ? 'One table, up to five phones. Pick your names and categories, then ready up. Play together when everyone is online.' : view.phase === 'intro' ? 'The whole table is ready. Same questions, one bell. Wildcards are in your hand - save them for a moment worth stealing.' : view.phase === 'finished' ? `${sorted.filter(s => s.score === maxScore).map(s => s.name).join(' and ')} ${sorted.filter(s => s.score === maxScore).length > 1 ? 'share the win' : 'wins the tab'}. The pub raises a glass.` : view.result ? `${view.result.note} ${view.result.correctAnswer ? `The answer: ${view.result.correctAnswer}.` : ''}` : duel ? `${view.seats[view.flash!.turn]?.name}, your turn at The Twenty. Ten seconds. Three strikes and you sit this one out.` : view.event ? view.event : minePending || view.myAnswer ? 'Your choice is on the table. Waiting for the rest of the pub.' : view.phase === 'flash' ? 'Twenty seconds for the flash question. Cards rest here. First correct arrival matters in the race formats.' : `${view.question?.category === 'Grammar' ? 'Fifteen' : 'Ten'} seconds on the main questions. Still got cards? Give the pub something to talk about.`} isThinking={busy} isMobile trivia />
      {view.phase === 'lobby' && <section className="trivia-brawl-draft">
        <h2>{isHost ? 'Open your party table' : 'Take your saved seat'}</h2>
        <p>Two to five players, host included. Every player uses their own phone. House categories only for this first party version.</p>
        {isHost && <><label className="trivia-party-invite">INVITE FRIENDS<input aria-label="Party invite link" readOnly value={invite} onFocus={e => e.currentTarget.select()} /></label><button className="trivia-brawl-primary" onClick={() => { void navigator.clipboard?.writeText(invite).then(() => setCopyStatus('Invite copied.')).catch(() => setCopyStatus('Select the invite link above to copy it.')); }}>COPY PARTY INVITE</button><p role="status">{copyStatus}</p></>}
        <TriviaSetupPanel settings={view.settings} onChange={settings => { setCategories([]); act({ settings }); }} readOnly={!isHost || busy || view.seats.some(s => s.ready)} brawlModes powerRounds={false} />
        <label className="trivia-party-invite">YOUR NAME<input aria-label="Your party name" value={name} onChange={e => setName(e.target.value)} placeholder={me.name} maxLength={20} disabled={me.ready || busy} /></label>
        {view.settings.focus === 'open' && <><h3>YOUR THREE CATEGORIES</h3><div className="trivia-brawl-categories">{LOCAL_CATEGORIES.map(c => <button key={c.id} disabled={me.ready || busy} aria-pressed={chosenCategories.includes(c.id)} onClick={() => setCategories(current => { const picks = current ?? me.categories; return picks.includes(c.id) ? picks.filter(id => id !== c.id) : picks.length < 3 ? [...picks, c.id] : picks; })}>{c.name}</button>)}</div><p>{chosenCategories.length} / 3 selected. Everyone&apos;s picks feed the shared quiz. Party mode has no power category.</p></>}
        <button className="trivia-brawl-primary" disabled={busy || !me.ready && view.settings.focus === 'open' && chosenCategories.length !== 3} onClick={ready}>{me.ready ? 'NOT READY · CHANGE MY PICKS' : 'READY FOR THE PARTY'}</button>
        {isHost && <button className="trivia-brawl-primary" disabled={busy || view.seats.length < 2 || view.seats.some(s => !s.ready || !online.includes(s.id))} onClick={() => act({ start: true })}>{busy ? 'CHESTER IS PREPARING THE WHOLE QUIZ...' : 'LOCK ROSTER · PREPARE QUIZ'}</button>}
        <p className="trivia-setup__note">{expiry?'This invite lasts seven days. The host can close the tab and return in this browser. Saved guests return using the same link. Active clocks keep their original deadlines.':'Keep the host screen open. This tab has a24-hour checkpoint, not cloud backup.'}</p>
      </section>}
      {(!view || view.phase === 'lobby') && <details className="trivia-brawl-draft trivia-lobby-more"><summary>PARTY RULES · SCORING &amp; WILDCARDS</summary>{PARTY_RULES.map(rule=>expiry?rule.replace('Host must keep the table open.','Host may leave and return in this browser. Live clocks keep running while away.'):rule).map(rule => <p key={rule}>{rule}</p>)}</details>}
      {view.phase === 'intro' && <section className="trivia-brawl-question"><h2>Roster locked. Same quiz for everyone.</h2><p>{view.settings.focus === 'open' ? 'Mixed quiz from every player\'s three house categories.' : `${sportFocusLabel(view.settings.focus)} main questions. Flash finales can use other topics.`} Five rounds of five, {view.settings.focus === 'grammar' ? 'fifteen' : 'ten'} seconds per main question. Five group flash finales. Late arrivals cannot join; saved seats can rejoin.</p>{isHost ? <button className="trivia-brawl-primary" disabled={view.seats.some(s => !online.includes(s.id))} onClick={() => act({ start: true })}>START THE PARTY</button> : <p>Waiting for the host to start.</p>}</section>}
      {inQuestion && <QuizGamePanel popup={view.phase==='flash'} title="FLASH FINALE · PARTY TABLE" score={sorted.map(s=>s.name+' '+s.score).join(' · ')} className="trivia-brawl-question trivia-party-play-area">
        <span>{view.phase === 'flash' && view.flash ? `⚡ FLASH FINALE · ${FLASH_NAMES[view.flash.type]}` : 'SHARED QUESTION'}</span>
        <QuizMaster question={(duel ? view.flash?.board?.prompt : view.question?.question) || ''} />
        
        {duel ? <><p className="trivia-flash-turn">{myTurn ? 'YOUR TURN · PICK ONE' : `${view.seats[view.flash!.turn]?.name} IS CHOOSING`}</p><div className="trivia-party-duel-roster">{view.seats.map(s => <p key={s.id}>{s.name}: {view.flash!.finds[s.id]?.length || 0} finds · {view.flash!.strikes[s.id] || 0}/3 strikes</p>)}</div><QuizChoicePages>{view.flash?.board?.options.map(option => <button key={option} disabled={!myTurn || seconds <= 0 || view.flash!.picked.includes(option)} className={view.flash!.picked.includes(option) ? Object.values(view.flash!.finds).some(picks => picks.includes(option)) ? 'is-correct' : 'is-strike' : ''} onClick={() => act({ pick: option })}>{option}{view.flash!.picked.includes(option) ? Object.values(view.flash!.finds).some(picks => picks.includes(option)) ? ' ✓ FOUND' : ' ✗ STRIKE' : ''}</button>)}</QuizChoicePages></> : <><div className="trivia-brawl-answers">{view.question?.answers.map(option => <button key={option} disabled={seconds <= 0 || Boolean(minePending) || view.locked.includes(seatId) || !online.includes(seatId)} className={minePending === option || view.myAnswer === option ? 'is-selected' : ''} aria-pressed={minePending === option || view.myAnswer === option} onClick={() => choose(option)}>{option}{minePending === option || view.myAnswer === option ? ' ✓' : ''}</button>)}</div>{(minePending || view.myAnswer) && <p role="status">{view.myAnswer ? '✓ Answer locked by the host.' : 'Sending. Your choice is not yet host-confirmed.'}</p>}</>}
        <QuizCountdown seconds={seconds} duration={view.phase === 'flash' && !duel ? 20 : view.phase === 'question' && view.question?.category === 'Grammar' ? 15 : 10} />
        {view.phase === 'question' && <QuizWildcardPicker><section className="trivia-wildcard-deck"><header><span>CHANGE THE GAME</span><b>YOUR WILDCARDS</b></header><label className="trivia-party-target">NAMED RIVAL FOR PICKPOCKET / SHAKESPEARE<select aria-label="Wildcard target" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a rival</option>{view.seats.filter(s => s.id !== seatId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="trivia-wildcards">{CARDS.map(card => <button key={card.id} className="trivia-wildcard" disabled={!canUseCards || me.used[card.id] || (card.id === 'pickpocket' || card.id === 'shakespeare') && !target || card.id === 'shakespeare' && view.round === 4} onClick={(event) => { act({ card: card.id, target }); event.currentTarget.closest('details')?.removeAttribute('open'); }}><span><b>{card.name}</b><small>{me.used[card.id] ? 'USED THIS MATCH' : card.hint}</small></span></button>)}</div></section></QuizWildcardPicker>}
      </QuizGamePanel>}
      {(view.phase === 'reveal' || view.phase === 'flashReveal') && view.result && <section className="trivia-brawl-question"><h2>{view.phase === 'flashReveal' ? 'Flash settled' : 'The answer is in'}</h2><p>{view.result.correctAnswer}</p><QuizResultPages resetKey={transition}>{view.seats.map(s => <div key={s.id} className={view.result!.right[s.id] ? 'is-right' : 'is-wrong'}><b>{view.result!.right[s.id] ? '✓ ' : '✕ '}{s.name}</b><span>{view.result!.answers[s.id] || 'No answer'}</span><strong>{view.result!.points[s.id] > 0 ? '+' : ''}{view.result!.points[s.id]} POINTS</strong></div>)}</QuizResultPages>{isHost ? <button className="trivia-brawl-primary" onClick={() => act({ advance: true })}>{view.phase === 'flashReveal' ? view.round === 4 ? 'FINAL TAB' : 'ROUND SCORES' : view.qIndex === 4 ? '⚡ GROUP FLASH FINALE' : 'NEXT QUESTION'}</button> : <p>Waiting for the host.</p>}</section>}
      {view.phase === 'roundEnd' && <section className="trivia-brawl-question"><h2>Round {view.round + 1} poured.</h2><p>Scores are above. Same five-phone table, next round.</p>{isHost && <button className="trivia-brawl-primary" onClick={() => act({ advance: true })}>NEXT ROUND</button>}</section>}
      {view.phase === 'finished' && <section className="trivia-brawl-question"><h2>{sorted.filter(s => s.score === maxScore).map(s => s.name).join(' & ')} {sorted.filter(s => s.score === maxScore).length > 1 ? 'share the win' : 'wins'}</h2><p>Final scores are above. The same seats can ready up for a fresh quiz.</p>{isHost && <button className="trivia-brawl-primary" onClick={() => { pendingRef.current = null; setPending(null); setCategories([]); act({ rematch: true }); }}>REMATCH · SAME TABLE</button>}</section>}
    </>}
  </main>;
}
