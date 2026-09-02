'use client';

import Link from 'next/link';
import { ChangeEvent, useState } from 'react';
import { ChesterAvatar } from './ChesterUI';

export default function GlobalNav() {
  const [isRoyalCatsOpen, setIsRoyalCatsOpen] = useState(false);
  const [status, setStatus] = useState('');

  const saveRoyalCat = (piece: 'q' | 'k', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Please choose an image file.');
      return;
    }
    if (file.size > 2_000_000) {
      setStatus('Choose a photo smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(`chess-town-royal-cat-${piece}`, String(reader.result));
        setStatus(`${piece === 'q' ? 'Marley' : 'Dilly'} is ready for the board.`);
        window.dispatchEvent(new Event('royal-cats-updated'));
      } catch {
        setStatus('That image is too large for browser storage.');
      }
    };
    reader.readAsDataURL(file);
  };

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Link href="/brawl" className="global-nav__return global-nav__brawl">🔥 JEMMA&apos;S BRAWL</Link>
        <button type="button" onClick={() => setIsRoyalCatsOpen(true)} className="global-nav__return" aria-haspopup="dialog">ROYAL CATS</button>
        <Link href="/" className="global-nav__return">RETURN TO ARENA</Link>
      </div>
      {isRoyalCatsOpen && (
        <div role="dialog" aria-modal="true" aria-label="Royal cat pieces" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.78)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <section style={{ width: 'min(100%, 430px)', background: '#090c14', border: '2px solid #ffea00', borderRadius: '8px', padding: '1.25rem', color: '#fff', boxShadow: '0 0 34px rgba(255, 234, 0, 0.28)' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div><strong style={{ color: '#ffea00', letterSpacing: '0.08em' }}>ROYAL CATS</strong><p style={{ margin: '0.3rem 0 0', fontSize: '0.84rem', color: '#c9d5df' }}>Their portraits replace every queen and king in the arena.</p></div>
              <button type="button" onClick={() => setIsRoyalCatsOpen(false)} aria-label="Close royal cats" style={{ border: 0, background: 'transparent', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </header>
            <label style={{ display: 'block', marginBottom: '0.85rem', fontWeight: 700, color: '#ff8dc2' }}>MARLEY · QUEEN<input type="file" accept="image/*" onChange={(event) => saveRoyalCat('q', event)} style={{ display: 'block', width: '100%', marginTop: '0.4rem', color: '#fff' }} /></label>
            <label style={{ display: 'block', fontWeight: 700, color: '#ffd39a' }}>DILLY · KING<input type="file" accept="image/*" onChange={(event) => saveRoyalCat('k', event)} style={{ display: 'block', width: '100%', marginTop: '0.4rem', color: '#fff' }} /></label>
            {status && <p role="status" style={{ margin: '1rem 0 0', color: '#8cf779', fontSize: '0.88rem' }}>{status}</p>}
          </section>
        </div>
      )}
    </nav>
  );
}