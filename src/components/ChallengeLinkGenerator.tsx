'use client';

import { useState } from 'react';

type ChallengeMode = '1v1' | '2v2';

export default function ChallengeLinkGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChallengeMode>('1v1');
  const [room, setRoom] = useState('');
  const [copied, setCopied] = useState(false);

  const roomToken = room.trim().replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const generatedRoom = roomToken || (typeof crypto !== 'undefined' ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/play-chester?mode=${mode}&room=${generatedRoom}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return <>
    <button type="button" className="portal-challenge-button" onClick={() => setIsOpen(true)}>CHALLENGE A FRIEND</button>
    {isOpen && <div className="portal-challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
      <div className="portal-challenge-modal__backdrop" onClick={() => setIsOpen(false)} />
      <section className="portal-challenge-modal__content">
        <header><div><span>PRIVATE CHESS TOWN ROOM</span><h2 id="challenge-title">Challenge a Friend</h2></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Close challenge generator">×</button></header>
        <div className="portal-challenge-modes" role="group" aria-label="Challenge mode"><button type="button" aria-pressed={mode === '1v1'} onClick={() => setMode('1v1')}>1v1 Duel</button><button type="button" aria-pressed={mode === '2v2'} onClick={() => setMode('2v2')}>2v2 Chaos</button></div>
        <label>ROOM NAME <input value={room} onChange={(event) => { setRoom(event.target.value); setCopied(false); }} placeholder="Auto-generate a room" maxLength={24} /></label>
        <label>SHARE LINK <input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></label>
        <button type="button" className="portal-challenge-copy" onClick={() => void copyLink()}>{copied ? 'COPIED' : 'COPY LINK TO CLIPBOARD'}</button>
      </section>
    </div>}
  </>;
}
