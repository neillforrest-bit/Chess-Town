'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GAME_OPTIONS } from '@/lib/game-options';
import styles from './GoodTogetherHub.module.css';

const worlds = {
  trivia: { label: 'Quiz Town · Trivia', name: 'Quiz Town', type: 'Your pub quiz town', description: "Pull up a stool. Play me, challenge a friend, share a phone with your partner or bring the whole table. Pick your topic, trust your hunch and give me something to talk about.", hint: 'Solo, battle, pass & play, Party Table and the Road to the Landlord.', enter: 'Enter Quiz Town' },
  chess: { label: 'Chess Town · Chess', name: 'Chess Town', type: 'Your chess town', description: "Fancy learning a trick or giving someone a proper game? Take me on, share a board with a friend or partner, or practise a new move. I'll be here for the bright ideas and the blunders.", hint: 'Play Chester, local battle, The Underdog, learning and a daily challenge.', enter: 'Enter Chess Town' },
  movie: { label: 'Movie Town · Films', name: 'Movie Town', type: 'Your film-finding town', description: "Less debating, more watching. Find a film for tonight, dig up an unexpected gem or make choosing the movie a game with your partner. I'll show you the doors. You bring the popcorn.", hint: 'Existing movie preview: Tonight, Discovery Night and Movie Night. Orson hosts inside.', enter: 'Enter Movie Town' },
  logic: { label: 'Puzzle Town · Logic & riddles', name: 'Puzzle Town', type: 'Your logic and riddle town', description: "Come for a brain-teaser, stay for the moment it clicks. Play me, puzzle it out with a partner, battle friends or climb the road. Read twice. That innocent little question has teeth.", hint: 'Play Chester, pass & play, battle and the Road to the Riddlemaster.', enter: 'Enter Puzzle Town' },
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
      <div className={styles.field}><label htmlFor="gt-game">Which town are we visiting?</label><select id="gt-game" value={world} onChange={event => { const next = event.target.value as World; setWorld(next); setModeId(next === 'trivia' ? 'solo' : next === 'chess' ? 'chester' : next === 'movie' ? 'tonight' : 'logic'); }}>
        {Object.entries(worlds).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
      </select></div>
      <section className={styles.intro} aria-live="polite" aria-label="Chester introduces your town"><span className={styles.eyebrow}>Chester says · {game.type}</span><h2>{game.name}</h2><p>{game.description}</p><small>{game.hint}</small></section>
      <button className={styles.cta} onClick={enter}>{game.enter}<span aria-hidden="true">→</span></button>
    </> : <>
      <div className={styles.field}><label htmlFor="gt-mode">How would you like to play?</label><select id="gt-mode" value={selected.id} onChange={event => setModeId(event.target.value)}>{modes.map(mode => <option value={mode.id} key={mode.id}>{mode.title}</option>)}</select></div>
      <section className={styles.intro} aria-live="polite"><span className={styles.eyebrow}>{game.type}</span><h2>{selected.title}</h2><p>{selected.description}</p><small>{world === 'movie' || world === 'logic' ? 'Separate preview. Opens in this tab with its existing look and rules.' : 'Chester hosts your game. Existing look and rules stay for now.'}</small></section>
      <a className={styles.cta} href={selected.href} data-launch={selected.id}>{selected.action}<span aria-hidden="true">→</span></a>
      <button className={styles.back} onClick={leave}>← Back to all games</button>
    </>}
    <footer className={styles.footer}>{inside ? 'Good Together · hosted by Chester' : 'Pick a town. Hear from Chester. Then Enter.'}</footer>
  </main>;
}
