'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GAME_OPTIONS } from '@/lib/game-options';
import styles from './GoodTogetherHub.module.css';
import ChesterCompanion from './ChesterCompanion';

const worlds = {
  trivia: { label: 'Quiz Town · Trivia', name: 'Quiz Town', type: 'Your pub quiz town', description: "Pull up a stool. Play me, challenge a friend, share a phone with your partner or bring the whole table. Pick your topic, trust your hunch and give me something to talk about.", hint: 'Solo, battle, pass & play, Party Table and the Road to the Landlord.', enter: 'Enter Quiz Town' },
  chess: { label: 'Chess Town · Chess', name: 'Chess Town', type: 'Your chess town', description: "Fancy learning a trick or giving someone a proper game? Take me on, share a board with a friend or partner, or practise a new move. I'll be here for the bright ideas and the blunders.", hint: 'Play Chester, local battle, The Underdog, learning and a daily challenge.', enter: 'Enter Chess Town' },
  movie: { label: 'Movie Town · Films', name: 'Movie Town', type: 'Your film-finding town', description: "Less debating, more watching. Find a film for tonight, dig up an unexpected gem or make choosing the movie a game with your partner. I'll show you the doors. You bring the popcorn.", hint: 'Existing movie preview: Tonight, Discovery Night and Movie Night. Orson hosts inside.', enter: 'Enter Movie Town' },
  logic: { label: 'Puzzle Town · Logic & riddles', name: 'Puzzle Town', type: 'Your logic and riddle town', description: "Come for a brain-teaser, stay for the moment it clicks. Play me, puzzle it out with a partner, battle friends or climb the road. Read twice. That innocent little question has teeth.", hint: 'Play Chester, pass & play, battle and the Road to the Riddlemaster.', enter: 'Enter Puzzle Town' },
};
type World = keyof typeof worlds;
const movieModes = [
  { id: 'tonight', title: 'Tonight · find a film', description: 'Pick a mood or jump straight to films. No film list or streaming setup needed.', href: 'https://chess-town-git-instinct-movie-no-calibration-20261112-neillo.vercel.app/tonight', action: 'Find a film' },
  { id: 'discover', title: 'Discovery Night', description: 'Explore films you might not have thought to look for.', href: 'https://chess-town-git-movie-night-neillo.vercel.app/discover', action: 'Explore films' },
  { id: 'movie-night', title: 'Movie night · together', description: 'Open the existing movie-picking game and choose your night.', href: 'https://chess-town-git-movie-night-neillo.vercel.app/', action: 'Open Movie Time' },
];
const logicModes = [
  { id: 'logic', title: 'Choose your table', description: 'Solo with Chester, pass & play or a friend battle. Choose inside the existing preview.', href: 'https://chess-town-git-instinct-brendo-gothic-neillo.vercel.app/logic-brawl', action: 'Choose your table' },
  { id: 'logic-road', title: 'The Road · logic & riddles', description: 'Fifteen rising tables. Progress stays on this device.', href: 'https://chess-town-git-instinct-brendo-gothic-neillo.vercel.app/road/logic', action: 'Open the road' },
];

export default function GamesHub() {
  const [world, setWorld] = useState<World | ''>('');
  const [inside, setInside] = useState(false);
  const [paused, setPaused] = useState(false);
  const modes = world === 'movie' ? movieModes : world === 'logic' ? logicModes : GAME_OPTIONS.filter(mode => mode.family === world);
  const [modeId, setModeId] = useState('solo');
  const selected = modes.find(mode => mode.id === modeId) || modes[0];
  const game = world ? worlds[world] : null;
  useEffect(() => {
    const back = () => { const params = new URLSearchParams(window.location.search); const town = params.get('town'); if (town && town in worlds) { setWorld(town as World); setModeId(town === 'trivia' ? 'solo' : town === 'chess' ? 'chester' : town === 'movie' ? 'tonight' : 'logic'); setInside(params.get('choose') === 'mode'); } else setInside(false); };
    back(); window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  const enter = () => { if (!world) return; setInside(true); history.pushState({}, '', `${location.pathname}?choose=mode&town=${world}`); };
  const leave = () => { setInside(false); history.replaceState({}, '', location.pathname); };
  return <main className={`${styles.hub} ${inside ? styles.inside : ''} good-together-hub`} data-town={world} aria-labelledby="gt-title">
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Get In Town home" onClick={leave}>
        {/* Original vector artwork recovered from the approved preview study. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/good-together/umbrella.svg" alt="" width="40" height="40" />
        <span>get in<i>town</i></span>
      </Link><div className={styles.headerTools}><span className={styles.preview}>Preview</span><button className={styles.motion} onClick={() => setPaused(current => !current)} aria-label={paused ? 'Resume Chester animation' : 'Pause Chester animation'} aria-pressed={paused} title={paused ? 'Resume animation' : 'Pause animation'}>{paused ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4L16 10L7 16Z" fill="currentColor"/></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5V15M13 5V15" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>}</button></div>
    </header>
    <section className={styles.welcome}>
      <div className={styles.heroCopy}><span className={styles.hostLabel}>I&apos;m Chester. Your host.</span><h1 id="gt-title">{inside && game ? game.name : <>Good times,<br /><em>this way.</em></>}</h1><span className={styles.heroCaption}>{inside ? 'Find your favourite way to play.' : 'Four towns. Plenty of possibilities.'}</span></div>
      <div className={styles.character} key={world || 'welcome'}><ChesterCompanion paused={paused}/></div>
      <div className={styles.orbit} aria-hidden="true"/>
    </section>
    {!inside && <p className={styles.tagline}>You can do better than doom scrolling. Play a game, find a film, maybe even test your knowledge or grammar.</p>}
    {!inside ? <>
      <div className={styles.field}><label htmlFor="gt-game">Pick your town tonight</label><select id="gt-game" value={world} onChange={event => { const next = event.target.value as World | ''; setWorld(next); setModeId(next === 'trivia' ? 'solo' : next === 'chess' ? 'chester' : next === 'movie' ? 'tonight' : 'logic'); }}>
        <option value="" disabled>Pick a town tonight...</option>
        {Object.entries(worlds).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
      </select></div>
      <section className={styles.intro} aria-live="polite" aria-label="Chester introduces your town"><div className={styles.cardHead}><span className={styles.speaker}><i aria-hidden="true"/>Chester says</span><span className={styles.townNumber}>{!world ? '00' : world === 'chess' ? '01' : world === 'trivia' ? '02' : world === 'movie' ? '03' : '04'} / 04</span></div><h2>{game ? game.name : 'Your night starts here'}<span className={styles.townGlyph} aria-hidden="true">{world === 'chess' ? '♜' : world === 'trivia' ? '?' : world === 'movie' ? '▷' : world === 'logic' ? '✳' : '?' }</span></h2><p>{game ? game.description : 'Pick a town above. I will show you what is waiting, then you choose how to play.'}</p>{game && <small>{game.hint}</small>}</section>
      <button className={styles.cta} disabled={!world} onClick={enter}>{game ? game.enter : 'Choose a town to enter'}<span aria-hidden="true">→</span></button>
    </> : game && selected ? <>
      <div className={styles.field}><label htmlFor="gt-mode">How would you like to play?</label><select id="gt-mode" value={selected.id} onChange={event => setModeId(event.target.value)}>{modes.map(mode => <option value={mode.id} key={mode.id}>{mode.title}</option>)}</select></div>
      <section className={styles.intro} aria-live="polite"><span className={styles.eyebrow}>{game.type}</span><h2>{selected.title}</h2><p>{selected.description}</p><small>{world === 'movie' || world === 'logic' ? 'Separate preview. Opens in this tab with its existing look and rules.' : 'Chester hosts your game. Existing look and rules stay for now.'}</small></section>
      <a className={styles.cta} href={selected.href} data-launch={selected.id}>{selected.action}<span aria-hidden="true">→</span></a>
      <button className={styles.back} onClick={leave}>← Back to all games</button>
    </> : null}
    <footer className={styles.footer}>{inside ? 'Get In Town · hosted by Chester' : 'Pick a town. Hear from Chester. Then Enter.'}</footer>
  </main>;
}
