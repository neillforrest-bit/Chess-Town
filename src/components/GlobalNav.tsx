'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChesterAvatar } from './ChesterUI';
import { useState, useEffect } from 'react';

export default function GlobalNav() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      padding: isScrolled ? '0.75rem 2rem' : '1.5rem 2rem',
      background: isScrolled ? 'rgba(5, 7, 8, 0.9)' : 'transparent',
      backdropFilter: isScrolled ? 'blur(10px)' : 'none',
      borderBottom: isScrolled ? '1px solid rgba(0, 229, 229, 0.2)' : '1px solid transparent',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
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

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {[
          { path: '/', label: 'MEET CHESTER' },
          { path: '/arena', label: 'THE ARENA' }
        ].map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link 
              key={link.path}
              href={link.path} 
              style={{
                color: isActive ? '#00e5e5' : '#b9c9cc',
                textDecoration: 'none',
                fontFamily: 'Georgia, serif',
                fontSize: '0.85rem',
                fontWeight: 900,
                letterSpacing: '2px',
                padding: '0.5rem 1rem',
                border: isActive ? '1px solid rgba(0, 229, 229, 0.4)' : '1px solid transparent',
                borderRadius: '4px',
                background: isActive ? 'rgba(0, 229, 229, 0.1)' : 'transparent',
                transition: 'all 0.2s',
                textShadow: isActive ? '0 0 8px rgba(0, 229, 229, 0.4)' : 'none'
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}