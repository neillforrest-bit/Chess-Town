'use client';

import React, { useState, useEffect, useRef } from 'react';
import { askGrandmaster } from '@/app/actions';
import dynamic from 'next/dynamic';

const DojoEngineNoSSR = dynamic(() => import('@/components/DojoEngine'), { ssr: false });
import Link from 'next/link';
import { ChesterAvatar } from '@/components/ChesterUI';

export default function MeetChester() {
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'chester', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<{ mode: string, title: string } | null>(null);

  // 3. Interactive Onboarding Sequence
  useEffect(() => {
    // Introduction Trigger
    const introSequence = async () => {
      setIsThinking(true);
      
      try {
        const payload = JSON.stringify({
            message: "Introduce yourself to the user as Chester, the wildly witty AI engine of Chess-Town. Describe the app perfectly: a live chess arena where I grade your moves and violently roast your blunders in real time. DO NOT BE BORING. Be a hilarious, sarcastic jester horse. Write exactly 2-3 punchy, hilarious sentences."
        });
        const dynamicIntro = await askGrandmaster(payload);
        
        setChatMessages([
          { role: 'chester', text: dynamicIntro }
        ]);
      } catch (e) {
          setChatMessages([
            { role: 'chester', text: "Hello. I am Chester, the tactical soul of Chess-Town. I watch, I judge, and occasionally, I roast. Welcome to the Arena where I will evaluate your skills." }
          ]);
      }
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

    
  if (gameState) {
    return (
      <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
        <DojoEngineNoSSR mode={gameState.mode} difficulty="CASUAL" />
      </div>
    );
  }

  return (

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      height: 'calc(100vh - 80px)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
        animation: 'fade-in 1s ease-out'
      }}>
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            transform: isThinking ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
            <ChesterAvatar isThinking={isThinking} size="large" />
        </div>
        <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            margin: 0, 
            fontFamily: 'Georgia, serif',
            fontWeight: 900,
            letterSpacing: '4px',
            textShadow: '0 0 20px var(--arena-pink)',
            color: 'var(--arena-paper)'
        }}>
           MEET CHESTER
        </h1>
        <p style={{ color: 'var(--arena-cyan)', marginTop: '0.5rem', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold' }}>
            THE ENGINE WATCHING YOUR EVERY MOVE.
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '800px',
        background: 'linear-gradient(135deg, rgba(0,229,229,0.05), rgba(5,7,8,0.95) 20%, rgba(255,43,136,0.1))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,43,136,0.4)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,43,136,0.1)',
        height: '55vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Background Floating Chess Theme */}
        <div className="floating-chess-piece" style={{ left: '10%', animationDelay: '0s' }}>♞</div>
        <div className="floating-chess-piece" style={{ left: '85%', animationDelay: '2s' }}>♚</div>
        <div className="floating-chess-piece" style={{ left: '25%', animationDelay: '5s' }}>♛</div>
        <div className="floating-chess-piece" style={{ left: '70%', animationDelay: '7s' }}>♝</div>
        <div className="floating-chess-piece" style={{ left: '40%', animationDelay: '10s' }}>♜</div>
        <div className="floating-chess-piece" style={{ left: '60%', animationDelay: '12s' }}>♞</div>
        
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
          <Link href="/arena" style={{
            color: 'var(--arena-cyan)',
            textDecoration: 'none',
            fontWeight: 'bold',
            letterSpacing: '1px',
            fontFamily: 'Georgia, serif',
            fontSize: '0.8rem',
            padding: '0.5rem 1rem',
            border: '1px solid var(--arena-cyan)',
            borderRadius: '4px',
            background: 'rgba(0,229,229,0.1)',
            transition: 'all 0.2s',
          }}>
            ← THE ARENA
          </Link>
        </div>

        <div ref={scrollRef} style={{ flex: 1, padding: '2rem', paddingTop: '3.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', scrollBehavior: 'smooth', position: 'relative', zIndex: 2 }}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              background: msg.role === 'user' ? 'rgba(0, 229, 229, 0.1)' : 'rgba(255, 43, 136, 0.1)',
              borderLeft: msg.role === 'chester' ? '4px solid var(--arena-pink)' : 'none',
              borderRight: msg.role === 'user' ? '4px solid var(--arena-cyan)' : 'none',
              borderTop: `1px solid ${msg.role === 'user' ? 'rgba(0, 229, 229, 0.2)' : 'rgba(255, 43, 136, 0.2)'}`,
              borderBottom: `1px solid ${msg.role === 'user' ? 'rgba(0, 229, 229, 0.2)' : 'rgba(255, 43, 136, 0.2)'}`,
              lineHeight: 1.6,
              fontSize: '1.05rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              position: 'relative',
              animation: 'slide-up 0.4s ease-out'
            }}>
              <b style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '2px', color: msg.role === 'user' ? 'var(--arena-cyan)' : 'var(--arena-pink)', marginBottom: '0.5rem' }}>
                {msg.role === 'user' ? 'YOU' : 'CHESTER SYSTEM'}
              </b>
              <span style={{ color: 'var(--arena-paper)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{msg.text}</span>
            </div>
          ))}
          {isThinking && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--arena-pink)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
              <div style={{ color: 'var(--arena-pink)', fontStyle: 'italic', fontSize: '0.9rem', letterSpacing: '1px' }}>
                Calculating response...
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255, 43, 136, 0.2)', background: 'rgba(5,7,8,0.8)', position: 'relative', zIndex: 2 }}>
                      {chatMessages.length > 0 && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ color: 'var(--arena-gold)', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚡ SELECT YOUR CHALLENGE</span>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--arena-gold), transparent)' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  <button
                    onClick={() => setGameState({mode: 'COACH_OPENING', title: 'You vs. Chester'})}
                    style={{ background: 'rgba(0,229,229,0.1)', border: '1px solid var(--arena-cyan)', textAlign: 'left', padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(0,229,229,0.15)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,229,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,229,229,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <b style={{ display: 'block', color: 'var(--arena-paper)', fontSize: '0.9rem', marginBottom: '0.4rem', fontFamily: 'Georgia, serif' }}>1. Chester Coach (RECOMMENDED)</b>
                    <span style={{ color: 'var(--arena-cyan)', fontSize: '0.75rem', lineHeight: 1.4, display: 'block' }}>Play a full game. I will grade your moves live and violently roast your blunders.</span>
                  </button>

                  <button
                    onClick={() => setGameState({mode: 'COACH_DAILY', title: 'Daily Breakthrough'})}
                    style={{ background: 'rgba(255,43,136,0.1)', border: '1px solid var(--arena-pink)', textAlign: 'left', padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,43,136,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,43,136,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <b style={{ display: 'block', color: 'var(--arena-paper)', fontSize: '0.9rem', marginBottom: '0.4rem', fontFamily: 'Georgia, serif' }}>2. Daily Tactical Puzzle</b>
                    <span style={{ color: 'var(--arena-pink)', fontSize: '0.75rem', lineHeight: 1.4, display: 'block' }}>Drop into a critical mid-game position. One scenario, one score. Prove your vision.</span>
                  </button>
                  
                  <button
                    onClick={() => setGameState({mode: '2V2', title: 'Heroes vs. Villains Tag Match'})}
                    style={{ background: 'rgba(124,255,69,0.1)', border: '1px solid var(--arena-acid)', textAlign: 'left', padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', gridColumn: '1 / -1' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,255,69,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,255,69,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <b style={{ display: 'block', color: 'var(--arena-paper)', fontSize: '0.9rem', marginBottom: '0.4rem', fontFamily: 'Georgia, serif' }}>3. 2v2 Tag-Team Chaos</b>
                    <span style={{ color: 'var(--arena-acid)', fontSize: '0.75rem', lineHeight: 1.4, display: 'block' }}>Watch or join a live tag-team match where players alternate moves. Absolute carnage.</span>
                  </button>
                </div>
             </div>
           )}

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Query the engine..."
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(238, 252, 255, 0.1)',
                borderBottom: '2px solid var(--arena-cyan)',
                borderRadius: '4px',
                padding: '1rem 1.25rem',
                color: 'var(--arena-paper)',
                fontFamily: 'inherit',
                outline: 'none',
                fontSize: '1.05rem',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--arena-pink)'}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = 'var(--arena-cyan)'}
            />
            <button 
              type="submit" 
              disabled={isThinking || !chatInput.trim()}
              className="command-play"
              style={{
                border: 'none',
                borderRadius: '4px',
                padding: '0 2rem',
                fontSize: '1rem',
                letterSpacing: '2px',
                cursor: isThinking || !chatInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isThinking || !chatInput.trim() ? 0.4 : 1,
                transition: 'all 0.3s'
              }}
            >
              SEND
            </button>
          </form>
          {chatError && <div style={{ color: 'var(--arena-pink)', fontSize: '0.85rem', marginTop: '0.8rem', letterSpacing: '1px' }}>{chatError}</div>}
        </div>
      </div>
    </div>
  );
}
