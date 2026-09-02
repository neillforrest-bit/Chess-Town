'use client';
import React, { useRef, useEffect, useState } from 'react';
import { CHESTER_EMOTIONS, getChesterEmotion } from '@/lib/chester-emotions';
import { useEngineEvaluation } from '@/components/EngineEvaluationProvider';

export function ChesterAvatar({ isThinking, size = 'default' }: { isThinking: boolean, size?: 'small' | 'default' | 'large' }) {
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
      
        
      {/* Cartoon Horse Jester Mask */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', zIndex: 10 }}>
        {/* Horse Head */}
        <span style={{ 
          fontSize: size === 'large' ? '4rem' : size === 'small' ? '1.5rem' : '2.5rem', 
          lineHeight: 1, 
          position: 'absolute', 
          bottom: size === 'large' ? '-5px' : '0',
          animation: isThinking ? 'jester-talk 0.3s infinite ease-in-out' : 'jester-bounce 3s infinite ease-in-out',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))'
        }}>
          🐴
        </span>
        {/* Jester Hat attached to head */}
        <span style={{ 
          fontSize: size === 'large' ? '2.5rem' : size === 'small' ? '1rem' : '1.5rem', 
          position: 'absolute', 
          top: size === 'large' ? '-10px' : '-5px',
          left: size === 'large' ? '12px' : '5px',
          transform: 'rotate(-15deg)',
          animation: isThinking ? 'jester-bell 0.2s infinite' : 'jester-bell 2s infinite ease-in-out',
          filter: 'drop-shadow(0 0 8px var(--arena-pink))'
        }}>
          🃏
        </span>
      </div>


    </div>
  );
}

export function ChesterTeleprompter({ text, isThinking, isMobile }: { text: string, isThinking: boolean, isMobile?: boolean }) {
  const engineEvaluation = useEngineEvaluation();
  const message = text.replace(/^🎙️ CHESTER:\s*/, '');
  const emotion = isThinking ? 'thinking' : getChesterEmotion(message);
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
      <ChesterAvatar isThinking={isThinking} />
      <div className="chester-teleprompter__message" style={{
        flex: 1,
        fontFamily: 'sans-serif',
        fontSize: isMobile ? '1rem' : '0.9rem',
        letterSpacing: '0.03em',
        color: '#ffffff',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: 1.4,
        maxHeight: isMobile ? 'none' : '150px',
        overflowY: isMobile ? 'visible' : 'auto'
      }}>
        <span aria-label={emotion}>{CHESTER_EMOTIONS[emotion].emoji}</span>{' '}
        {isThinking ? <span style={{ color: 'var(--arena-pink)', fontStyle: 'italic' }}>Chester is calculating...</span> : message}
        {engineEvaluation && <div style={{ color: 'var(--arena-cyan)', fontSize: '0.75em', marginTop: '0.35rem' }}>ENGINE {engineEvaluation.evalScore ?? '...'} · BEST {engineEvaluation.bestMove.san || engineEvaluation.bestMove.uci || '...'}</div>}
      </div>
    </div>
  );
}

export function ChesterChatOverlay({
  chatMessages,
  chatInput,
  setChatInput,
  onSendMessage,
  isThinking,
  chatError,
  isMobile
}: {
  chatMessages: { role: 'user' | 'chester'; text: string; education?: string }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isThinking: boolean;
  chatError: string;
  isMobile?: boolean;
}) {
  const [expanded, setExpanded] = useState(!isMobile);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, expanded]);

  return (
    <div className="chester-chat" style={{
      width: '100%',
      flex: expanded ? 1 : 'none',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 43, 136, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 100,
      transition: 'height 0.3s ease',
      color: '#fff',
      overflow: 'hidden'
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'rgba(255, 43, 136, 0.1)',
          borderBottom: expanded ? '1px solid rgba(255, 43, 136, 0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChesterAvatar isThinking={isThinking} />
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', color: 'var(--arena-pink)' }}>CHESTER CHAT</span>
        </div>
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▲</span>
      </div>

      {expanded && (
        <>
          <div ref={scrollRef} style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto' }}>
            {chatMessages.length === 0 && (
              <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center' }}>No messages yet...</div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: msg.role === 'user' ? 'rgba(0, 229, 229, 0.15)' : 'rgba(255, 43, 136, 0.15)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0, 229, 229, 0.3)' : 'rgba(255, 43, 136, 0.3)'}`,
                lineHeight: 1.4,
                fontSize: '0.9rem'
              }}>
                <b style={{ display: 'block', fontSize: '0.7rem', color: msg.role === 'user' ? 'var(--arena-cyan)' : 'var(--arena-pink)', marginBottom: '0.2rem' }}>
                  {msg.role === 'user' ? 'YOU' : 'CHESTER'}
                </b>
                {msg.role === 'chester' ? (
                  <>
                    <div style={{ background: 'rgba(255, 43, 136, 0.12)', borderLeft: '3px solid var(--arena-pink)', padding: '0.45rem 0.55rem', borderRadius: '0 5px 5px 0' }}>
                      {msg.text}
                    </div>
                    {msg.education && (
                      <details style={{ marginTop: '0.55rem', color: '#d9ffff' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--arena-cyan)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.06em' }}>COACH&apos;S NOTES</summary>
                        <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', lineHeight: 1.45 }}>{msg.education}</p>
                      </details>
                    )}
                  </>
                ) : msg.text}
              </div>
            ))}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {chatError && <div style={{ color: '#ff007f', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{chatError}</div>}
            <form onSubmit={onSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message Chester..."
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={isThinking || !chatInput.trim()}
                style={{
                  background: 'var(--arena-pink)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  fontWeight: 'bold',
                  cursor: isThinking || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: isThinking || !chatInput.trim() ? 0.5 : 1
                }}
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
