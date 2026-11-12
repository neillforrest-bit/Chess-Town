"use client";

import { useEffect, useRef, useState } from 'react';

// Wall-clock-independent UI. Hosted snapshots provide remaining time from the
// host; local modes use the configured duration for each visible player's turn.
export function useTriviaQuestionTimer(key: string | null, remainingMs: number | undefined, onExpire: () => void, durationSeconds = 10) {
  const [left, setLeft] = useState(durationSeconds);
  const deadline = useRef(0);
  const callback = useRef(onExpire);
  useEffect(() => { callback.current = onExpire; });
  useEffect(() => {
    if (!key) { deadline.current = 0; return; }
    deadline.current = performance.now() + Math.max(0, remainingMs ?? durationSeconds * 1000);
    let fired = false;
    const update = () => {
      const ms = Math.max(0, deadline.current - performance.now());
      setLeft(Math.ceil(ms / 1000));
      if (!ms && !fired) { fired = true; callback.current(); }
    };
    update();
    const tick = setInterval(update, 50);
    return () => clearInterval(tick);
  }, [key, remainingMs, durationSeconds]);
  return { left, expired: () => deadline.current > 0 && performance.now() >= deadline.current };
}

export function TriviaQuestionClock({ seconds, duration = 10 }: { seconds: number; duration?: number }) {
  return <div className={`trivia-flash-timer trivia-question-timer${seconds <= 5 ? ' is-low' : ''}`} role="timer" aria-label={`${seconds} seconds remaining`}>
    <b>{seconds > 0 ? `${seconds}s` : "TIME'S UP"}</b><div style={{ width: `${Math.min(100, seconds / duration * 100)}%` }} />
    <small>{duration} seconds. Unanswered at the bell counts as wrong.</small>
  </div>;
}
