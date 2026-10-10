'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Repository from './Repository';

/** Top-level view state (PRD s2): gameplay arena or casual repository, dissolved/faded with CSS transitions. */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [viewMode, setViewMode] = useState<'gameplay' | 'casual'>('gameplay'); const [seen, setSeen] = useState(false); const [mute, setMute] = useState(false);
  useEffect(() => { try { if (localStorage.getItem('cs-view') === 'casual') { setViewMode('casual'); setSeen(true); } setMute(localStorage.getItem('cs-mute') === '1'); } catch { /* none */ } }, []);
  const pick = (v: 'gameplay' | 'casual') => { setViewMode(v); if (v === 'casual') setSeen(true); try { localStorage.setItem('cs-view', v); } catch { /* none */ } };
  if (path !== '/') return <>{children}</>;
  return <div className={'cs-shell is-' + viewMode}>
    <nav className="cs-viewbar"><button className={viewMode === 'gameplay' ? 'is-on' : ''} onClick={() => pick('gameplay')}>GAMEPLAY</button><button className={viewMode === 'casual' ? 'is-on' : ''} onClick={() => pick('casual')}>CASUAL</button>
      <button className="cs-mute" aria-label="Toggle theatre hum" onClick={() => { const n = !mute; setMute(n); try { localStorage.setItem('cs-mute', n ? '1' : '0'); } catch { /* none */ } }}>{mute ? '🔇' : '🔈'}</button></nav>
    <div className="cs-layer cs-layer--game">{children}</div>
    <div className="cs-layer cs-layer--repo">{seen && <Repository />}</div>
  </div>;
}
