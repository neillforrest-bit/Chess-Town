'use client';

import { useRef, useState } from 'react';

type ChallengeMode = '1v1' | '2v2';

// Safari-safe room id: crypto.randomUUID is missing on iOS < 15.4, so fall back.
function makeRoomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export default function ChallengeLinkGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChallengeMode>('1v1');
  const [room, setRoom] = useState('');
  // Generated once per open, so the shown link never changes under the user's finger.
  const [autoRoom, setAutoRoom] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  const roomToken = room.trim().replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const activeRoom = roomToken || autoRoom;
  const shareUrl = typeof window === 'undefined' || !activeRoom ? '' : `${window.location.origin}/play-chester?mode=${mode}&room=${activeRoom}`;

  const openModal = () => {
    setAutoRoom((current) => current || makeRoomId());
    setCopied(false);
    setCopyFailed(false);
    setIsOpen(true);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      return;
    } catch { /* fall through to the selection path */ }
    // iPad/iPhone Safari fallback: select the read-only field and copy the old way.
    const input = linkInputRef.current;
    if (input) {
      input.focus();
      input.select();
      input.setSelectionRange(0, shareUrl.length);
      try {
        const ok = document.execCommand('copy');
        setCopied(ok);
        setCopyFailed(!ok);
        return;
      } catch { /* fall through */ }
    }
    setCopied(false);
    setCopyFailed(true);
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Chess Town duel', text: 'Fight me in Chess Town - pass-and-play duel, Chester commentates:', url: shareUrl });
        return;
      } catch { /* user dismissed or share unsupported - fall back to copy */ }
    }
    await copyLink();
  };

  return <>
    <button type="button" className="portal-challenge-button" onClick={openModal}>CHALLENGE A FRIEND</button>
    {isOpen && <div className="portal-challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
      <div className="portal-challenge-modal__backdrop" onClick={() => setIsOpen(false)} />
      <section className="portal-challenge-modal__content">
        <header><div><span>PRIVATE CHESS TOWN ROOM</span><h2 id="challenge-title">Challenge a Friend</h2></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Close challenge generator">×</button></header>
        <div className="portal-challenge-modes" role="group" aria-label="Challenge mode"><button type="button" aria-pressed={mode === '1v1'} onClick={() => setMode('1v1')}>1v1 Duel</button><button type="button" aria-pressed={mode === '2v2'} onClick={() => setMode('2v2')}>2v2 Chaos</button></div>
        <label>ROOM NAME <input value={room} onChange={(event) => { setRoom(event.target.value); setCopied(false); setCopyFailed(false); }} placeholder="Auto-generate a room" maxLength={24} /></label>
        <label>SHARE LINK <input ref={linkInputRef} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></label>
        <div className="portal-challenge-actions">
          <button type="button" className="portal-challenge-copy" onClick={() => void shareLink()}>SHARE TO A FRIEND</button>
          <button type="button" className="portal-challenge-copy portal-challenge-copy--secondary" onClick={() => void copyLink()}>{copied ? 'COPIED' : 'COPY LINK'}</button>
        </div>
        {copyFailed && <p className="portal-challenge-hint">Copy did not take on this browser - press and hold the link above, then tap Copy.</p>}
      </section>
    </div>}
  </>;
}
