'use client';
import Link from 'next/link';
import { GAMES, type Door } from '@/games/registry';

const TITLES: Record<Door, string> = { play: 'PLAY CHESTER', road: 'ROAD TO JOSEPH', battle: 'BATTLE MODE' };
export default function GameHub({ door, extras }: { door: Door; extras?: { href: string; icon: string; title: string; copy: string }[] }) {
  const items = GAMES.map((g) => ({ g, href: g[door], copy: g.blurb[door] }));
  return <main className="town-night town-night--doors">
    <header className="town-masthead town-masthead--compact"><h1>{TITLES[door]}</h1><Link href="/" className="town-rank">← Chesterville</Link></header>
    <nav className="town-doors" aria-label={TITLES[door]}>
      {items.map(({ g, href, copy }) => href
        ? (g.external && door === 'play'
          ? <a key={g.id} href={href} className="town-door" style={{ '--card-accent': g.accent } as React.CSSProperties}><i aria-hidden="true">{g.icon}</i><div><b>{g.name.toUpperCase()}</b><span>{copy}</span></div><em>↗</em></a>
          : <Link key={g.id} href={href} className="town-door" style={{ '--card-accent': g.accent } as React.CSSProperties}><i aria-hidden="true">{g.icon}</i><div><b>{g.name.toUpperCase()}</b><span>{copy}</span></div><em>→</em></Link>)
        : <div key={g.id} className="town-door" style={{ '--card-accent': g.accent, opacity: .5 } as React.CSSProperties}><i aria-hidden="true">{g.icon}</i><div><b>{g.name.toUpperCase()}</b><span>{copy}</span></div><em>soon</em></div>)}
      {extras?.map((x) => <Link key={x.href} href={x.href} className="town-door" style={{ '--card-accent': '#b8a2ff' } as React.CSSProperties}><i aria-hidden="true">{x.icon}</i><div><b>{x.title}</b><span>{x.copy}</span></div><em>→</em></Link>)}
    </nav>
  </main>;
}
