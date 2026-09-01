'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChesterAvatar } from './ChesterUI';
import { useState, useEffect } from 'react';

export default function GlobalNav() {
  const pathname = usePathname();
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

      <div className="global-nav__links">
        {[
          { path: '/', label: 'HOME' },
          { path: '/chester-challenge', label: 'DAILY LEADERBOARD' },
          { path: '/chester-challenge', label: 'DAILY CHESTER CHALLENGE' },
          { path: '/arena?view=mini-games', label: 'TRAINING' },
          { path: '/arena?view=play', label: 'CORE GAMEPLAY' },
          { path: '/arena?view=leagues', label: 'LEAGUE PLAY' }
        ].map((link) => {
          const isActive = pathname === link.path.split('?')[0];
          return (
            <Link 
              key={link.path}
              href={link.path} 
              className={isActive ? 'is-active' : ''}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}