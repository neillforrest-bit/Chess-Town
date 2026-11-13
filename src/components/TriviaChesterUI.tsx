'use client';
import React, { useRef, useEffect } from 'react';
import { CHESTER_EMOTIONS, getChesterEmotion } from '@/lib/chester-emotions';
import { useEngineEvaluation } from '@/components/EngineEvaluationProvider';

export function ChesterAvatar({ isThinking, size = 'default', trivia = false }: { isThinking: boolean, size?: 'small' | 'default' | 'large', trivia?: boolean }) {
  const sizeMap = {
    small: { w: '30px', h: '30px', font: '1rem' },
    default: { w: '40px', h: '40px', font: '1.4rem' },
    large: { w: '80px', h: '80px', font: '3rem' }
  };
  
  return (
    <div style={{
      width: sizeMap[size].w,
      height: sizeMap[size].h,
      borderRadius: '50%',
      border: `2px solid ${isThinking ? 'var(--arena-pink)' : 'var(--arena-cyan)'}`,
      boxShadow: `0 0 ${isThinking ? '20px' : '10px'} ${isThinking ? 'var(--arena-pink)' : 'var(--arena-cyan)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5,7,8,0.85)',
      animation: isThinking ? 'chester-glitch 0.4s infinite' : 'chester-float 4s ease-in-out infinite',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {isThinking && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent, rgba(255,43,136,0.4), transparent)',
          animation: 'chester-scan 1s linear infinite'
        }} />
      )}
      
        
      {trivia ? <svg aria-hidden="true" viewBox="0 0 64 64" style={{ width: '88%', height: '88%', zIndex: 10, overflow: 'visible', filter: 'drop-shadow(0 0 8px rgba(34,211,238,.55))' }}>
        <path d="M18 14 L25 4 L30 14 Z" fill="#ffd84d" />
        <path d="M28 13 L36 3 L41 15 Z" fill="#ff5ad9" />
        <circle cx="25" cy="4" r="3" fill="#22d3ee" />
        <circle cx="36" cy="3" r="3" fill="#ffd84d" />
        <path d="M17 22 C17 13 25 9 33 10 C43 11 51 20 50 31 C49 44 40 55 29 55 C20 55 14 48 14 38 C10 36 8 33 9 29 C10 25 13 23 17 22 Z" fill="#f8f1df" />
        <path d="M20 22 C18 15 24 10 32 11 C25 15 22 20 22 29 Z" fill="#22d3ee" opacity=".9" />
        <circle cx="35" cy="29" r="3" fill="#050708" />
        <path d="M42 39 C38 43 31 43 27 39" fill="none" stroke="#050708" strokeWidth="3" strokeLinecap="round" />
        <path d="M15 34 C11 35 10 39 13 42" fill="none" stroke="#050708" strokeWidth="3" strokeLinecap="round" />
      </svg> : <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', zIndex: 10 }}>
        <span style={{ fontSize: size === 'large' ? '4rem' : size === 'small' ? '1.5rem' : '2.5rem', lineHeight: 1, position: 'absolute', bottom: size === 'large' ? '-5px' : '0', animation: isThinking ? 'jester-talk 0.3s infinite ease-in-out' : 'jester-bounce 3s infinite ease-in-out', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))' }}>🐴</span>
        <span style={{ fontSize: size === 'large' ? '2.5rem' : size === 'small' ? '1rem' : '1.5rem', position: 'absolute', top: size === 'large' ? '-10px' : '-5px', left: size === 'large' ? '12px' : '5px', transform: 'rotate(-15deg)', animation: isThinking ? 'jester-bell 0.2s infinite' : 'jester-bell 2s infinite ease-in-out', filter: 'drop-shadow(0 0 8px var(--arena-pink))' }}>🃏</span>
      </div>}


    </div>
  );
}

export function ChesterTeleprompter({ text, isThinking, isMobile, trivia = false }: { text: string, isThinking: boolean, isMobile?: boolean, trivia?: boolean }) {
  const engineEvaluation = useEngineEvaluation();
  const messageRef = useRef<HTMLDivElement>(null);
  const message = text.replace(/^🎙️ CHESTER:\s*/, '');
  const emotion = isThinking ? 'thinking' : getChesterEmotion(message);

  useEffect(() => {
    const container = messageRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [message, isThinking, engineEvaluation]);

  return (
    <div className="chester-teleprompter" style={{
      width: '100%',
      background: 'rgba(10, 5, 20, 0.65)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 229, 229, 0.3)',
      borderRadius: '12px',
      padding: isMobile ? '0.9rem' : '1rem',
      display: 'flex',
      gap: isMobile ? '0.9rem' : '1rem',
      alignItems: 'flex-start',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      boxSizing: 'border-box'
    }}>
      <ChesterAvatar isThinking={isThinking} trivia={trivia} />
      <div ref={messageRef} className="chester-teleprompter__message max-h-48 overflow-y-auto" style={{
        flex: '1 1 auto',
        fontFamily: 'sans-serif',
        fontSize: isMobile ? '1rem' : '0.9rem',
        letterSpacing: '0.03em',
        color: '#ffffff',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: 1.4,
        maxHeight: '12rem',
        overflowY: 'auto'
      }}>
        {!trivia && <><span aria-label={emotion}>{CHESTER_EMOTIONS[emotion].emoji}</span>{' '}</>}
        {isThinking ? <span style={{ color: 'var(--arena-pink)', fontStyle: 'italic' }}>Chester is calculating<span className="chester-typing-indicator" aria-label="Chester is typing">...</span></span> : message}
        {engineEvaluation && <div style={{ color: 'var(--arena-cyan)', fontSize: '0.75em', marginTop: '0.35rem' }}>ENGINE {engineEvaluation.evalScore ?? '...'} · BEST {engineEvaluation.bestMove.san || engineEvaluation.bestMove.uci || '...'}</div>}
      </div>
    </div>
  );
}
