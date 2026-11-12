'use client';
import { useEffect, useState } from 'react';
import { ChesterTeleprompter } from '@/components/ChesterUI';
import { readRoadLevel, readTownActivity, WELCOME_KEY } from '@/lib/town-activity';
import styles from './GoodTogetherHub.module.css';

type WelcomeState = { returning: boolean; recap: string; road: number | null; advanced: boolean };
export default function TownWelcome({ town, overview, onStart }: { town?: string; overview?: string; onStart: () => void }) {
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
  const lines = [
    state.returning ? `Welcome back. ${state.recap}` : "Welcome to Game Town. I'm Chester, your host and partner in crime. A game, a film, a little friendly competition. No homework. Let's get you started.",
    town && overview ? `${town}: ${overview}` : 'Quiz Town tests your knowledge and grammar. Chess Town is for playing and learning. Movie Town finds your next film. Puzzle Town brings the brain-teasers.',
    town ? `${town} is picked. Tap Enter below, then choose your mode. Solo, one phone or an invite: the next page tells you what you need.` : 'Start with Pick a town tonight above. I will introduce it, then Enter lights up. Choose a mode and you are off.',
  ];
  return <div className={styles.hostWelcome}>
    <div className={styles.hostTabs} role="group" aria-label="Chester welcome pages">
      {[state.returning ? 'Your last visit' : 'Welcome', town ? 'This town' : 'Town guide', 'Get started'].map((label, i) => <button key={i} aria-pressed={page === i} onClick={() => setPage(i)}>{label}</button>)}
    </div>
    <div className={styles.hostPrompter} aria-live="polite"><ChesterTeleprompter text={lines[page]} isThinking={false} isMobile trivia /></div>
    <div className={styles.hostBottom}><small>Recaps stay in this browser. Other devices and film/puzzle results are not synced.</small><button onClick={() => { if (page < 2) setPage(page + 1); else onStart(); }}>{page < 2 ? 'Next' : 'Pick a town'} <span aria-hidden="true">→</span></button></div>
  </div>;
}
