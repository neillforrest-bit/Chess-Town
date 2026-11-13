'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

export default function GlobalNav() {
  const pathname = usePathname();
  const isQuiz = /^\/(quiz|logic-brawl|trivia(?:-brawl|-party)?)(?:\/|$)/.test(pathname || '');
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
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/good-together/umbrella.svg" alt="" width={30} height={30} style={{ display: 'block' }} />
          <span style={{
            fontFamily: 'ManropeGT, Arial, sans-serif',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#fff5ed',
            fontSize: '1.05rem',
            lineHeight: 0.95,
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}>
            Game Town
            <i style={{ fontStyle: 'normal', fontSize: '0.85rem', color: '#c2a4fa', letterSpacing: '-0.4px' }}>hosted by Chester</i>
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* <button type="button" onClick={() => setIsRoyalCatsOpen(true)} className="global-nav__return" aria-haspopup="dialog">ROYAL CATS</button> */}
        <Link href="/" className="global-nav__return">GAME TOWN</Link>
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