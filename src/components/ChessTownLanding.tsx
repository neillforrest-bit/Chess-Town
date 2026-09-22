'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/profile';

const destinations = [
  {
    eyebrow: 'LEARN WITH CHESTER',
    title: "CHESTER'S DOJO",
    copy: 'Play a guided game. Chester watches every move and teaches while the board stays live.',
    href: '/play-chester',
    action: 'ENTER THE DOJO',
    icon: '♞',
    className: 'town-building--dojo',
  },
  {
    eyebrow: 'PLAY THE TOWN',
    title: 'THE ARENA',
    copy: 'Rivalries, daily battles and games that turn one good move into local legend.',
    href: '/arena',
    action: 'STEP INTO THE LIGHTS',
    icon: '♜',
    className: 'town-building--arena',
  },
  {
    eyebrow: 'BUILD YOUR GAME',
    title: 'LESSON HALL',
    copy: 'Sharp tactics, deeper strategy and focused missions for every stage of your game.',
    href: '/training',
    action: 'START A LESSON',
    icon: '♝',
    className: 'town-building--lessons',
  },
];

const howItWorks = [
  { icon: '🚪', title: 'PICK YOUR DISTRICT', copy: 'Start with a guided game, a live rivalry, a focused lesson or today’s challenge.' },
  { icon: '♞', title: 'CHESTER READS THE POSITION', copy: 'Useful insight lands beside the board while you play, from first principles to sharp tactics.' },
  { icon: '📈', title: 'YOUR GAME GETS DEEPER', copy: 'Play for five minutes or chase the leaderboard. The town grows with your ambition.' },
];

export default function ChessTownLanding() {
  const [returning, setReturning] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem('chess-town-visited')));
      window.localStorage.setItem('chess-town-visited', '1');
      const profileName = getProfile().username;
      if (profileName && profileName !== 'Challenger') setName(profileName);
    } catch { /* private browsing: first-visit welcome is fine */ }
  }, []);

  const greeting = returning
    ? `Welcome back${name ? `, ${name}` : ''}. The town kept the lights on for you. Chase a stronger game in the dojo, take today’s challenge, or step into the Arena.`
    : 'Evening. I’m Chester — knight, coach and unofficial mayor of Chess Town. This is a living chess world for everyone: your first legal move, your hundredth tactical win, and every rivalry between. I read the position with you, explain what matters without slowing the game, and point you toward the district that fits your mood. Learn, compete, experiment, or just play.';

  return <main className="town-night">
    <div className="town-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    <div className="town-moon" aria-hidden="true">♘</div>
    <header className="town-masthead">
      <span>WELCOME TO</span>
      <h1>CHESS TOWN</h1>
      <p>Chess is better when the board feels alive. Learn, compete, experiment, or simply play.</p>
      <div className="town-live"><i /> THE TOWN IS OPEN</div>
    </header>
    <section className="town-host" aria-label="Chester, your host">
      <div className="town-host__avatar" aria-hidden="true">♞</div>
      <div className="town-host__card">
        <span>{returning ? 'CHESTER / WELCOME BACK' : 'CHESTER / YOUR HOST'}</span>
        <p>{greeting}</p>
        <div className="town-host__actions">
          {returning
            ? <><Link href="/play-chester">BACK TO THE DOJO →</Link><Link href="/daily-challenge">TODAY'S CHALLENGE</Link></>
            : <><Link href="/play-chester">CHOOSE YOUR GAME →</Link><Link href="#town-street">EXPLORE THE TOWN</Link></>}
        </div>
      </div>
    </section>
    <section className="town-how" aria-label="How Chess Town works">
      {howItWorks.map((step) => <div key={step.title}><b><i>{step.icon}</i>{step.title}</b><p>{step.copy}</p></div>)}
    </section>
    <section className="town-street" id="town-street" aria-label="Choose a Chess Town destination">
      <div className="town-street__glow" aria-hidden="true" />
      {destinations.map((destination) => <Link href={destination.href} key={destination.title} className={`town-building ${destination.className}`}>
        <div className="town-building__roof" aria-hidden="true" />
        <div className="town-building__sign"><span>{destination.eyebrow}</span><b>{destination.title}</b></div>
        <div className="town-building__windows" aria-hidden="true"><i /><i /><i /></div>
        <div className="town-building__door" aria-hidden="true"><span>{destination.icon}</span></div>
        <p>{destination.copy}</p>
        <strong>{destination.action} <i>→</i></strong>
      </Link>)}
    </section>
    <footer className="town-footer">
      <p><b>Tonight in town:</b> Chester is reading positions. The arena lights are on. Every level has a game waiting.</p>
      <nav><Link href="/daily-challenge">Daily challenge</Link><Link href="/boss-map">Boss map</Link><Link href="/meet-chester">Meet Chester</Link></nav>
    </footer>
  </main>;
}
