'use client';
import { useEffect, useState } from 'react';

const TYPE_SPEED_MS = 22;

export default function Teleprompter({
  text,
  isLoading = false,
  label = 'STOCKFISH WIRE',
}: {
  text: string;
  isLoading?: boolean;
  label?: string;
}) {
  const [prevText, setPrevText] = useState(text);
  const [revealedCount, setRevealedCount] = useState(0);

  // Reset the typing progress whenever a new commentary string arrives.
  if (text !== prevText) {
    setPrevText(text);
    setRevealedCount(0);
  }

  useEffect(() => {
    if (!text) return;
    const interval = window.setInterval(() => {
      setRevealedCount((count) => {
        if (count >= text.length) {
          window.clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, TYPE_SPEED_MS);

    return () => window.clearInterval(interval);
  }, [text]);

  const displayed = text.slice(0, revealedCount);

  return (
    <div
      className="live-teleprompter"
      role="status"
      aria-live="polite"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'rgba(6, 4, 12, 0.88)',
        border: '1px solid rgba(0, 255, 255, 0.35)',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        boxShadow: 'inset 0 0 18px rgba(0,255,255,0.08), 0 4px 16px rgba(0,0,0,0.4)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          color: '#ff2b88',
          fontSize: '0.62rem',
          fontWeight: 900,
          letterSpacing: '1.5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        <span style={{ display: 'inline-block', animation: 'teleprompter-pulse 1.1s infinite' }}>●</span>
        {label}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: '#e8fbff',
          fontSize: '0.82rem',
          letterSpacing: '0.02em',
        }}
      >
        {isLoading && !displayed ? (
          <span style={{ color: 'var(--arena-cyan, #00e5e5)', fontStyle: 'italic' }}>Chester is crunching the numbers...</span>
        ) : (
          <>
            {displayed}
            {displayed.length < text.length && <span className="live-teleprompter__cursor">▌</span>}
          </>
        )}
      </span>
      <style>{`
        @keyframes teleprompter-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .live-teleprompter__cursor {
          animation: teleprompter-pulse 0.8s steps(1) infinite;
        }
      `}</style>
    </div>
  );
}
