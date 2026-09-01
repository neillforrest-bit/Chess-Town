'use client';
import React, { useRef, useEffect, useState } from 'react';

export function ChesterAvatar({ isThinking }: { isThinking: boolean }) {
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: `2px solid ${isThinking ? '#ff007f' : '#00ffff'}`,
      boxShadow: `0 0 10px ${isThinking ? '#ff007f' : '#00ffff'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      animation: isThinking ? 'pulse 1.2s infinite' : 'none',
      flexShrink: 0
    }}>
      <span style={{ fontSize: '1.4rem', color: isThinking ? '#ff007f' : '#00ffff', textShadow: `0 0 5px ${isThinking ? '#ff007f' : '#00ffff'}` }}>
        ♞
      </span>
    </div>
  );
}

export function ChesterTeleprompter({ text, isThinking }: { text: string, isThinking: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'clamp(300px, 50vw, 700px)',
      background: 'rgba(10, 5, 20, 0.65)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      <ChesterAvatar isThinking={isThinking} />
      <div style={{ 
        flex: 1,
        fontFamily: 'sans-serif',
        fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
        letterSpacing: '0.05em',
        color: '#ffffff',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: 1.4
      }}>
        {isThinking ? <span style={{ color: '#ffea00', fontStyle: 'italic' }}>Chester is calculating...</span> : text.replace(/^🎙️ CHESTER:\s*/, '')}
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
  chatError
}: {
  chatMessages: { role: 'user' | 'chester'; text: string }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isThinking: boolean;
  chatError: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, expanded]);

  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      right: '1rem',
      width: expanded ? 'clamp(300px, 30vw, 400px)' : 'auto',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 234, 0, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 100,
      transition: 'width 0.3s ease',
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
          background: 'rgba(255, 234, 0, 0.1)',
          borderBottom: expanded ? '1px solid rgba(255, 234, 0, 0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChesterAvatar isThinking={isThinking} />
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', color: '#ffea00' }}>CHESTER CHAT</span>
        </div>
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▲</span>
      </div>

      {expanded && (
        <>
          <div ref={scrollRef} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '35vh', overflowY: 'auto' }}>
            {chatMessages.length === 0 && (
              <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center' }}>No messages yet...</div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: msg.role === 'user' ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 234, 0, 0.15)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 234, 0, 0.3)'}`,
                lineHeight: 1.4,
                fontSize: '0.9rem'
              }}>
                <b style={{ display: 'block', fontSize: '0.7rem', color: msg.role === 'user' ? '#00ffff' : '#ffea00', marginBottom: '0.2rem' }}>
                  {msg.role === 'user' ? 'YOU' : 'CHESTER'}
                </b>
                {msg.text}
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
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={isThinking || !chatInput.trim()}
                style={{
                  background: '#ffea00',
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
