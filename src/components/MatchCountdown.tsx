'use client';

import { useEffect, useState } from 'react';

const BEATS = [
  { word: 'READY', color: '#22d3ee', ms: 1500 },
  { word: 'STEADY', color: '#ffd84d', ms: 1500 },
  { word: 'GO!', color: '#4ade80', ms: 1300 },
];

/* Pre-match arena countdown: flashes READY / STEADY / GO over the board.
   Covers input while it runs so nobody moves before the bell. */
export default function MatchCountdown({ onDone }: { onDone?: () => void }) {
  const [beat, setBeat] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (beat >= BEATS.length) {
      const fade = window.setTimeout(() => { setGone(true); onDone?.(); }, 250);
      return () => window.clearTimeout(fade);
    }
    const timer = window.setTimeout(() => setBeat((b) => b + 1), BEATS[beat].ms);
    return () => window.clearTimeout(timer);
  }, [beat, onDone]);

  if (gone) return null;
  const current = BEATS[Math.min(beat, BEATS.length - 1)];
  return <div className="match-countdown" role="status" aria-label="Match starting">
    <span key={beat} className="match-countdown__word" style={{ color: current.color, textShadow: `0 0 24px ${current.color}, 0 0 64px ${current.color}` }}>{current.word}</span>
    <span className="match-countdown__sub">CHESTER PRESENTS</span>
  </div>;
}
