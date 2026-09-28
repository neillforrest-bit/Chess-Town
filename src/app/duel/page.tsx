'use client';

import { useState } from 'react';

// Safari-safe room id: crypto.randomUUID is missing on iOS < 15.4, so fall back.
function makeRoomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export default function DuelLobby() {
  const [room] = useState(makeRoomId);
  const [copied, setCopied] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const friendUrl = `${origin}/play-chester?mode=duel&room=${room}`;
  const hostUrl = `${friendUrl}&host=1`;

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Chess Town duel', text: 'Fight me in Chess Town - live duel on your own phone, Chester commentates every move:', url: friendUrl }); return; } catch { /* dismissed - fall back */ }
    }
    try { await navigator.clipboard.writeText(friendUrl); setCopied(true); } catch { setCopied(false); }
  };

  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#050708', color: '#e8f4f6', padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
      <span style={{ color: '#ffd84d', fontSize: '.68rem', fontWeight: 900, letterSpacing: '2px' }}>CHESS-TOWN LIVE DUEL</span>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.7rem', margin: '.4rem 0 .3rem' }}>Challenge a Friend</h1>
      <p style={{ color: '#9db2b7', fontSize: '.84rem', lineHeight: 1.5, margin: '0 0 1.2rem' }}>Two phones, one board. Chester commentates every move on both screens - bullets, win odds and all. Room <b style={{ color: '#ffd84d' }}>{room}</b>.</p>
      <a href={hostUrl} style={{ display: 'block', padding: '.9rem', marginBottom: '.6rem', background: '#ffd84d', color: '#171106', fontWeight: 900, letterSpacing: '1px', borderRadius: 8, textDecoration: 'none' }}>OPEN YOUR ROOM - YOU ARE WHITE</a>
      <button type="button" onClick={() => void share()} style={{ display: 'block', width: '100%', padding: '.9rem', marginBottom: '.6rem', background: 'rgba(34,211,238,.12)', color: '#22d3ee', border: '1px solid #22d3ee', fontWeight: 900, letterSpacing: '1px', borderRadius: 8, cursor: 'pointer' }}>{copied ? 'LINK COPIED - SEND IT' : 'SHARE LINK TO YOUR FRIEND'}</button>
      <p style={{ color: '#71878b', fontSize: '.7rem', lineHeight: 1.5 }}>Send the link first, then open your room. The game starts the moment your friend joins - they play Black.</p>
      <input readOnly value={friendUrl} onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', marginTop: '.4rem', padding: '.55rem .6rem', background: '#0b1113', color: '#9db2b7', border: '1px solid rgba(238,252,255,.18)', borderRadius: 6, fontSize: '.68rem', boxSizing: 'border-box' }} />
    </div>
  </main>;
}
