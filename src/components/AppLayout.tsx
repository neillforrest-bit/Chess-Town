'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackTownRoute } from '@/lib/town-activity';
import GlobalNav from '@/components/GlobalNav';
import BuildBadge from '@/components/BuildBadge';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname=usePathname();
  const isHome=pathname==='/';
  useEffect(()=>{trackTownRoute(pathname,window.location.search)},[pathname]);
  useEffect(()=>{const viewport=window.visualViewport;const size=()=>document.documentElement.style.setProperty('--gt-viewport-height',(viewport?.height||window.innerHeight)+'px');size();viewport?.addEventListener('resize',size);window.addEventListener('resize',size);return()=>{viewport?.removeEventListener('resize',size);window.removeEventListener('resize',size);document.documentElement.style.removeProperty('--gt-viewport-height');};},[]);
  const [open, setOpen] = useState(false);
  useEffect(()=>{const show=()=>setOpen(v=>!v);window.addEventListener('gt-open-chester',show);if(localStorage.getItem('gt-reduce-motion')==='1')document.documentElement.dataset.reduceMotion='true';return()=>window.removeEventListener('gt-open-chester',show)},[]);
  return <div className="app-shell h-[100dvh] w-screen overflow-hidden flex flex-col">
    <div className="portrait-lock" role="status"><i aria-hidden="true">♞</i><b>ROTATE ME</b><span>Chesterville is a portrait town - turn your phone upright and the fun continues.</span></div>
    {!isHome && <GlobalNav />}
    <BuildBadge />
    <main className="app-main flex-1 overflow-hidden">{children}</main>

    {!isHome && <aside id="chester-drawer" className={`chester-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header><b>MEET CHESTER</b><button onClick={() => setOpen(false)} aria-label="Close Chester guide">×</button></header>
      <div className="gt-guide-stub"><p>Pick a game, choose how to play and make a little time for fun.</p><p>Playing with friends? Your host shares the invite and keeps the host tab open while everyone joins.</p><p>Chester's question-and-answer guide is not ready yet. This welcome is local, not an AI chat.</p><button onClick={() => setOpen(false)}>Back to the game</button></div>
    </aside>}
  </div>;
}
