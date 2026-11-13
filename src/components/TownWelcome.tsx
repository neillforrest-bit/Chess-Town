'use client';
import { useEffect, useState } from 'react';
import { readRoadLevel, readTownActivity, WELCOME_KEY } from '@/lib/town-activity';
import styles from './GoodTogetherHub.module.css';
import ChesterCompanion from './ChesterCompanion';

type WelcomeState = { returning: boolean; recap: string; road: number | null; advanced: boolean };
export default function TownWelcome({ town, overview, onStart, paused = false }: { town?: string; overview?: string; onStart: () => void; paused?: boolean }) {
  const [page, setPage] = useState(0);
  useEffect(() => { if (town) setPage(1); }, [town]);
  const [state, setState] = useState<WelcomeState>({ returning: false, recap: '', road: null, advanced: false });
  useEffect(() => {
    let previous: { road?: number | null } | null = null;
    try { previous = JSON.parse(localStorage.getItem(WELCOME_KEY) || 'null'); } catch { /* first visit */ }
    const a = readTownActivity(); const road = readRoadLevel();
    const advanced = previous?.road != null && road != null && road > previous.road;
    const recorded = a ? `Last ${a.kind === 'finished' ? 'finished' : 'opened'}: ${a.label}${a.result ? `. ${a.result}` : '.'}` : 'No game session recorded on this site yet. Pick a town and let us change that.';
    const progress = road ? `${advanced ? `New level! You have moved from ${previous!.road} to ${road}` : `Your saved Road to the Landlord level is ${road}`} of 15. ${road === 15 ? 'The Landlord is next, unless you have already beaten him.' : 'Ready for the next table?'}` : '';
    setState({ returning: Boolean(previous || a || road), recap: [recorded, progress].filter(Boolean).join(' '), road, advanced });
    try { localStorage.setItem(WELCOME_KEY, JSON.stringify({ road: road ?? 1, at: Date.now() })); } catch { /* still show the welcome without storage */ }
  }, []);
  const guides = {
    'Checkers Town':'Checkers Town: take on Chester, invite a friend to a live board or climb the checkers road. Forced jumps and kings keep every turn interesting.',
    'Quiz Town': 'Quiz Town: five rounds against me, Trivia Brawl with a friend, Grammar, or Party Table for the whole gang. Pass & Play shares one phone. Last Call keeps the points coming. Climb 15 levels on the Road to the Landlord. Knowledge or grammar: bragging rights await.',
    'Chess Town': 'Chess Town: play me with coaching, face a friend in Local Chess Duel, or take Expert Chester on as The Underdog with a little house help. Lessons, Surprise Lab and game reviews sharpen your skills. The Daily Challenge is your two-move brain workout.',
    'Movie Town': 'Movie Town: start with Find Our Film to choose together. Switch the mode picker inside Movie Town for the original Movie Night, Tonight or Discovery Night. Orson hosts the films.',
    'Puzzle Town': 'Puzzle Town: logic and riddles for that satisfying aha. Play me solo, pass one phone, battle a friend, or climb the Road to the Riddlemaster. Read twice. The obvious answer might be the trap.',
  };
  const guidePages = town ? [guides[town as keyof typeof guides] || overview || 'Pick a mode inside your town.'] : Object.values(guides);
  const lines = [
    state.returning ? `Welcome back. ${state.recap}` : "Welcome to Game Town. I'm Chester, your host and partner in crime. Beat me, challenge a friend, bring the table or finally agree on a film with your partner. Tap Next for the tour. Your evening beats another doom scroll.",
    ...guidePages,
    town ? `${town} is picked. Tap Enter below, then choose your mode. Solo, one phone or an invite: the next page tells you what you need.` : 'Pick a town above. I will introduce it, then Enter lights up. Movie Night starts with a room link for your partner, not a bot. Pick your kind of fun and let us get you playing.',
  ];
  const last = lines.length - 1;
  const activePage = Math.min(page, last);
  return <div className={styles.hostWelcome}>
    <div className={styles.hostTabs} role="group" aria-label="Chester welcome pages">
      {[{ label: state.returning ? 'Your last visit' : 'Welcome', index: 0 }, { label: town ? 'This town' : 'Town guide', index: 1 }, { label: 'Get started', index: last }].map(({ label, index }) => <button key={label} aria-pressed={index === 1 ? activePage > 0 && activePage < last : activePage === index} onClick={() => setPage(index)}>{label}</button>)}
    </div>
    <div className={styles.hostPrompter} aria-live="polite"><div className="chester-teleprompter" style={{display:"flex",alignItems:"flex-start"}}><div className={styles.hostDonkey}><ChesterCompanion paused={paused}/></div><div className="chester-teleprompter__message" style={{color:"#fff"}}>{lines[activePage]}</div></div></div>
    <div className={styles.hostBottom}><small>{activePage > 0 && activePage < last ? `${town || ['Checkers Town','Quiz Town', 'Chess Town', 'Movie Town', 'Puzzle Town'][activePage - 1]} · ${activePage} of ${guidePages.length}` : 'Recaps stay in this browser. Film/puzzle results are not synced.'}</small><button onClick={() => { if (activePage < last) setPage(activePage + 1); else onStart(); }}>{activePage < last ? 'Next' : 'Pick a town'} <span aria-hidden="true">→</span></button></div>
  </div>;
}
