'use client';

import { useEffect, useState } from 'react';
import { CHESTER_LANDING_COPY } from '@/lib/chester-landing';

export default function ChesterIntro({ onEnter }: { onEnter: () => void }) {
  const [visibleText, setVisibleText] = useState('');
  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(CHESTER_LANDING_COPY.introGreeting.slice(0, index));
      if (index >= CHESTER_LANDING_COPY.introGreeting.length) window.clearInterval(timer);
    }, 20);
    return () => window.clearInterval(timer);
  }, []);
  return <button className="portal-intro" onClick={onEnter} aria-label="Enter Chess Town">
    <div className="portal-intro__glow" aria-hidden="true" />
    <div className="portal-intro__content"><span>CHESTER / ONLINE</span><div className="portal-intro__mark" aria-hidden="true">♞</div><p>{visibleText}<b aria-hidden="true">|</b></p><small>CLICK ANYWHERE TO BEGIN</small></div>
  </button>;
}
