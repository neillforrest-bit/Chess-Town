'use client';

import { useEffect, useState } from 'react';

const BEATS = [
  { word: 'READY', color: '#22d3ee', ms: 1500 },
  { word: 'STEADY', color: '#ffd84d', ms: 1500 },
  { word: 'GO!', color: '#4ade80', ms: 1300 },
];
// BUILD 157: Run It Back - back in the fight within 3 seconds.
const BEATS_FAST = [
  { word: 'RUN IT BACK', color: '#ffd84d', ms: 1100 },
  { word: 'GO!', color: '#4ade80', ms: 800 },
];

/* Pre-match arena countdown: flashes READY / STEADY / GO over the board.
   Covers input while it runs so nobody moves before the bell. */
export default function MatchCountdown({ onDone, fast = false }: { onDone?: () => void; fast?: boolean }) {
  const beats = fast ? BEATS_FAST : BEATS;
  const [beat, setBeat] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (beat >= beats.length) {
      const fade = window.setTimeout(() => { setGone(true); onDone?.(); }, 250);
      return () => window.clearTimeout(fade);
    }
    const timer = window.setTimeout(() => setBeat((b) => b + 1), beats[beat].ms);
    return () => window.clearTimeout(timer);
  }, [beat, beats, onDone]);

  if (gone) return null;
  const current = beats[Math.min(beat, beats.length - 1)];
  return <div className="match-countdown" role="status" aria-label="Match starting">
    <span key={beat} className="match-countdown__word" style={{ color: current.color, textShadow: `0 0 24px ${current.color}, 0 0 64px ${current.color}` }}>{current.word}</span>
    <span className="match-countdown__sub">{fast ? 'COLORS FLIPPED' : 'CHESTER PRESENTS · TAPS UNLOCK ON GO'}</span>
  </div>;
}
