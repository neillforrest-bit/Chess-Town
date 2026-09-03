'use client';
import { useEffect, useState } from 'react';

export type GazetteResult = 'checkmate' | 'draw' | 'resigned';

type GazetteApiResponse = {
  dispatch?: string;
  isFallback?: boolean;
  error?: string;
};

const RESULT_HEADLINES: Record<GazetteResult, string> = {
  checkmate: 'CHECKMATE DECLARED!',
  draw: 'HONOURABLE DRAW DECLARED!',
  resigned: 'RESIGNATION TENDERED!',
};

export default function PostGameGazette({
  pgn,
  result,
  playerColor = 'w',
  onClose,
}: {
  pgn: string;
  result: GazetteResult;
  playerColor?: 'w' | 'b';
  onClose?: () => void;
}) {
  const [dispatch, setDispatch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copyLabel, setCopyLabel] = useState('COPY DISPATCH');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/gazette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgn, result, playerColor }),
          signal: AbortSignal.timeout(15_000),
        });
        const data = (await response.json()) as GazetteApiResponse;
        if (cancelled) return;
        setDispatch(data.dispatch || 'The Gazette printing press has jammed. Please check back for the next edition.');
      } catch {
        if (!cancelled) setDispatch('The Gazette printing press has jammed. Please check back for the next edition.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pgn, result, playerColor]);

  const copyDispatch = async () => {
    try {
      await navigator.clipboard.writeText(dispatch);
      setCopyLabel('COPIED!');
      setTimeout(() => setCopyLabel('COPY DISPATCH'), 1800);
    } catch {
      setCopyLabel('COPY FAILED');
      setTimeout(() => setCopyLabel('COPY DISPATCH'), 1800);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chess-Town Gazette dispatch"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(5, 0, 10, 0.82)',
        backdropFilter: 'blur(6px)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 480px)',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: '#f4ecd8',
          color: '#1a1208',
          border: '3px solid #1a1208',
          borderRadius: '6px',
          padding: '1.5rem',
          fontFamily: 'Georgia, "Times New Roman", serif',
          boxShadow: '0 0 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '3px double #1a1208', paddingBottom: '0.6rem', marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase' }}>Est. 1826 · One Penny</div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '1px' }}>The Chess-Town Gazette</h2>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{RESULT_HEADLINES[result]}</div>
        </div>

        {isLoading ? (
          <div aria-label="Loading dispatch" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {[100, 100, 80].map((width, index) => (
              <div
                key={index}
                style={{
                  width: `${width}%`,
                  height: '0.9rem',
                  borderRadius: '3px',
                  background: 'linear-gradient(90deg, #ddd2b8 25%, #ece3cb 37%, #ddd2b8 63%)',
                  backgroundSize: '400% 100%',
                  animation: 'gazette-skeleton 1.4s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '1rem', lineHeight: 1.55, margin: 0, textAlign: 'justify' }}>{dispatch}</p>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
          <button
            onClick={copyDispatch}
            disabled={isLoading || !dispatch}
            style={{
              flex: 1,
              padding: '0.65rem',
              border: '2px solid #1a1208',
              background: isLoading ? '#c9bd9c' : '#1a1208',
              color: isLoading ? '#5a4f36' : '#f4ecd8',
              fontWeight: 900,
              letterSpacing: '1px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
            }}
          >
            {copyLabel}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '0.65rem 1rem',
                border: '2px solid #1a1208',
                background: 'transparent',
                color: '#1a1208',
                fontWeight: 900,
                letterSpacing: '1px',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes gazette-skeleton {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
