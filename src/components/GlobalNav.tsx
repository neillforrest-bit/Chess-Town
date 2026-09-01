'use client';

import Link from 'next/link';
import { ChesterAvatar } from './ChesterUI';

export default function GlobalNav() {
  return (
    <nav className="global-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ animation: 'chester-float 4s ease-in-out infinite' }}>
            <ChesterAvatar isThinking={false} size="small" />
          </div>
          <span style={{ 
            fontFamily: 'Georgia, serif', 
            fontWeight: 900, 
            letterSpacing: '2px', 
            color: '#eefcff',
            fontSize: '1.2rem',
            textShadow: '0 0 10px rgba(0, 229, 229, 0.5)'
          }}>
            CHESS-TOWN
          </span>
        </Link>
      </div>

      <Link href="/" className="global-nav__return">RETURN TO ARENA</Link>
    </nav>
  );
}