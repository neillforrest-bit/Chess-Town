'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GAME_OPTIONS } from '@/lib/game-options';
import styles from './GoodTogetherHub.module.css';

const worlds = {
  trivia: { label: "Chester's Pub · Trivia", name: "Chester's Pub", type: 'Pub trivia', description: "A pub quiz with me on the mic. Bring your partner, gather the table, or play solo. I'll keep the score. You bring the excuses.", hint: 'Solo, two-phone battle, pass & play or Party Table.', enter: 'Enter the pub' },
  chess: { label: 'Chess Town · Chess', name: 'Chess Town', type: 'Chess', description: 'Make your move in Chess Town. Play Chester, share a local battle, or learn the ropes. A quiet board. A cheeky host.', hint: 'Play Chester, local battle or learning mode.', enter: 'Enter Chess Town' },
  movie: { label: 'Plot Night · Movies', name: 'Plot Night', type: 'Movies', description: 'The only plot twist tonight should be the film. Find something to watch together, explore a new pick, or jump into Movie Time.', hint: 'Opens the existing movie preview, with Orson as its host.', enter: 'Enter Plot Night' },
  logic: { label: 'Brain Parlour · Logic', name: 'Brain Parlour', type: 'Logic & riddles', description: 'Take a seat and give your brain something to brag about. Logic puzzles, riddles and a friend to puzzle it out with.', hint: 'Existing Logic & Riddles preview. Chester hosts your table.', enter: 'Enter Brain Parlour' },
};
type World = keyof typeof worlds;
const movieModes = [
  { id: 'tonight', title: 'Tonight · find a film', description: 'Tell Orson your taste and find something to watch.', href: 'https://chess-town-git-movie-night-neillo.vercel.app/tonight', action: 'Find a film' },
  { id: 'discover', title: 'Discovery Night', description: 'Explore films you might not have thought to look for.', href: 'https://chess-town-git-movie-night-neillo.vercel.app/discover', action: 'Explore films' },
  { id: 'movie-night', title: 'Movie night · together', description: 'Open the existing movie-picking game and choose your night.', href: 'https://chess-town-git-movie-night-neillo.vercel.app/', action: 'Open Movie Time' },
];
const logicModes = [
  { id: 'logic', title: 'Choose your table', description: 'Solo with Chester, pass & play or a friend battle. Choose inside the existing preview.', href: 'https://chess-town-git-instinct-brendo-gothic-neillo.vercel.app/logic-brawl', action: 'Choose your table' },
  { id: 'logic-road', title: 'The Road · logic & riddles', description: 'Fifteen rising tables. Progress stays on this device.', href: 'https://chess-town-git-instinct-brendo-gothic-neillo.vercel.app/road/logic', action: 'Open the road' },
];

export default function GamesHub() {
  const [world, setWorld] = useState<World>('trivia');
  const [inside, setInside] = useState(false);
  const modes = world === 'movie' ? movieModes : world === 'logic' ? logicModes : GAME_OPTIONS.filter(mode => mode.family === world);
  const [modeId, setModeId] = useState('solo');
  const selected = modes.find(mode => mode.id === modeId) || modes[0];
  const game = worlds[world];
  useEffect(() => {
    const back = () => { setInside(new URLSearchParams(window.location.search).get('choose') === 'mode'); };
    back(); window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  const enter = () => { setInside(true); history.pushState({}, '', `${location.pathname}?choose=mode`); };
  const leave = () => { setInside(false); history.replaceState({}, '', location.pathname); };
  return <main className={`${styles.hub} ${inside ? styles.inside : ''} good-together-hub`} aria-labelledby="gt-title">
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Good Together home" onClick={leave}>
        {/* Original vector artwork recovered from the approved preview study. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/good-together/umbrella.svg" alt="" width="40" height="40" />
        <span>good<i>together</i></span>
      </Link><span className={styles.preview}>Preview</span>
    </header>
    <section className={styles.welcome}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/good-together/chester.svg" alt="Chester, your host" width="112" height="112" />
      <div><span className={styles.eyebrow}>Chester, your host</span><h1 id="gt-title">{inside ? game.name : <>Make time<br />for a good time.</>}</h1></div>
    </section>
    {!inside && <p className={styles.tagline}>A game. A film. A little time together.</p>}
    {!inside ? <>
      <div className={styles.field}><label htmlFor="gt-game">What are we playing?</label><select id="gt-game" value={world} onChange={event => { const next = event.target.value as World; setWorld(next); setModeId(next === 'trivia' ? 'solo' : next === 'chess' ? 'chester' : next === 'movie' ? 'tonight' : 'logic'); }}>
        {Object.entries(worlds).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
      </select></div>
      <section className={styles.intro} aria-live="polite"><span className={styles.eyebrow}>{game.type}</span><h2>{game.name}</h2><p>{game.description}</p><small>{game.hint}</small></section>
      <button className={styles.cta} onClick={enter}>{game.enter}<span aria-hidden="true">→</span></button>
    </> : <>
      <div className={styles.field}><label htmlFor="gt-mode">How would you like to play?</label><select id="gt-mode" value={selected.id} onChange={event => setModeId(event.target.value)}>{modes.map(mode => <option value={mode.id} key={mode.id}>{mode.title}</option>)}</select></div>
      <section className={styles.intro} aria-live="polite"><span className={styles.eyebrow}>{game.type}</span><h2>{selected.title}</h2><p>{selected.description}</p><small>{world === 'movie' || world === 'logic' ? 'Separate preview. Opens in this tab with its existing look and rules.' : 'Your game opens next, with its existing look and rules.'}</small></section>
      <a className={styles.cta} href={selected.href} data-launch={selected.id}>{selected.action}<span aria-hidden="true">→</span></a>
      <button className={styles.back} onClick={leave}>← Back to all games</button>
    </>}
    <footer className={styles.footer}>{inside ? 'Good Together · hosted by Chester' : 'Choose a game. Read about it. Then Enter.'}</footer>
  </main>;
}
