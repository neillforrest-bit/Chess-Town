'use client';
import React, { useRef, useEffect, useState } from 'react';
import { askChesterChat } from '@/app/actions';
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
      <ChesterAvatar isThinking={isThinking} />
      <div ref={messageRef} className="chester-teleprompter__message max-h-40 overflow-y-auto" style={{
        flex: 1,
        fontFamily: 'sans-serif',
        fontSize: isMobile ? '1rem' : '0.9rem',
        letterSpacing: '0.03em',
        color: '#ffffff',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: 1.4,
        maxHeight: '10rem',
        overflowY: 'auto'
      }}>
        <span aria-label={emotion}>{CHESTER_EMOTIONS[emotion].emoji}</span>{' '}
        {isThinking ? <span style={{ color: 'var(--arena-pink)', fontStyle: 'italic' }}>Chester is calculating<span className="chester-typing-indicator" aria-label="Chester is typing">...</span></span> : message}
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
  isMobile,
  defaultExpanded
}: {
  chatMessages: { role: 'user' | 'chester'; text: string; education?: string; kind?: 'chat' | 'analysis' }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isThinking: boolean;
  chatError: string;
  isMobile?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? !isMobile);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, expanded]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [chatInput]);

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
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              }}>
                <b style={{ display: 'block', fontSize: '0.7rem', color: msg.role === 'user' ? 'var(--arena-cyan)' : 'var(--arena-pink)', marginBottom: '0.2rem' }}>
                  {msg.role === 'user' ? 'YOU' : 'CHESTER'}
                </b>
                {msg.role === 'chester' && msg.kind === 'analysis' ? (
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
              <textarea
                ref={inputRef}
                rows={1}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message Chester..."
                aria-label="Message Chester"
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: '2.4rem',
                  maxHeight: '120px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'none',
                  overflowY: 'auto'
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
                {isThinking ? <span className="chester-typing-indicator" aria-label="Chester is typing">...</span> : 'Send'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function ChessGameTools({ helpText, context = '' }: { helpText: string; context?: string }) {
  const [activePanel, setActivePanel] = useState<'chat' | 'help' | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'chester'; text: string; kind?: 'chat' }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || isTyping) return;
    setChatInput('');
    setChatError('');
    setChatMessages((current) => [...current, { role: 'user', text: message }]);
    setIsTyping(true);
    try {
      const reply = await askChesterChat(JSON.stringify({ type: 'chat', message, context }));
      setChatMessages((current) => [...current, { role: 'chester', text: reply, kind: 'chat' }]);
    } catch {
      setChatError('Chester is briefly off the board. Try again.');
      setChatInput(message);
    } finally {
      setIsTyping(false);
    }
  };

  return <>
    <div className="chess-game-tools" aria-label="Chess game tools">
      <button type="button" onClick={() => setActivePanel('chat')}>💬 Chat with Chester</button>
      <button type="button" onClick={() => setActivePanel('help')}>💡 Ask for Help</button>
    </div>
    {activePanel && <div className="chess-game-sheet" role="dialog" aria-modal="true" aria-label={activePanel === 'chat' ? 'Chat with Chester' : 'Chess help'}>
      <div className="chess-game-sheet__backdrop" onClick={() => setActivePanel(null)} />
      <section className="chess-game-sheet__content">
        <header><b>{activePanel === 'chat' ? 'CHAT WITH CHESTER' : "CHESTER'S HELP"}</b><button type="button" onClick={() => setActivePanel(null)} aria-label="Close">×</button></header>
        {activePanel === 'chat'
          ? <ChesterChatOverlay chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} onSendMessage={sendMessage} isThinking={isTyping} chatError={chatError} isMobile defaultExpanded />
          : <div className="chess-game-sheet__help"><p>{helpText}</p><button type="button" onClick={() => setActivePanel('chat')}>Ask Chester about this position</button></div>}
      </section>
    </div>}
  </>;
}
