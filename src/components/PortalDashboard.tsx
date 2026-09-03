'use client';

import Link from 'next/link';
import { PORTALS } from '@/lib/chester-landing';

export default function PortalDashboard() {
  return <section className="portal-dashboard" aria-label="Chess Town destinations">
    <header className="portal-dashboard__header"><span>CHESS-TOWN</span><h1>CHOOSE YOUR ARENA</h1></header>
    <div className="portal-grid">
      {PORTALS.map((portal, index) => <Link key={portal.title} href={portal.href} className={`portal-card portal-card--${portal.accent}`}>
        <i aria-hidden="true">{portal.icon}</i><span>ARENA {String(index + 1).padStart(2, '0')}</span><h2>{portal.title}</h2><b>PLAY</b>
      </Link>)}
    </div>
  </section>;
}
