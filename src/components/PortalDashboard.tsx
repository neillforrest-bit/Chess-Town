'use client';

import Link from 'next/link';
import ChallengeLinkGenerator from '@/components/ChallengeLinkGenerator';
import { PORTALS } from '@/lib/chester-landing';

export default function PortalDashboard() {
  return <section className="portal-dashboard" aria-label="Chess Town destinations">
    <header className="portal-dashboard__header"><span>CHESS-TOWN</span><h1>CHOOSE YOUR ARENA</h1></header>
    <Link className="portal-trivia-entry" href="/trivia-brawl"><span>CHESTER&apos;S PUB</span><h2>PLAY PUB TRIVIA →</h2><p>Single topic or mixed quiz. Bring a friend, share a phone, or play a short quiz against Chester.</p><b>FRIENDS: 5 ROUNDS + 5 FLASH FINALES</b></Link>
    <ChallengeLinkGenerator />
    <div className="portal-grid">
      {PORTALS.map((portal, index) => <Link key={portal.title} href={portal.href} className={`portal-card portal-card--${portal.accent}`}>
        <i aria-hidden="true">{portal.icon}</i><span>ARENA {String(index + 1).padStart(2, '0')}</span><h2>{portal.title}</h2><b>PLAY</b>
      </Link>)}
    </div>
  </section>;
}
