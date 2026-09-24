'use client';

// Chester's commentary box for the mini-games: same skin as the Play Chester
// live-line, voice customized per game. Commentary only - no chat in the minis.
import { useEffect, useRef, useState } from 'react';
import { miniChesterLine, type MiniGameKey } from '@/lib/chester-voice';

type MiniChesterProps = {
  game: MiniGameKey;
  label: string;
  // Bump `event` whenever something worth reacting to happens: start, hit, miss,
  // capture, queen, close, win, lose. Chester reacts, then drifts back to idle tips.
  event?: { type: string; seed: number } | null;
};

const IDLE_ROTATE_MS = 8000;

export default function MiniChester({ game, label, event = null }: MiniChesterProps) {
  const [line, setLine] = useState(() => miniChesterLine(game, 'idle', 1));
  const [reacting, setReacting] = useState(false);
  const idleCount = useRef(1);

  useEffect(() => {
    if (!event) return;
    setLine(miniChesterLine(game, event.type, Math.max(1, event.seed)));
    setReacting(true);
    const settle = window.setTimeout(() => setReacting(false), 3600);
    return () => window.clearTimeout(settle);
  }, [event, game]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (reacting) return;
      idleCount.current += 1;
      setLine(miniChesterLine(game, 'idle', idleCount.current));
    }, IDLE_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [game, reacting]);

  return <div className={`chester-live-line mini-chester ${reacting ? 'is-reviewing' : ''}`} aria-live="polite">
    <div className="chester-live-line__avatar" key={line} aria-hidden="true">♞</div>
    <div><span>CHESTER / {label}</span><b>{reacting ? 'LIVE REACTION' : 'CORNER WISDOM'}</b><p>{line}</p></div>
  </div>;
}
