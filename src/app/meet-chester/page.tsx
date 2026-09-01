'use client';

import React, { useState, useEffect, useRef } from 'react';
import { askGrandmaster } from '@/app/actions';
import Link from 'next/link';
import { ChesterAvatar } from '@/components/ChesterUI';

export default function MeetChester() {
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'chester', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 3. Interactive Onboarding Sequence
  useEffect(() => {
    // Introduction Trigger
    const introSequence = async () => {
      setIsThinking(true);
      await new Promise(r => setTimeout(r, 1500));
      setChatMessages([
        { role: 'chester', text: "Hello. I am Chester, the tactical soul of Chess-Town. I watch, I judge, and occasionally, I roast. Do you want me to explain the Coaching Lab or jump straight into a challenge?" }
      ]);
      setIsThinking(false);
    };
    introSequence();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isThinking]);

  const handleSendMessage = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const textMsg = typeof e === 'string' ? e : chatInput;
    if (!textMsg.trim() || isThinking) return;

    setChatMessages(prev => [...prev, { role: 'user', text: textMsg }]);
    setChatInput('');
    setIsThinking(true);
    setChatError('');

    try {
      const response = await askGrandmaster(`The user says: "${textMsg}". You are Chester, a witty, judgmental chess AI. Keep your response under 3 sentences. Provide a brief guided interactive explanation if they asked for a tour, or act accordingly.`);
      setChatMessages(prev => [...prev, { role: 'chester', text: response }]);
    } catch (err) {
      setChatError('Lost connection to Chester...');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: '#fff',
      padding: '2rem'
    }}>
      <div style={{
        position: 'absolute',
        top: '2rem',
        left: '2rem'
      }}>
        <Link href="/" style={{
          color: '#00ffff',
          textDecoration: 'none',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          ← BACK TO ARENA
        </Link>
      </div>

      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 0 15px #00ffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
           <ChesterAvatar isThinking={isThinking} />
           MEET CHESTER
        </h1>
        <p style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '1.2rem' }}>The engine watching your every move.</p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        height: '60vh',
        overflow: 'hidden'
      }}>
        <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              background: msg.role === 'user' ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 234, 0, 0.15)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 234, 0, 0.3)'}`,
              lineHeight: 1.5,
              fontSize: '1rem'
            }}>
              <b style={{ display: 'block', fontSize: '0.8rem', color: msg.role === 'user' ? '#00ffff' : '#ffea00', marginBottom: '0.4rem' }}>
                {msg.role === 'user' ? 'YOU' : 'CHESTER'}
              </b>
              {msg.text}
            </div>
          ))}
          {isThinking && (
            <div style={{ alignSelf: 'flex-start', color: '#ffea00', fontStyle: 'italic', padding: '0.5rem' }}>
              Chester is typing...
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.5)' }}>
           {chatMessages.length === 1 && chatMessages[0].role === 'chester' && (
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleSendMessage("Explain the Coaching Lab.")}
                  style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid #00ffff', color: '#fff', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer' }}
                >
                  Explain Coaching Lab
                </button>
                <button
                  onClick={() => handleSendMessage("Let's jump into a challenge.")}
                  style={{ background: 'rgba(255,234,0,0.1)', border: '1px solid #ffea00', color: '#fff', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer' }}
                >
                  Jump into Challenge
                </button>
             </div>
           )}

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask Chester anything..."
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '0.8rem',
                color: '#fff',
                fontFamily: 'inherit',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            <button 
              type="submit" 
              disabled={isThinking || !chatInput.trim()}
              style={{
                background: '#ffea00',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '0 1.5rem',
                fontWeight: 'bold',
                cursor: isThinking || !chatInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isThinking || !chatInput.trim() ? 0.5 : 1,
                fontSize: '1rem'
              }}
            >
              SEND
            </button>
          </form>
          {chatError && <div style={{ color: '#ff007f', fontSize: '0.8rem', marginTop: '0.5rem' }}>{chatError}</div>}
        </div>
      </div>
    </div>
  );
}
