// @ts-nocheck
'use client'; 

import dynamic from 'next/dynamic'; 
import { useState, useEffect } from 'react';
import { askGrandmaster } from '@/app/actions';

const DojoEngineNoSSR = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

type SceneState = 'SPLASH' | 'INTRO' | 'LEAGUE' | 'GAME';

const INTRO_SCRIPT = [
  "🎙️ COMMISSIONER CHESTER ONLINE! 🏆\n\nWelcome to the Concord High School Chess League — where fantasy football competition meets the 64-square grid!",
  "🎙️ Behold our power hierarchy: 👑 Z-Man sits on the throne as League King, 🦸‍♂️ Brendan reigns as our heroic tactical ace, and 🦹‍♂️ Gabe schemes in the shadows as our sinister League Villain!",
  "🎙️ WE ARE ALSO INTRODUCING: The world's first on-demand 2v2 Tag-Team Online Chess! Any league member can challenge any duo at any time to alternate half-moves and share telemetry!",
  "🎙️ For this beta preview, launch a live Matchup and click the 'INITIATE GEMINI DEMO' button to watch the AI engine power a full game with real-time esports commentary. \n\nSMASH ENTER TO VIEW THE LEAGUE."
];

const LEAGUE_STANDINGS = [
  { rank: 1, name: "Z-Man 👑", handle: "@zman", w: 10, l: 1, pts: 20, streak: "W6", status: "LEAGUE KING" },
  { rank: 2, name: "Brendan 🦸‍♂️", handle: "@brendan", w: 9, l: 2, pts: 18, streak: "W4", status: "LEAGUE HERO" },
  { rank: 3, name: "Gabe 🦹‍♂️", handle: "@gabe", w: 8, l: 3, pts: 16, streak: "W2", status: "LEAGUE VILLAIN" },
  { rank: 4, name: "Neill", handle: "@neill", w: 8, l: 3, pts: 16, streak: "L1", status: "PLAYOFF CONTENDER" },
  { rank: 5, name: "Sam", handle: "@sam", w: 7, l: 4, pts: 14, streak: "W1", status: "BUBBLE SEED" },
  { rank: 6, name: "Sean", handle: "@sean", w: 6, l: 5, pts: 12, streak: "L2", status: "BUBBLE SEED" },
  { rank: 7, name: "Jay", handle: "@jay", w: 6, l: 5, pts: 12, streak: "W1", status: "IN HUNT" },
  { rank: 8, name: "Aidan", handle: "@aidan", w: 5, l: 6, pts: 10, streak: "L1", status: "IN HUNT" },
  { rank: 9, name: "Will", handle: "@will", w: 5, l: 6, pts: 10, streak: "W1", status: "IN HUNT" },
  { rank: 10, name: "Andrew", handle: "@andrew", w: 4, l: 7, pts: 8, streak: "L3", status: "ELIMINATED" },
  { rank: 11, name: "Danny", handle: "@danny", w: 3, l: 8, pts: 6, streak: "L4", status: "ELIMINATED" },
  { rank: 12, name: "Kairee", handle: "@kairee", w: 1, l: 10, pts: 2, streak: "L6", status: "RELEGATION" },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [scene, setScene] = useState<SceneState>('SPLASH');
  const [pageIndex, setPageIndex] = useState(0);
  const [displayedIntro, setDisplayedIntro] = useState('');
  
  const [activeMatchup, setActiveMatchup] = useState('');
  const [gameMode, setGameMode] = useState('STANDBY');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hostBanter, setHostBanter] = useState("🎙️ CHESTER: Arena loaded. Click initiate to start simulation.");
  
  const [leagueView, setLeagueView] = useState<'STANDINGS' | 'MATCHUPS' | '2V2' | 'PLAYOFFS'>('STANDINGS');
  const [demoActiveUI, setDemoActiveUI] = useState(false); 

  useEffect(() => {
    if (!isMounted) return;
    if (scene === 'SPLASH') {
      const timer = setTimeout(() => setScene('INTRO'), 3500);
      return () => clearTimeout(timer);
    }
  }, [scene, isMounted]);

  useEffect(() => {
    if (scene === 'INTRO') {
      let i = 0; setDisplayedIntro(''); 
      const targetText = INTRO_SCRIPT[pageIndex];
      const typing = setInterval(() => {
        if (i < targetText.length) { setDisplayedIntro((prev) => prev + targetText.charAt(i)); i++; } 
        else { clearInterval(typing); }
      }, 15); 
      return () => clearInterval(typing);
    }
  }, [scene, pageIndex]);

  useEffect(() => {
    if (scene !== 'GAME') return;
    
    const handleBanter = (e: any) => {
      setHostBanter(e.detail);
    };

    const handleDemoComplete = () => {
      setDemoActiveUI(false);
    };

    window.addEventListener('dojo-banter', handleBanter);
    window.addEventListener('demo-complete', handleDemoComplete);
    
    return () => {
      window.removeEventListener('dojo-banter', handleBanter);
      window.removeEventListener('demo-complete', handleDemoComplete);
    };
  }, [scene]);

  const loadArena = (mode: string, matchTitle: string) => {
    setDemoActiveUI(false);
    setActiveMatchup(matchTitle);
    setGameMode(mode);
    setScene('GAME');
    
    setTimeout(() => {
      setHostBanter(`⚡ ARENA LOCKED: ${matchTitle}\n\nClick the INITIATE button below to start the live simulation.`);
      window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode: mode, isFlipped: false } }));
      setDrawerOpen(true);
    }, 400);
  };

  const startAiDemo = () => {
    setDemoActiveUI(true);
    window.dispatchEvent(new CustomEvent('start-demo'));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking || demoActiveUI) return;
    const userQuery = chatInput;
    setChatInput('');
    setIsThinking(true);
    setHostBanter(`YOU: "${userQuery}"\n\n...Chester transmitting to league feed...`);

    try {
      const safePayload = JSON.stringify({ message: String(userQuery), context: `Matchup: ${activeMatchup}`, ply: 0 });
      const aiResponse = await askGrandmaster(safePayload);
      setHostBanter(`🎙️ CHESTER: ${aiResponse}`);
    } catch {
      setHostBanter(`🎙️ CHESTER: Tactical grid overload!`);
    }
    setIsThinking(false);
  };

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: '#0c0017', color: 'white', fontFamily: 'Comic Sans MS, sans-serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {scene === 'SPLASH' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#05000a', position: 'relative' }}>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(0,255,255,0.1)_2px,transparent_2px)] bg-[size:35px_35px] opacity-35"></div>
          <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(5rem, 10vw, 10rem)', animation: 'bounce 2s infinite' }}>👑</div>
            <h1 style={{ fontSize: 'clamp(3rem, 7vw, 7rem)', fontWeight: 900, color: '#00ffff', textShadow: '0 0 35px rgba(0,255,255,1)', letterSpacing: '6px', marginTop: '1rem', textTransform: 'uppercase' }}>CHESS TOWN</h1>
            <p style={{ fontSize: 'clamp(1.2rem, 2.5vw, 2.2rem)', color: '#ffea00', backgroundColor: '#000', padding: '0.8rem 2.5rem', borderRadius: '30px', border: '4px solid #ffea00', marginTop: '1.5rem', fontWeight: 900 }}>CONCORD HIGH CHESS LEAGUE</p>
          </div>
        </div>
      )}

      {scene === 'INTRO' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 2vw, 2rem)' }}>
          <div style={{ width: '100%', maxWidth: '1400px', backgroundColor: '#000', border: 'clamp(8px, 1.5vw, 16px) solid #00ffff', borderRadius: '40px', padding: 'clamp(1.5rem, 3vw, 4rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 100px rgba(0,255,255,0.4)' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3.5rem)', color: '#00ffff', textTransform: 'uppercase', borderBottom: '10px solid rgba(0,255,255,0.4)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900 }}>
              <span>COMMISSIONER CHESTER</span>
              <span style={{ backgroundColor: '#ffea00', color: '#000', padding: '0.5rem 1.5rem', borderRadius: '50px', fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)' }}>SEASON 1 LIVE</span>
            </h2>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
              <p style={{ fontSize: 'clamp(1.4rem, 3vw, 3.2rem)', color: '#00ffff', fontWeight: 900, lineHeight: 1.4, textShadow: '0 0 20px rgba(0,255,255,0.8)', margin: 0 }}>
                {displayedIntro}<span className="inline-block w-[2vw] h-[4vw] ml-3 bg-[#00ffff] animate-pulse align-middle"></span>
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              {pageIndex < INTRO_SCRIPT.length - 1 ? (
                <button onClick={() => setPageIndex(p => p + 1)} style={{ backgroundColor: '#ffea00', color: '#000', fontSize: 'clamp(1.8rem, 3.5vw, 3.5rem)', fontWeight: 900, padding: 'clamp(0.8rem, 1.5vw, 1.8rem) clamp(2rem, 4vw, 4.5rem)', borderRadius: '50px', border: 'clamp(6px, 1vw, 10px) solid #000', boxShadow: '8px 8px 0px #000', cursor: 'pointer' }}>NEXT ⏩</button>
              ) : (
                <button onClick={() => setScene('LEAGUE')} style={{ backgroundColor: '#ff007f', color: '#fff', fontSize: 'clamp(1.8rem, 3.5vw, 3.5rem)', fontWeight: 900, padding: 'clamp(0.8rem, 1.5vw, 1.8rem) clamp(2rem, 4vw, 4.5rem)', borderRadius: '50px', border: 'clamp(6px, 1vw, 10px) solid #fff', boxShadow: '8px 8px 0px #fff', cursor: 'pointer' }}>ENTER LEAGUE 🏆</button>
              )}
            </div>
          </div>
        </div>
      )}

      {scene === 'LEAGUE' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(1rem, 2vw, 2.5rem)', position: 'relative', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 4rem)', color: '#ffea00', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 0 25px rgba(255,234,0,0.8)', margin: 0 }}>CONCORD HIGH CHESS LEAGUE</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setLeagueView('STANDINGS')} style={{ backgroundColor: leagueView === 'STANDINGS' ? '#00ffff' : '#111', color: leagueView === 'STANDINGS' ? '#000' : '#fff', border: '4px solid #00ffff', padding: '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>TABLE</button>
              <button onClick={() => setLeagueView('MATCHUPS')} style={{ backgroundColor: leagueView === 'MATCHUPS' ? '#ffea00' : '#111', color: leagueView === 'MATCHUPS' ? '#000' : '#fff', border: '4px solid #ffea00', padding: '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>WEEK 11 DEMO</button>
              <button onClick={() => setLeagueView('2V2')} style={{ backgroundColor: leagueView === '2V2' ? '#39ff14' : '#111', color: leagueView === '2V2' ? '#000' : '#fff', border: '4px solid #39ff14', padding: '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>2v2 TAG-TEAM</button>
            </div>
          </div>
          
          <div style={{ flex: 1, width: '100%', maxWidth: '1400px', display: 'flex', gap: '2rem', position: 'relative', alignItems: 'stretch', overflow: 'hidden' }}>
            <div style={{ flex: 2, backgroundColor: '#000', borderRadius: '35px', border: 'clamp(4px, 1vw, 8px) solid #00ffff', padding: '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,255,255,0.2)', overflowY: 'auto' }}>
              
              {leagueView === 'STANDINGS' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem' }}>
                    {LEAGUE_STANDINGS.map((team) => (
                      <div key={team.rank} style={{ display: 'grid', gridTemplateColumns: '0.5fr 2fr 1fr 1fr 1fr 1.5fr', alignItems: 'center', padding: '0.6rem 0.4rem', backgroundColor: team.rank <= 4 ? 'rgba(0,255,255,0.08)' : 'transparent', borderRadius: '10px', fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)', fontWeight: 700 }}>
                          <span style={{ color: team.rank <= 4 ? '#00ffff' : '#aaa', fontWeight: 900 }}>{team.rank}</span>
                          <span style={{ color: team.name.includes("Z-Man") ? '#ffea00' : (team.name.includes("Brendan") ? '#00ffff' : (team.name.includes("Gabe") ? '#ff007f' : '#fff')), fontWeight: 900 }}>{team.name}</span>
                          <span>{team.w}-{team.l}</span>
                          <span style={{ color: '#ffea00', fontWeight: 900 }}>{team.pts}</span>
                          <span style={{ color: team.streak.startsWith('W') ? '#39ff14' : '#ff007f' }}>{team.streak}</span>
                          <span style={{ textAlign: 'right', color: team.rank === 1 ? '#ffea00' : (team.rank === 2 ? '#00ffff' : (team.rank === 3 ? '#ff007f' : '#aaa')), fontSize: '0.85em', fontWeight: 900 }}>{team.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leagueView === 'MATCHUPS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ color: '#ffea00', fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)', margin: 0, fontWeight: 900 }}>WEEK 11 FEATURED SIMULATION</h3>
                  <div style={{ backgroundColor: '#1a0033', border: '4px solid #ffea00', borderRadius: '25px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 'clamp(1.4rem, 2vw, 2.2rem)', fontWeight: 900, color: '#fff' }}>Neill</div>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff007f' }}>VS</div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 'clamp(1.4rem, 2vw, 2.2rem)', fontWeight: 900, color: '#00ffff' }}>Brendan 🦸‍♂️</div>
                      </div>
                    </div>
                    <button onClick={() => loadArena('SIMULATION', 'Neill vs. Brendan 🦸‍♂️')} style={{ width: '100%', backgroundColor: '#00ffff', color: '#000', fontSize: 'clamp(1.1rem, 1.6vw, 1.6rem)', fontWeight: 900, padding: '0.8rem', borderRadius: '18px', border: '4px solid #000', cursor: 'pointer', textTransform: 'uppercase' }}>
                      ⚔️ ENTER MATCHUP ARENA
                    </button>
                  </div>
                </div>
              )}

              {leagueView === '2V2' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ color: '#39ff14', fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)', margin: 0, fontWeight: 900 }}>WORLD-FIRST 2v2 TAG-TEAM</h3>
                  <div style={{ backgroundColor: '#111', border: '3px solid #ff007f', borderRadius: '20px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ color: '#ffea00', fontWeight: 900, fontSize: '1.2rem' }}>THE ULTIMATE GRUDGE MATCH</span>
                    <div style={{ fontWeight: 800, fontSize: '1.5rem', color: '#00ffff' }}>[YOU + Brendan 🦸‍♂️] vs. [Gabe 🦹‍♂️ + Z-Man 👑]</div>
                    <button onClick={() => loadArena('2V2', 'Heroes vs. Villains Tag Match')} style={{ backgroundColor: '#ff007f', color: '#fff', fontSize: '1.2rem', fontWeight: 900, padding: '0.8rem 2rem', borderRadius: '15px', border: '4px solid #fff', cursor: 'pointer', marginTop: '1rem', width: '100%' }}>
                      🔥 ENTER 4-PLAYER ARENA
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '35px', border: 'clamp(4px, 1vw, 8px) solid #ff007f', padding: '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(255,0,127,0.25)' }}>
              <h3 style={{ color: '#ff007f', fontSize: 'clamp(1.2rem, 1.6vw, 1.8rem)', borderBottom: '2px solid #ff007f', paddingBottom: '0.8rem', marginBottom: '1rem', fontWeight: 900 }}>COMMISSIONER DESK</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <p style={{ fontSize: 'clamp(0.85rem, 1.1vw, 1.1rem)', color: '#ddd' }}><span style={{ color: '#ffea00' }}>[CROWN]</span> <b>Chester:</b> "Z-Man 👑 sits untouchable on the throne at 10-1!"</p>
                <p style={{ fontSize: 'clamp(0.85rem, 1.1vw, 1.1rem)', color: '#ddd' }}><span style={{ color: '#00ffff' }}>[HERO WATCH]</span> <b>Brendan 🦸‍♂️</b> moves into #2 with 9 wins!</p>
                <p style={{ fontSize: 'clamp(0.85rem, 1.1vw, 1.1rem)', color: '#ddd' }}><span style={{ color: '#ff007f' }}>[VILLAIN PLOT]</span> <b>Gabe 🦹‍♂️</b> locked into #3 after a ruthless upset!</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {scene === 'GAME' && (
        <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 2vw, 2rem)', gap: 'clamp(1rem, 2vw, 3rem)', backgroundColor: '#0a0014', boxSizing: 'border-box' }}>
          
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#000', border: '4px solid #00ffff', padding: '0.5rem 1rem', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 50 }}>
             <span style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)', color: '#fff', fontWeight: 900 }}>MATCH:</span>
             <span style={{ fontSize: 'clamp(0.9rem, 1.3vw, 1.4rem)', color: '#ffea00', fontWeight: 900 }}>{activeMatchup}</span>
          </div>

          <div style={{ width: drawerOpen ? '50%' : '100%', height: '100%', maxHeight: '95dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.3s', boxSizing: 'border-box' }}>
             <div style={{ height: '100%', aspectRatio: '1/1', backgroundColor: '#1a0033', border: 'clamp(8px, 1.5vw, 20px) solid #00ffff', borderRadius: '40px', padding: '1rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(0,255,255,0.3)', boxSizing: 'border-box' }}>
                <div id="phaser-game-container" style={{ width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden' }}>
                   <DojoEngineNoSSR mode={gameMode} />
                </div>
             </div>
          </div>

          {drawerOpen && (
            <div style={{ width: '50%', height: '100%', maxHeight: '95dvh', backgroundColor: '#000', border: 'clamp(8px, 1.5vw, 16px) solid #ffea00', borderRadius: '40px', padding: 'clamp(1.5rem, 3vw, 3rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 80px rgba(255,234,0,0.3)', boxSizing: 'border-box' }}>
              <div style={{ borderBottom: 'clamp(6px, 1vw, 12px) solid rgba(255,234,0,0.4)', paddingBottom: '1.2rem', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ color: '#ffea00', fontSize: 'clamp(1.8rem, 2.5vw, 3.5rem)', fontWeight: 900, lineHeight: 1, margin: 0 }}>CHESTER // LIVE COMMS</h2>
                <button onClick={() => setScene('LEAGUE')} style={{ color: '#ffea00', fontSize: 'clamp(1.2rem, 1.8vw, 2.5rem)', fontWeight: 900, backgroundColor: '#000', border: 'clamp(3px, 0.4vw, 6px) solid #ffea00', padding: '0.4rem 0.8rem', borderRadius: '15px', cursor: 'pointer' }}>✖</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: '#00ffff', fontSize: 'clamp(1.3rem, 2.2vw, 3rem)', fontWeight: 900, lineHeight: 1.4, marginBottom: '1.5rem', textShadow: '0 0 10px rgba(0,255,255,0.5)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {hostBanter}
                </p>
                {isThinking && (
                  <p style={{ color: '#ffea00', fontSize: 'clamp(1rem, 1.6vw, 2rem)', fontWeight: 900, backgroundColor: '#111', padding: '1rem', border: '4px solid #ffea00', borderRadius: '15px', display: 'inline-block', width: 'max-content', marginTop: '0.8rem' }}>Chester analyzing tactics...</p>
                )}
              </div>

              <div style={{ borderTop: 'clamp(6px, 1vw, 12px) solid rgba(255,234,0,0.4)', paddingTop: '1.2rem', marginTop: '1.2rem', flexShrink: 0 }}>
                
                {!demoActiveUI && (
                  <button onClick={startAiDemo} style={{ width: '100%', backgroundColor: '#39ff14', color: '#000', fontSize: 'clamp(1.2rem, 1.8vw, 2.5rem)', fontWeight: 900, padding: 'clamp(1rem, 2vw, 2.5rem)', borderRadius: '25px', border: 'clamp(4px, 0.8vw, 8px) solid #000', cursor: 'pointer', textTransform: 'uppercase', marginBottom: '1rem', boxShadow: '0 0 30px rgba(57,255,20,0.5)' }}>
                    🚀 INITIATE GEMINI AI MATCHUP
                  </button>
                )}

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem' }}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={demoActiveUI ? "Sit back and watch the AI run..." : "Talk trash to the League..."} 
                    disabled={isThinking || demoActiveUI}
                    style={{ flex: 1, backgroundColor: '#111', border: 'clamp(4px, 0.8vw, 8px) solid #ffea00', padding: 'clamp(0.8rem, 1.5vw, 1.8rem)', fontSize: 'clamp(1rem, 1.6vw, 2.2rem)', fontWeight: 900, color: '#ffea00', borderRadius: '25px', boxSizing: 'border-box' }}
                  />
                  <button type="submit" disabled={demoActiveUI} style={{ backgroundColor: '#ffea00', color: '#000', fontSize: 'clamp(1rem, 1.6vw, 2.2rem)', fontWeight: 900, padding: '0 clamp(1.2rem, 2.5vw, 3rem)', borderRadius: '25px', border: 'clamp(4px, 0.8vw, 8px) solid #000', cursor: 'pointer', opacity: demoActiveUI ? 0.5 : 1 }}>SEND</button>
                </form>
                
                <button onClick={() => setScene('LEAGUE')} style={{ width: '100%', backgroundColor: '#00ffff', color: '#000', fontSize: 'clamp(1rem, 1.4vw, 2rem)', fontWeight: 900, padding: 'clamp(0.8rem, 1.2vw, 1.6rem)', borderRadius: '25px', border: 'clamp(4px, 0.8vw, 8px) solid #000', cursor: 'pointer', textTransform: 'uppercase', boxSizing: 'border-box' }}>
                  ⬅️ FLEE THE ARENA
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}