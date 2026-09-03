'use client'; 

import dynamic from 'next/dynamic'; 
import { useState, useEffect, useRef } from 'react';
import { askChesterChat, askCommentary, askGrandmaster } from '@/app/actions';
import { ChesterAvatar, ChesterChatOverlay, ChesterTeleprompter } from '@/components/ChesterUI';
import { CapturedPieceJail, type CapturedPiece } from '@/components/CapturedPieceJails';
import { useBrawlState } from '@/components/EngineEvaluationProvider';
import { SeasonHub, TownSquare } from '@/components/SocialHub';
import { recordGame, recordMiniGame } from '@/lib/profile';
import Teleprompter from '@/components/Teleprompter';
import { getStockfishClient, type ChesterDifficulty, type EngineTelemetry } from '@/lib/stockfish';

const DojoEngineNoSSR = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

function getEngineDifficulty(difficulty: string): ChesterDifficulty {
  if (difficulty === 'BEGINNER' || difficulty === 'CASUAL') return 'BEGINNER';
  if (difficulty === 'ADVANCED') return 'ADVANCED';
  if (difficulty === 'EXPERT' || difficulty === 'PRO') return 'EXPERT';
  return 'INTERMEDIATE';
}

type SceneState = 'SPLASH' | 'ROSTER' | 'INTRO' | 'CHESTER_REVEAL' | 'HOME' | 'TOWN' | 'SEASON' | 'LEAGUE' | 'GAME';

const LEAGUE_STANDINGS = [
  { rank: 1, name: "Z-Man 👑", handle: "@zman", w: 10, l: 1, pts: 20, streak: "W6", status: "GRANDMASTER" },
  { rank: 2, name: "Brendan 🦸‍♂️", handle: "@brendan", w: 9, l: 2, pts: 18, streak: "W4", status: "HERO OF THE BOARD" },
  { rank: 3, name: "Gabe 🦹‍♂️", handle: "@gabe", w: 8, l: 3, pts: 16, streak: "W2", status: "THE VILLAIN" },
  { rank: 4, name: "Neill", handle: "@neill", w: 8, l: 3, pts: 16, streak: "L1", status: "THE CONTENDER" },
  { rank: 5, name: "Sam", handle: "@sam", w: 7, l: 4, pts: 14, streak: "W1", status: "ON THE BRINK" },
  { rank: 6, name: "Sean", handle: "@sean", w: 6, l: 5, pts: 12, streak: "L2", status: "ON THE BRINK" },
  { rank: 7, name: "Jay", handle: "@jay", w: 6, l: 5, pts: 12, streak: "W1", status: "SURVIVING" },
  { rank: 8, name: "Aidan", handle: "@aidan", w: 5, l: 6, pts: 10, streak: "L1", status: "SURVIVING" },
  { rank: 9, name: "Will", handle: "@will", w: 5, l: 6, pts: 10, streak: "W1", status: "SURVIVING" },
  { rank: 10, name: "Andrew", handle: "@andrew", w: 4, l: 7, pts: 8, streak: "L3", status: "FALLEN" },
  { rank: 11, name: "Danny", handle: "@danny", w: 3, l: 8, pts: 6, streak: "L4", status: "FALLEN" },
  { rank: 12, name: "Kairee", handle: "@kairee", w: 1, l: 10, pts: 2, streak: "L6", status: "BANISHED" },
];

const LEAGUE_ROLL_CALL = LEAGUE_STANDINGS.map((p) => p.name).join(', ');

const INTRO_SCRIPT = [
  "🐴💬 \"Your move now.\" 🏰",
  "Feeling competitive? Or just here to blunder another piece in the opening?",
  "Welcome to Chess Town."
];

const PAUL_INTRO_SCRIPT = [
  "🐴💬 \"Your move now, Paul.\" 🏰",
  "Feeling competitive? Or just here to build another excuse?",
  "Welcome to Chess Town."
];

const RICHARD_INTRO_SCRIPT = [
  "🐴💬 \"Your move now, Richie.\" 🏰",
  "Feeling competitive? We both know the truth behind the screen.",
  "Welcome to Chess Town."
];

function getPersonalizedIntro(name: string) {
  if (!name) return INTRO_SCRIPT;
  if (name === 'Paul') return PAUL_INTRO_SCRIPT;
  if (name === 'Richard') return RICHARD_INTRO_SCRIPT;
  return [
    `Your move now, ${name}.`,
    "Feeling competitive? Let's see if your actual play backs up the confidence.",
    "Welcome to Chess Town."
  ];
}


const ROSTER_AVATARS = ['🧙‍♂️', '🦸‍♂️', '🦹‍♂️', '🥷', '🕵️', '💂', '🧛‍♂️', '🧟', '🧝‍♂️', '🧞‍♂️', '👹', '👺'];
const GAME_SCENES_CSS = `
@keyframes pulseOminous {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes fadeInGhostly {
  from { opacity: 0; filter: blur(10px); transform: translateY(20px); }
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}
@keyframes rpgIdle {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.08); }
}
@keyframes rpgCursor {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
`;
const INTRO_THEMES = [
  { accent: '#8b0000', icon: '🩸' },
  { accent: '#4a0e4e', icon: '🦇' },
  { accent: '#555555', icon: '⚔️' },
  { accent: '#800080', icon: '🔮' },
  { accent: '#ff0040', icon: '🔥' },
  { accent: '#aaaaaa', icon: '📜' },
  { accent: '#00ffff', icon: '♞' },
];

const HOME_HUB = [
  { key: 'QUICK_PLAY', title: 'PLAY CHESTER', color: '#39ff14', icon: '♞', detail: 'Start a live game immediately. Every move is graded and answered in real time.' },
  { key: 'COACHING', title: 'MINI GAMES', color: '#ff007f', icon: '🧭', detail: "Train with Chester across beginner-to-expert challenges that grade your real chess decisions." },
  { key: 'DEMO_1V1', title: 'DEMO 1v1', color: '#ffea00', icon: '⚔️', detail: 'Jump into a live single-board matchup and watch or play against the arena engine.' },
  { key: 'CHALLENGE', title: 'CHALLENGE SOMEONE', color: '#ff007f', icon: '👑', detail: 'Create a private beta link and play a live legal game from two devices.' },
  { key: 'DEMO_2V2', title: 'DEMO 2v2', color: '#39ff14', icon: '🔥', detail: 'The world-first tag-team format. Chaos, coordination, and pure arena trauma.' },
  { key: 'TOWN', title: 'TOWN SQUARE', color: '#00ffff', icon: '♜', detail: 'Join the live conversation, react to rivalries, and call your next opponent out.' },
  { key: 'SEASON', title: 'SEASON HUB', color: '#ffea00', icon: '🏆', detail: 'Follow fixtures, fantasy form, power rankings, and Chester’s weekly verdict.' },
];



const FEATURED_MATCHUPS = [
  { title: 'Neill vs. Brendan 🦸‍♂️', mode: 'SIMULATION', accent: '#00ffff', summary: 'The rivalry is boiling over and the opening is already full of tension.', badge: 'MAIN EVENT' },
  { title: 'Heroes vs. Villains Tag Match', mode: '2V2', accent: '#ff007f', summary: 'A chaotic 2v2 scramble with callouts, tempo swings, and pure league chaos.', badge: 'TAG TEAM' },
  { title: 'Z-Man Championship Watch', mode: 'SIMULATION', accent: '#ffea00', summary: 'The king is under pressure and everyone wants the crown to crack.', badge: 'TITLE RACE' },
];

const COMMISSIONER_FEED = [
  { label: 'CROWN', color: '#ffea00', text: 'Z-Man 👑 is still the arena king, but the board is growing louder.' },
  { label: 'HERO WATCH', color: '#00ffff', text: 'Brendan 🦸‍♂️ is turning momentum into narrative.' },
  { label: 'VILLAIN PLOT', color: '#ff007f', text: 'Gabe 🦹‍♂️ is still one calculated trap away from rewriting the standings.' },
  { label: 'TICKER', color: '#39ff14', text: 'Arena trauma is spiking. Everyone wants the spotlight.' },
];

const COACHING_DRILLS = [
  { mode: 'COACH_DAILY', level: 'DAILY', badge: 'TODAY IN CHESS TOWN', color: '#39ff14', title: 'Daily Breakthrough', detail: 'Everyone gets the same position. Find the strongest active move, earn a daily score, and chase the friend-group leaderboard.' },
  { mode: 'COACH_PRACTICE_OPENING', level: 'ASSESSMENT', badge: 'PRACTICE YOUR OPENING', color: '#ffea00', title: 'Practice Your Opening', detail: 'Play your first five moves from the starting position. Chester will grade your opening A-F and explain your center control, development, tempo, queen timing, and king safety.' },
  { mode: 'COACH_OPENING', level: 'BEGINNER', badge: 'OPENING FUNDAMENTALS', color: '#00ffff', title: 'Own the Center', detail: 'Claim the center, develop two minor pieces, and prepare to castle within your first five moves.' },
  { mode: 'COACH_DEVELOPMENT', level: 'BEGINNER', badge: 'BACKLINE ACTIVATION', color: '#39ff14', title: 'Bring Out the Squad', detail: 'Activate a bishop or knight, avoid moving the same piece twice, and complete your development.' },
  { mode: 'COACH_KING_SAFETY', level: 'INTERMEDIATE', badge: 'KING SAFETY', color: '#ffea00', title: 'Castle Before Chaos', detail: 'Get your king castled before Chester creates a central threat. Every wasted tempo raises the pressure.' },
  { mode: 'COACH_PRESSURE', level: 'INTERMEDIATE', badge: 'TACTICAL PRESSURE', color: '#ff007f', title: 'Build the Squeeze', detail: 'Create a concrete threat, improve your least active piece, and win material without forcing a reckless attack.' },
  { mode: 'COACH_ENDGAME', level: 'EXPERT', badge: 'ENDGAME CALCULATION', color: '#b8a2ff', title: 'Convert the Advantage', detail: 'Activate your king, create a passed pawn, and convert the position without allowing counterplay.' },
  { mode: 'COACH_KNIGHTMARE', level: 'CHAOS', badge: 'CHESTER’S CHEATS', color: '#ffea00', title: 'The Knightmare', detail: 'Survive the chaos. Chester has given up his Queen and Rooks in exchange for 4 hyper-aggressive Knights. Defend your pawns and beware the royal fork!' },
  { mode: 'COACH_INVISIBLE', level: 'MYSTERY', badge: 'CHESTER’S CHEATS', color: '#ff007f', title: 'Phantom Threat', detail: 'Play from the opening against Chester, but 5 of his most important pieces (Queen, Rooks, Knights) are completely invisible. Can you survive?' },
];

const DAILY_LEADERS = [
  { name: 'Brendan', score: 96 },
  { name: 'Z-Man', score: 91 },
  { name: 'Gabe', score: 84 },
];

const LEAGUE_TIERS = [
  { title: 'THE MASTERS', subtitle: 'PRO TIER', accent: '#ffea00', className: 'league-tier--masters', players: [{ name: 'Charlie', rating: '2,184', momentum: '+3 ▲', direction: 'up' }, { name: 'Wolf', rating: '2,091', momentum: '+1 ▲', direction: 'up' }, { name: 'Brendan', rating: '2,024', momentum: '-2 ▼', direction: 'down' }] },
  { title: 'THE GRINDERS', subtitle: 'GOOD NOT GREAT', accent: '#00e5e5', className: 'league-tier--grinders', players: [{ name: 'James', rating: '1,842', momentum: '+5 ▲', direction: 'up' }, { name: 'Kyle', rating: '1,790', momentum: '-1 ▼', direction: 'down' }] },
  { title: 'THE ROOKIES', subtitle: 'BEGINNER TIER', accent: '#7cff45', className: 'league-tier--rookies', players: [{ name: 'Marley', rating: '1,416', momentum: '+4 ▲', direction: 'up' }, { name: 'Dilly', rating: '1,372', momentum: '-3 ▼', direction: 'down' }] },
];

function LeagueLeaderboard() {
  return <section className="league-dashboard" aria-labelledby="league-title">
    <header className="league-dashboard__header"><div><span>CHESS TOWN / SEASON ONE</span><h1 id="league-title">LEAGUE PLAY</h1></div><p><i /> LIVE LADDER</p></header>
    <div className="league-dashboard__tiers grid grid-cols-1 lg:grid-cols-3 gap-4">
      {LEAGUE_TIERS.map((tier) => <article key={tier.title} className={`league-tier ${tier.className}`} style={{ '--tier-accent': tier.accent } as React.CSSProperties}>
        <header><div><span>{tier.subtitle}</span><h2>{tier.title}</h2></div><b>{tier.players.length} ACTIVE</b></header>
        <div className="league-tier__table" role="table" aria-label={`${tier.title} standings`}>
          <div className="league-tier__row league-tier__head" role="row"><span>RK</span><span>PLAYER</span><span>ELO</span><span>FORM</span></div>
          {tier.players.map((player, index) => <div key={player.name} className="league-tier__row" role="row"><span className="league-tier__rank">{index === 0 ? <b title="Tier leader">♛</b> : `#${index + 1}`}</span><strong>{player.name}</strong><span>{player.rating}</span><span className={`league-tier__momentum league-tier__momentum--${player.direction}`}>{player.momentum}</span></div>)}
        </div>
        <footer><span>TOP PROMOTES</span><b>{tier.title === 'THE MASTERS' ? 'CROWN DEFENSE' : 'NEXT TIER UP'}</b></footer>
      </article>)}
    </div>
  </section>;
}

const PIECE_GLYPHS: Record<string, Record<string, string>> = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
};

const playShockSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
    masterGain.connect(ctx.destination);
    
    // ZAP oscillator (harsh drop in frequency)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    
    // Shock envelope
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    
    // Static NOISE
    const bufferSize = ctx.sampleRate * 0.3; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.3);
    noise.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export default function Home() {
  const { p1Difficulty, p2Difficulty, activeChaosEvent, setP1Difficulty, setP2Difficulty, setActiveChaosEvent } = useBrawlState();
  const [isMounted, setIsMounted] = useState(false);
  const [guestName, setGuestName] = useState('');
  useEffect(() => {
    const rawGuest = new URLSearchParams(window.location.search).get('guest')?.trim() || '';
    const safeGuest = rawGuest.replace(/[^a-zA-Z '-]/g, '').replace(/\s+/g, ' ').slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTimeout(() => setGuestName(safeGuest ? safeGuest.replace(/\b\w/g, (letter) => letter.toUpperCase()) : ''), 0);
    setIsMounted(true);
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth <= 860 || window.innerHeight <= 500);
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight <= 600);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  const isPhonePortrait = isMobile && !isLandscape;

  const [scene, setScene] = useState<SceneState>('HOME');
  const [pageIndex, setPageIndex] = useState(0);
  const [displayedIntro, setDisplayedIntro] = useState('');
  
  const [activeMatchup, setActiveMatchup] = useState('');
  const [gameMode, setGameMode] = useState('STANDBY');
  const [coachingDifficulty, setCoachingDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('INTERMEDIATE');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [arenaView, setArenaView] = useState<'PLAY' | 'CHESTER'>('PLAY');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'chester'; text: string; education?: string; kind?: 'chat' | 'analysis' }[]>([]);
  const [chatError, setChatError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hostBanter, setHostBanter] = useState("🎙️ CHESTER: Arena locked. This is where bad decisions meet their final judgment.");
  const [commentaryHistory, setCommentaryHistory] = useState<string[]>([]);
  const [currentGameState, setCurrentGameState] = useState<any>(null);
  const [banterUpdated, setBanterUpdated] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState('');
  const [teleprompterLoading, setTeleprompterLoading] = useState(false);
  
  const [leagueView, setLeagueView] = useState<'STANDINGS' | 'MATCHUPS' | '2V2' | 'COACHING' | 'PLAYOFFS'>('COACHING');
  const [demoActiveUI, setDemoActiveUI] = useState(false); 
  const [matchOver, setMatchOver] = useState(false);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<{ title: string; objective: string; level: string } | null>(null);
  const [openingAssessment, setOpeningAssessment] = useState<{ grade: string; score: number; line: string; strengths: string[]; improvements: string[] } | null>(null);
  const [openingName, setOpeningName] = useState('Opening book loading');
  const [principleStreak, setPrincipleStreak] = useState(0);
  const [missionProgress, setMissionProgress] = useState('Make your first move');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [postGameReport, setPostGameReport] = useState<{ grade: string; score: number; accuracy: number; development: number; kingSafety: number; tactics: number; openingName: string; moves: number; turningPoint: string } | null>(null);
  const [replay, setReplay] = useState({ index: 0, total: 1, move: 'Start' });
  const [remoteRole, setRemoteRole] = useState<'w' | 'b' | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState('');
  const [challengeUrl, setChallengeUrl] = useState('');
  const peerRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const commentaryRequestRef = useRef(0);
  const teleprompterRequestRef = useRef(0);
  const gameStartedAtRef = useRef(0);

  useEffect(() => {
    if (scene !== 'GAME' || !hostBanter) return;
    setCommentaryHistory((history) => history.at(-1) === hostBanter ? history : [...history.slice(-7), hostBanter]);
  }, [hostBanter, scene]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      const saved = JSON.parse(localStorage.getItem('chess-town-achievements') || '[]');
      if (Array.isArray(saved)) setAchievements(saved.slice(0, 12));
    } catch {}
  }, [isMounted]);

  const unlockAchievement = (title: string) => {
    setAchievements((current) => {
      if (current.includes(title)) return current;
      const next = [...current, title].slice(-12);
      localStorage.setItem('chess-town-achievements', JSON.stringify(next));
      return next;
    });
  };

  
  useEffect(() => {
    if (!isMounted) return;
    if (scene === 'SPLASH') {
      const timer = setTimeout(() => setScene('INTRO'), 5200);
      return () => clearTimeout(timer);
    }
  }, [scene, isMounted]);


  useEffect(() => {
    if (scene === 'INTRO') {
      const activeScript = getPersonalizedIntro(guestName);
      const targetText = activeScript[pageIndex];
      let visibleLength = 0;
      setDisplayedIntro('');
      const typing = setInterval(() => {
        visibleLength += 1;
        setDisplayedIntro(targetText.slice(0, visibleLength));
        if (visibleLength >= targetText.length) clearInterval(typing);
      }, 15); 
      return () => clearInterval(typing);
    }
  }, [scene, pageIndex, guestName]);

  const configureConnection = (connection: any) => {
    connectionRef.current = connection;
    connection.on('open', () => {
      setRemoteConnected(true);
      setRemoteStatus('Opponent connected. Green moves first.');
    });
    connection.on('data', (data: any) => {
      if (data?.type === 'move') window.dispatchEvent(new CustomEvent('remote-chess-move', { detail: data }));
    });
    connection.on('close', () => { setRemoteConnected(false); setRemoteStatus('Opponent disconnected.'); });
    connection.on('error', () => { setRemoteConnected(false); setRemoteStatus('Connection interrupted. Reopen the challenge link.'); });
  };

  const openRemoteArena = (role: 'w' | 'b', room: string) => {
    setRemoteRole(role);
    setRemoteConnected(false);
    setRemoteStatus(role === 'w' ? 'Waiting for your opponent...' : 'Joining challenge...');
    setChallengeUrl(`${window.location.origin}${window.location.pathname}?room=${room}`);
    setGameMode('PVP_REMOTE');
    setActiveMatchup('Live Challenge: Green vs. Black');
    setCapturedPieces([]);
    setDrawerOpen(true);
    setScene('GAME');
  };

  const createRemoteChallenge = async () => {
    playShockSound();
    peerRef.current?.destroy?.();
    const room = Math.random().toString(36).slice(2, 10);
    const { default: Peer } = await import('peerjs');
    const peer = new Peer(`chess-town-${room}`);
    peerRef.current = peer;
    openRemoteArena('w', room);
    peer.on('connection', configureConnection);
    peer.on('error', () => setRemoteStatus('Could not open the challenge room. Try again.'));
  };

  const copyChallengeLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setRemoteStatus(remoteConnected ? 'Link copied. Opponent connected.' : 'Link copied. Send it to your opponent.');
    } catch {
      setRemoteStatus('Select the URL below and copy it manually.');
    }
  };

  const shareChallengeLink = async () => {
    if (!navigator.share) return copyChallengeLink();
    try {
      await navigator.share({ title: 'Chess Town Challenge', text: 'Enter the arena and face me.', url: challengeUrl });
    } catch {
      setRemoteStatus(remoteConnected ? 'Opponent connected.' : 'Challenge ready to share.');
    }
  };

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room')?.replace(/[^a-z0-9]/gi, '').slice(0, 12);
    if (!room) return;
    let cancelled = false;
    import('peerjs').then(({ default: Peer }) => {
      if (cancelled) return;
      const peer = new Peer();
      peerRef.current = peer;
      openRemoteArena('b', room);
      peer.on('open', () => configureConnection(peer.connect(`chess-town-${room}`, { reliable: true })));
      peer.on('error', () => setRemoteStatus('Challenge unavailable. Ask the host for a fresh link.'));
    });
    return () => { cancelled = true; peerRef.current?.destroy?.(); };
  }, []);

  useEffect(() => {
    const sendMove = (event: Event) => connectionRef.current?.send?.({ type: 'move', ...(event as CustomEvent).detail });
    window.addEventListener('local-chess-move', sendMove);
    return () => window.removeEventListener('local-chess-move', sendMove);
  }, []);

  useEffect(() => {
    if (scene !== 'GAME') return;
    
    const handleBanter = async (e: Event) => {
      const requestId = ++commentaryRequestRef.current;
      const detail = (e as CustomEvent).detail;
      const payload = typeof detail === 'string'
        ? { message: detail, context: `Matchup: ${activeMatchup || 'League demo'}`, ply: 0 }
        : detail || { message: 'Chester is live.', context: `Matchup: ${activeMatchup || 'League demo'}`, ply: 0 };
        
      setCurrentGameState((prev: any) => ({ ...prev, ...payload }));

      if (payload?.type === 'move') {
        if (payload.openingName) setOpeningName(payload.openingName);
        setPrincipleStreak(Number(payload.principleStreak || 0));
        if (payload.openingName && !['Opening book loading', 'Uncharted Opening'].includes(payload.openingName)) unlockAchievement('Book Explorer');
        if (Number(payload.principleStreak || 0) >= 3) unlockAchievement('Principle Streak');
        if (payload.player === 'You' && payload.captured) unlockAchievement('Material Collector');
        if (payload.player === 'You' && gameMode === 'COACH_PRACTICE_OPENING') {
          setMissionProgress(`${Math.min(3, Number(payload.principleStreak || 0))}/3 principled moves`);
        }
        if (payload.player === 'You' && gameMode === 'COACH_DAILY') {
          const scores: Record<string, number> = { BEST: 100, GREAT: 92, GOOD: 80, INACCURACY: 62, MISTAKE: 38, BLUNDER: 15 };
          const score = scores[payload.quality] || 50;
          setDailyScore(score);
          setMissionProgress(score >= 80 ? 'Daily mission complete' : 'Try again for 80+');
          if (score >= 90) unlockAchievement('Daily Star');
        }
      }

      if (payload?.type === 'scenario') {
        setActiveChallenge((current) => current || { title: payload?.title || activeMatchup, objective: payload?.objective || 'Make a principled move and explain your plan.', level: 'LIVE DRILL' });
        setIsThinking(true);
        try {
          const richPayload = JSON.stringify({
            type: 'scenario',
            mode: payload?.mode || gameMode,
            matchup: payload?.title || activeMatchup,
            fen: payload?.fen,
            instruction: 'Introduce this coaching scenario with hype energy: explain what the learning environment is and what the live challenge asks the player to do in 2-3 punchy sentences.',
            objective: payload?.objective,
          });
          const aiResponse = await askChesterChat(richPayload);
          if (requestId === commentaryRequestRef.current) setHostBanter(`🎙️ CHESTER: ${aiResponse}`);
        } catch (err) {
          console.error('Scenario intro error:', err);
          setHostBanter(`🎙️ CHESTER: ${payload?.objective || 'Training board is live. Make your move.'}`);
        } finally {
          setIsThinking(false);
          setBanterUpdated(true);
          setTimeout(() => setBanterUpdated(false), 600);
        }
        return;
      }

      if (payload?.type === 'move' || payload?.type === 'summary') {
        setIsThinking(true);
        try {
          // Build a rich payload with all chess context for Gemini
          const richPayload = JSON.stringify({
            // Move-specific data
            move: payload?.move || 'unknown',
            piece: payload?.piece || '?',
            from: payload?.from || '',
            to: payload?.to || '',
            captured: payload?.captured || null,
            royalCatMove: Boolean(payload?.royalCatMove),
            royalCatName: payload?.royalCatName || null,
            ply: Number(payload?.ply ?? 0),
            quality: payload?.quality || null,
            centipawnLoss: payload?.centipawnLoss ?? null,
            engineTelemetry: payload?.engineTelemetry || null,
            evaluationBefore: payload?.evaluationBefore ?? null,
            evaluationAfter: payload?.evaluationAfter ?? null,
            evalDelta: payload?.evalDelta ?? null,
            principalVariation: payload?.principalVariation || [],
            alternateWinningLines: payload?.alternateWinningLines || [],
            checklist: payload?.checklist || null,
            openingAssessment: payload?.openingAssessment || null,
            openingName: payload?.openingName || null,
            principleStreak: payload?.principleStreak || 0,
            pgn: payload?.pgn || null,
            isSpicyOpening: payload?.openingName && ['Trompowsky Attack', 'Halloween Gambit', 'Bongcloud Attack'].some(spicy => payload.openingName.includes(spicy)) ? true : false,
            
            // Game context
            type: payload?.type,
            gameState: payload?.gameState,
            fen: payload?.fen,
            
            // Player/matchup context
            player: payload?.player || 'League player',
            opponent: gameMode.startsWith('COACH_')
              ? (payload?.player === 'You' ? 'Chester' : 'You')
              : gameMode === 'SIMULATION'
                ? (payload?.player?.includes('Neill') ? 'Brendan 🦸‍♂️' : 'Neill')
                : (payload?.player?.includes('Neill') ? 'Gabe + Z-Man' : 'Neill + Brendan'),
            mode: gameMode,
            matchup: payload?.matchup || activeMatchup,
            p1Difficulty,
            p2Difficulty,
            activeChaosEvent: payload?.activeChaosEvent || activeChaosEvent,
            
            // Instructions for Chester
            instruction: payload?.instruction || (payload?.type === 'summary' 
              ? 'Generate a quick, 2-sentence summary of the game based on the PGN highlighting the defining blunder or brilliant move. Use a punchy, witty, dry British sense of humour.'
              : (payload?.openingName && ['Trompowsky Attack', 'Halloween Gambit', 'Bongcloud Attack', 'Bongcloud'].some(spicy => payload.openingName.includes(spicy)))
                ? `You detected the '${payload.openingName}'. Drop a punchy, witty, dry British comment about this chaotic opening.`
                : 'Generate punchy, witty, strategic chess commentary on this move with a dry British sense of humour, grounded in the engine move-quality grade provided'),
          });
          
          const aiResponse = payload?.type === 'move'
            ? await askGrandmaster(richPayload)
            : await askChesterChat(richPayload);
          if (requestId !== commentaryRequestRef.current) return;
          setHostBanter(`🎙️ CHESTER: ${aiResponse}`);
          setBanterUpdated(true);
          setTimeout(() => setBanterUpdated(false), 600);
        } catch (err) {
          console.error('Banter error:', err);
          setHostBanter(`🎙️ CHESTER: The board's on fire, and Chester's still recalibrating the chaos sensor.`);
        } finally {
          setIsThinking(false);
        }
        return;
      }

      setHostBanter(`🎙️ CHESTER: ${String(payload?.message || 'Arena locked and ready.')}`);
      setBanterUpdated(true);
      setTimeout(() => setBanterUpdated(false), 600);
    };

    const handleDemoComplete = () => {
      setDemoActiveUI(false);
      setIsThinking(false);
      setHostBanter('🎙️ CHESTER: Final whistle. The grid just delivered a full-season recap and it was absolutely LEGENDARY.');
      setBanterUpdated(true);
      setTimeout(() => setBanterUpdated(false), 600);
    };

    const handleMatchComplete = () => setMatchOver(true);
    const handleCapture = (e: Event) => setCapturedPieces((pieces) => [...pieces, (e as CustomEvent<CapturedPiece>).detail]);
    const handlePieceRestored = (e: Event) => {
      const restoredPiece = (e as CustomEvent<CapturedPiece>).detail;
      setCapturedPieces((pieces) => {
        const index = pieces.findLastIndex((piece) => piece.color === restoredPiece.color && piece.type === restoredPiece.type);
        return index < 0 ? pieces : pieces.filter((_, pieceIndex) => pieceIndex !== index);
      });
    };
    const handleOpeningAssessment = (e: Event) => {
      setOpeningAssessment((e as CustomEvent).detail);
      if (['A', 'B'].includes((e as CustomEvent).detail?.grade)) unlockAchievement('Center Controller');
      setArenaView('CHESTER');
    };
    const handleGameReport = (e: Event) => {
      const report = (e as CustomEvent).detail;
      setPostGameReport(report);
      const isMiniGame = gameMode.startsWith('COACH_');
      if (isMiniGame && report.score >= 65) {
        const tier = gameMode === 'COACH_ENDGAME' ? 'EXPERT' : gameMode === 'COACH_PRESSURE' || gameMode === 'COACH_KING_SAFETY' ? 'INTERMEDIATE' : 'BEGINNER';
        recordMiniGame({ id: gameMode, tier, mistakes: report.accuracy === 100 ? 0 : 1, elapsedMs: Math.round(performance.now() - gameStartedAtRef.current), targetMs: 180000 });
      }
      recordGame(isMiniGame ? 'chester' : 'pvp', report.grade === 'A' || report.grade === 'B');
      setReplay({ index: report.moves, total: report.moves + 1, move: 'Final position' });
      unlockAchievement('Game Finisher');
      setArenaView('CHESTER');
    };
    const handleReplayStatus = (e: Event) => setReplay((current) => ({ ...current, ...(e as CustomEvent).detail }));
    const handleEngineTelemetry = async (e: Event) => {
      const telemetry = (e as CustomEvent<EngineTelemetry>).detail;
      if (!telemetry) return;
      const requestId = ++teleprompterRequestRef.current;
      setTeleprompterLoading(true);
      try {
        const commentary = await askCommentary({
          fen: telemetry.fenAfter,
          san: telemetry.san,
          centipawns: telemetry.centipawns,
          mateIn: telemetry.mateIn,
          bestMove: telemetry.bestMove,
          continuation: telemetry.continuation,
          classification: telemetry.classification,
        });
        if (requestId === teleprompterRequestRef.current) setTeleprompterText(commentary);
      } finally {
        if (requestId === teleprompterRequestRef.current) setTeleprompterLoading(false);
      }
    };

    window.addEventListener('dojo-banter', handleBanter);
    window.addEventListener('demo-complete', handleDemoComplete);
    window.addEventListener('match-complete', handleMatchComplete);
    window.addEventListener('piece-captured', handleCapture);
    window.addEventListener('piece-restored', handlePieceRestored);
    window.addEventListener('opening-assessment', handleOpeningAssessment);
    window.addEventListener('game-report', handleGameReport);
    window.addEventListener('replay-status', handleReplayStatus);
    window.addEventListener('dojo-engine-telemetry', handleEngineTelemetry);
    
    return () => {
      window.removeEventListener('dojo-banter', handleBanter);
      window.removeEventListener('demo-complete', handleDemoComplete);
      window.removeEventListener('match-complete', handleMatchComplete);
      window.removeEventListener('piece-captured', handleCapture);
      window.removeEventListener('piece-restored', handlePieceRestored);
      window.removeEventListener('opening-assessment', handleOpeningAssessment);
      window.removeEventListener('game-report', handleGameReport);
      window.removeEventListener('replay-status', handleReplayStatus);
      window.removeEventListener('dojo-engine-telemetry', handleEngineTelemetry);
    };
  }, [scene, activeMatchup, gameMode, p1Difficulty, p2Difficulty, activeChaosEvent]);

  const loadArena = (mode: string, matchTitle: string) => {
    gameStartedAtRef.current = performance.now();
    setDemoActiveUI(false);
    setIsThinking(false);
    setMatchOver(false);
    setCapturedPieces([]);
    setOpeningAssessment(null);
    setOpeningName('Opening book loading');
    setPrincipleStreak(0);
    setMissionProgress(mode === 'COACH_DAILY' ? 'Score 80+ on your move' : mode === 'COACH_PRACTICE_OPENING' ? 'Build a 3-move principle streak' : 'Complete Chester’s objective');
    setDailyScore(null);
    setPostGameReport(null);
    setReplay({ index: 0, total: 1, move: 'Start' });
    setCommentaryHistory([]);
    setChatMessages([]);
    setChatError('');
    setTeleprompterText('');
    setTeleprompterLoading(false);
    setArenaView('PLAY');
    const drill = COACHING_DRILLS.find((item) => item.mode === mode);
    setActiveChallenge(drill ? { title: drill.title, objective: drill.detail, level: drill.level } : null);
    setActiveMatchup(matchTitle);
    setGameMode(mode);
    setScene('GAME');
    
    setTimeout(() => {
      setHostBanter(drill
        ? `🎙️ CHESTER: ${drill.title} is live. ${drill.detail} Make your first move and I will grade the decision.`
        : `⚡ CHESTER: Arena locked for ${matchTitle}. Uplink LIVE and the drama meter is MAXED.`);
      setBanterUpdated(true);
      setTimeout(() => setBanterUpdated(false), 600);
      window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode: mode, isFlipped: false, matchupTitle: matchTitle } }));
      setDrawerOpen(true);
    }, 400);
  };

  const startAiDemo = () => {
    setDemoActiveUI(true);
    setIsThinking(true);
    setHostBanter('🎙️ CHESTER: Systems initializing... the League is about to witness HISTORY.');
    setBanterUpdated(true);
    setTimeout(() => setBanterUpdated(false), 600);
    window.dispatchEvent(new CustomEvent('start-demo'));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatError('');
    const conversationHistory = [...chatMessages, { role: 'user' as const, text: message }].slice(-8);
    setChatMessages(conversationHistory);
    setIsThinking(true);
    try {
      let engineTelemetry = currentGameState.engineTelemetry;
      if (currentGameState.fen) {
        const analysis = await getStockfishClient().analyzePosition(currentGameState.fen, getEngineDifficulty(coachingDifficulty));
        engineTelemetry = {
          ...engineTelemetry,
          bestMove: analysis.bestMove,
          principalVariation: analysis.pv,
          evaluationBefore: analysis.score,
          evaluationAfter: null,
          evalDelta: null,
        };
      }
      const reply = await askChesterChat(JSON.stringify({
        ...currentGameState,
        message,
        type: 'chat',
        mode: gameMode,
        matchup: activeMatchup,
        openingAssessment,
        engineTelemetry,
        principalVariation: engineTelemetry?.principalVariation || [],
        evaluationBefore: engineTelemetry?.evaluationBefore ?? null,
        evaluationAfter: engineTelemetry?.evaluationAfter ?? null,
        evalDelta: engineTelemetry?.evalDelta ?? null,
        p1Difficulty,
        p2Difficulty,
        activeChaosEvent,
        conversationHistory,
        instruction: 'Use fresh Stockfish analysis to answer directly. Name the engine best move and translate the principal variation into a strategic plan. Be funny without sacrificing accuracy, then give exactly one concrete next action.',
      }));
      setChatMessages((current) => [...current, { role: 'chester' as const, text: reply, kind: 'chat' as const }].slice(-10));
      setHostBanter(`🎙️ CHESTER: ${reply}`);
      setBanterUpdated(true);
      setTimeout(() => setBanterUpdated(false), 600);
    } catch {
      setChatError('Chester could not reach the analysis desk. Tap retry in a moment.');
      setChatInput(message);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const destination = searchParams.get('view');
    const selectedMode = searchParams.get('mode');
    const matchId = searchParams.get('match');
    const isBrawl = selectedMode === 'PVP_REMOTE' && searchParams.get('brawl') === '1' && matchId;
    if (isBrawl) {
      const role = searchParams.get('role') === 'b' ? 'b' : 'w';
      void fetch(`/api/brawl/sync?match=${encodeURIComponent(matchId)}`).then(async (response) => {
        if (!response.ok) throw new Error('Brawl room not found');
        const room = await response.json();
        setP1Difficulty(room.p1Difficulty);
        setP2Difficulty(room.p2Difficulty);
        setActiveChaosEvent(room.activeChaosEvent);
        setRemoteRole(role);
        setRemoteConnected(true);
        setRemoteStatus(role === 'w' ? 'Brawl room ready. Waiting for Jemma.' : 'Joined the Brawl. You play Black.');
        loadArena('PVP_REMOTE', 'The Backroom Brawl');
      }).catch((error) => setRemoteStatus(error instanceof Error ? error.message : 'Could not join the Brawl room.'));
      return;
    }
    const selectedDrill = COACHING_DRILLS.find((drill) => drill.mode === selectedMode);
    if (selectedDrill) {
      loadArena(selectedDrill.mode, selectedDrill.title);
      return;
    }
    if (!destination) return;
    if (destination === 'play') {
      loadArena('COACH_OPENING', 'You vs. Chester');
      return;
    }
    setScene('LEAGUE');
    setLeagueView(destination === 'mini-games' ? 'COACHING' : 'STANDINGS');
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const matchId = searchParams.get('match');
    const isBrawl = gameMode === 'PVP_REMOTE' && searchParams.get('brawl') === '1' && matchId;
    if (!isBrawl || scene !== 'GAME') return;

    let cancelled = false;
    let knownFen = '';
    const pollRoom = async () => {
      try {
        const response = await fetch(`/api/brawl/sync?match=${encodeURIComponent(matchId)}`);
        if (!response.ok) throw new Error('Brawl room connection lost');
        const room = await response.json();
        if (cancelled) return;
        setActiveChaosEvent(room.activeChaosEvent);
        if (room.fen !== knownFen) {
          knownFen = room.fen;
          window.dispatchEvent(new CustomEvent('brawl-position', { detail: room }));
        }
      } catch (error) {
        if (!cancelled) setRemoteStatus(error instanceof Error ? error.message : 'Brawl room connection lost');
      }
    };
    const sendPosition = (event: Event) => {
      const detail = (event as CustomEvent<{ fen: string; turn: 'w' | 'b'; activeChaosEvent: string | null }>).detail;
      knownFen = detail.fen;
      void fetch('/api/brawl/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, ...detail }),
      });
    };
    void pollRoom();
    const interval = window.setInterval(() => void pollRoom(), 2000);
    window.addEventListener('brawl-position-update', sendPosition);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('brawl-position-update', sendPosition);
    };
  }, [gameMode, scene, setActiveChaosEvent]);

  if (!isMounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#050008', color: 'white', fontFamily: 'Georgia, Times New Roman, serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {scene === 'SPLASH' && (
        <div className="gothic-shock-scene" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020005', position: 'relative', overflow: 'hidden' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,.14)_0%,rgba(20,0,35,.42)_38%,rgba(0,0,0,1)_80%)]"></div>
          <div className="shock-bolt shock-bolt-left"></div><div className="shock-bolt shock-bolt-right"></div>
          <div className="opening-reveal" style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="opening-horse"><span>🐴</span><span className="opening-smirk">😏</span></div>
            <h1 className="opening-hello">HELLO, {guestName ? guestName.toUpperCase() : 'FRIENDS'}</h1>
            <p className="opening-town">WELCOME TO CHESS TOWN</p>
          </div>
        </div>
      )}

      {scene === 'ROSTER' && (
        <div className="intro-rpg-stage" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#000', position: 'relative', padding: isLandscape ? '0.5rem 2rem' : '1rem', boxSizing: 'border-box', overflow: 'hidden' }}>
          <h2 style={{ color: '#fff', letterSpacing: isLandscape ? '5px' : '8px', fontSize: isLandscape ? '1.3rem' : 'clamp(1.5rem, 3vw, 3rem)', margin: isLandscape ? '0 0 0.7rem' : '0 0 2rem', animation: 'fadeInGhostly 1.5s ease-out' }}>THE TWELVE CONTENDERS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isLandscape ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)', gap: isLandscape ? '0.5rem 1.2rem' : 'clamp(0.7rem, 2vw, 2rem)', maxWidth: '1200px', width: '92%' }}>
             {LEAGUE_STANDINGS.map((p, i) => (
               <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeInGhostly 0.8s ease-out forwards', animationDelay: `${i * 0.15}s`, opacity: 0 }}>
                 <div style={{ fontSize: isLandscape ? '1.8rem' : 'clamp(2rem, 5vw, 4rem)', animation: 'rpgIdle 3s ease-in-out infinite', animationDelay: `${i * 0.2}s`, filter: 'drop-shadow(0 0 10px rgba(255,0,127,.45))' }}>{ROSTER_AVATARS[i % 12]}</div>
                 <span style={{ color: '#aaa', marginTop: isLandscape ? '0.2rem' : '0.6rem', fontSize: isLandscape ? '0.5rem' : 'clamp(0.55rem, 1vw, 0.9rem)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>{p.name.replace(/[^\w\s-]/gi, '').trim()}</span>
               </div>
             ))}
           </div>
           <div style={{ color: '#596e77', textAlign: 'center', fontSize: isLandscape ? '0.45rem' : '0.7rem', margin: isLandscape ? '0.5rem 0' : '1rem 0' }}>{LEAGUE_ROLL_CALL}</div>
           <button onClick={() => setScene('HOME')} style={{ marginTop: isLandscape ? '0.35rem' : '0.8rem', background: '#39ff14', color: '#020502', border: '1px solid #dfffff', boxShadow: '0 0 32px rgba(57,255,20,.75)', letterSpacing: '2px', cursor: 'pointer', fontWeight: 900, padding: isLandscape ? '0.45rem 1.2rem' : '0.8rem 2rem', fontSize: isLandscape ? '0.65rem' : '1rem' }}>ENTER THE ARENA →</button>
        </div>
      )}

      {scene === 'INTRO' && (() => {
        const theme = INTRO_THEMES[pageIndex] || INTRO_THEMES[0];
        const activeScript = getPersonalizedIntro(guestName);
        return (
        <div key={pageIndex} className="chester-intro-page intro-rpg-stage" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isLandscape ? '1rem 2rem' : '2rem', position: 'relative', backgroundColor: '#020005', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${theme.accent}15 0%, transparent 70%)`, opacity: 0.8, animation: 'pulseOminous 4s infinite' }}></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_2px,transparent_2px)] bg-[size:40px_40px]"></div>
          <div style={{ maxWidth: '1000px', width: '90%', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p className="intro-story-text" style={{ fontSize: isLandscape ? 'clamp(1.1rem, 3.8vw, 2.2rem)' : 'clamp(1.3rem, 3.5vw, 3.5rem)', color: '#fff', fontWeight: 900, lineHeight: isLandscape ? 1.35 : 1.55, textShadow: `0 0 15px ${theme.accent}`, margin: 0, textAlign: 'center', transition: 'text-shadow 0.5s', minHeight: isLandscape ? '78px' : '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {displayedIntro}<span className="inline-block w-[1.5vw] h-[3vw] ml-2 align-middle" style={{ backgroundColor: theme.accent, animation: 'rpgCursor 1s infinite' }}></span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: isLandscape ? '1rem' : '2rem' }}>
              {pageIndex < activeScript.length - 1 ? (
                <button onClick={() => setPageIndex(p => p + 1)} style={{ background: 'transparent', color: theme.accent, fontSize: 'clamp(1rem, 2vw, 1.4rem)', fontWeight: 900, border: 'none', cursor: 'pointer', letterSpacing: '4px', animation: 'pulseOminous 2s infinite', outline: 'none' }}>▼ CLICK TO CONTINUE ▼</button>
              ) : (
                <button onClick={() => setScene('ROSTER')} style={{ background: 'transparent', color: '#39ff14', fontSize: 'clamp(1rem, 2vw, 1.4rem)', fontWeight: 900, border: 'none', cursor: 'pointer', letterSpacing: '4px', animation: 'pulseOminous 2s infinite', outline: 'none' }}>▼ MEET THE CONTENDERS ▼</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {scene === 'CHESTER_REVEAL' && (
        <div className="chester-intro-page chester-reveal" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: isLandscape ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020005', padding: isLandscape ? '1rem 4rem' : '2rem', position: 'relative', overflow: 'hidden', gap: isLandscape ? '4rem' : '0' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.16)_0%,rgba(20,0,35,0.38)_35%,rgba(0,0,0,1)_78%)]"></div>
          <div className="chester-sigil" style={{ position: 'relative', width: isLandscape ? '42vh' : 'min(62vw, 440px)', aspectRatio: '1', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <div className="chester-ring chester-ring-outer"></div><div className="chester-ring chester-ring-inner"></div>
            <div className="chester-knight-shadow">♞</div><div className="chester-knight">♞</div><span className="chester-eye"></span>
            <span className="chester-cunning">😏</span><span className="chester-spark spark-one">⚡</span><span className="chester-spark spark-two">✦</span>
          </div>
          <div style={{ position: 'relative', zIndex: 2, textAlign: isLandscape ? 'left' : 'center', maxWidth: '720px' }}>
            <div style={{ color: '#ff007f', letterSpacing: '5px', fontSize: isLandscape ? '0.65rem' : 'clamp(0.7rem, 1.5vw, 1rem)', fontWeight: 900 }}>THE MASTER OF THE BOARD HAS ARRIVED</div>
            <h1 style={{ fontSize: isLandscape ? 'clamp(2.4rem, 7vw, 4.8rem)' : 'clamp(3.5rem, 11vw, 8rem)', fontWeight: 900, color: '#eaffff', textShadow: '0 0 18px #00ffff, 0 0 55px rgba(0,255,255,0.8)', textTransform: 'uppercase', letterSpacing: isLandscape ? '4px' : '7px', lineHeight: .9, margin: '0.8rem 0' }}>CHESTER</h1>
            <p style={{ color: '#b8faff', fontSize: isLandscape ? '0.82rem' : 'clamp(1rem, 2vw, 1.35rem)', lineHeight: 1.45, maxWidth: '55ch', margin: isLandscape ? '0 0 1rem' : '0 auto 1.6rem' }}>{guestName === 'Richard' ? 'Richard... turning off your screen will not save you from this matchup. The board is ready. I can hear your heart rate spiking... do not run from me.' : guestName === 'Paul' ? 'Paul, I am Chester, the shadow in the machine. I cull the weak. The beach can wait; the grid demands your answer.' : guestName ? `${guestName}, I am the shadow in the machine. The board is ready, and your truth will be exposed.` : 'I am Chester. I grade the moves, summon the chaos, and remember every blunder. Ready to play, my friends?'}</p>
            <button onClick={() => setScene('ROSTER')} className="chester-enter" style={{ backgroundColor: '#00ffff', color: '#020005', fontSize: isLandscape ? '0.82rem' : 'clamp(1rem, 2vw, 1.35rem)', fontWeight: 900, padding: isLandscape ? '0.65rem 1.4rem' : '0.9rem 2rem', borderRadius: '4px', border: '1px solid #dfffff', boxShadow: '0 0 25px rgba(0,255,255,0.8)', cursor: 'pointer', letterSpacing: '2px' }}>{guestName === 'Richard' ? 'ENTER. RIGHT NOW, RICHIE. →' : guestName === 'Paul' ? 'STEP UP TO PLAY, PAUL →' : 'JOIN YOUR FRIENDS NOW →'}</button>
          </div>
        </div>
      )}

      {scene === 'HOME' && (
        <div className="command-center">
          <div className="command-center__grid" aria-hidden="true" />
          <header className="command-header">
            <div>
              <span className="command-kicker">CHESS TOWN / LIVE ARENA</span>
              <h1>YOUR MOVE, {guestName ? guestName.toUpperCase() : 'CHALLENGER'}.</h1>
            </div>
            <div className="command-status"><span /> CHESTER ONLINE</div>
          </header>

          <main className="command-layout">
            <section className="command-primary">
              <div className="command-primary__copy">
                <span className="command-label">RECOMMENDED MATCH</span>
                <h2>PLAY CHESTER</h2>
                <p>A live board, instant move grades, tactical replies, and commentary that remembers the damage.</p>
                <div className="command-actions">
                  <button className="command-play" onClick={() => loadArena('COACH_OPENING', 'You vs. Chester')}><span>♞</span> START GAME</button>
                  <button className="command-secondary" onClick={() => { setLeagueView('COACHING'); setScene('LEAGUE'); }}>EXPLORE MINI GAMES</button>
                </div>
              </div>
              <div className="command-knight" aria-hidden="true"><span>♞</span><i /></div>
              <div className="command-metrics">
                <div><b>REAL TIME</b><span>Engine response</span></div>
                <div><b>9</b><span>Training missions</span></div>
                <div><b>LIVE</b><span>Move grading</span></div>
              </div>
            </section>

            
          </main>

          <footer className="command-footer">
            <button onClick={() => loadArena('COACH_DAILY', 'Daily Breakthrough')}><b>DAILY POSITION</b><span>One shared puzzle. One score.</span></button>
            <button onClick={() => setScene('TOWN')}><b>TOWN SQUARE</b><span>Talk chess, call rivals out, follow Chester.</span></button>
            <button onClick={() => setScene('SEASON')}><b>SEASON HUB</b><span>Fixtures, power rankings, fantasy form.</span></button>
          </footer>
        </div>
      )}

      {scene === 'TOWN' && (
        <TownSquare
          guestName={guestName}
          onNavigate={(destination) => setScene(destination)}
          onPlay={loadArena}
          onChallenge={createRemoteChallenge}
        />
      )}
      {scene === 'SEASON' && (
        <SeasonHub
          guestName={guestName}
          onNavigate={(destination) => setScene(destination)}
          onPlay={loadArena}
          onChallenge={createRemoteChallenge}
        />
      )}

      {scene === 'LEAGUE' && leagueView === 'STANDINGS' && <LeagueLeaderboard />}

      {scene === 'LEAGUE' && leagueView !== 'STANDINGS' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '0.6rem' : 'clamp(1rem, 2vw, 2.5rem)', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', marginBottom: isMobile ? '0.6rem' : '1.5rem', flexShrink: 0 }}>
            <div className="arena-choice-heading">
              <ChesterAvatar isThinking={false} size="large" />
              <div>
                <span>CHESTER SAYS</span>
                <p>Fun animations to come soon, friends.</p>
              </div>
              <h1 style={{ fontSize: isMobile ? '1.2rem' : 'clamp(2rem, 3.8vw, 4rem)', color: '#ffea00', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 0 25px rgba(255,234,0,0.8)', margin: 0 }}>CHOOSE YOUR GAME</h1>
            </div>
          </div>
          
          <div style={{ flex: 1, width: '100%', maxWidth: '1400px', minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.6rem' : '2rem', position: 'relative', alignItems: 'stretch', overflow: 'hidden' }}>
            <div style={{ flex: isMobile ? '1 1 60%' : 2, minHeight: 0, backgroundColor: '#000', borderRadius: '6px', border: '2px solid #00ffff', padding: isMobile ? '0.8rem' : '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,255,255,0.2)', overflowY: 'auto' }}>

              {leagueView === 'MATCHUPS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <h3 style={{ color: '#ffea00', fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)', margin: 0, fontWeight: 900 }}>LIVE MATCHUP BOARD</h3>
                    <span style={{ color: '#39ff14', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '1px' }}>SEASON 1 // LIVE</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {FEATURED_MATCHUPS.map((matchup) => (
                      <div key={matchup.title} style={{ background: `linear-gradient(135deg, ${matchup.accent}22, rgba(255,255,255,0.03))`, border: `3px solid ${matchup.accent}`, borderRadius: '24px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', minHeight: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ backgroundColor: matchup.accent, color: '#000', fontWeight: 900, fontSize: '0.7rem', padding: '0.35rem 0.7rem', borderRadius: '999px' }}>{matchup.badge}</span>
                          <span style={{ color: '#ddd', fontSize: '0.8rem', fontWeight: 700 }}>AI SIM</span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 'clamp(1.3rem, 1.8vw, 2rem)', color: '#fff', lineHeight: 1.1 }}>{matchup.title}</div>
                        <p style={{ margin: 0, color: '#ddd', fontSize: '0.96rem', lineHeight: 1.5 }}>{matchup.summary}</p>
                        <button onClick={() => loadArena(matchup.mode, matchup.title)} style={{ marginTop: 'auto', backgroundColor: matchup.accent, color: '#000', fontWeight: 900, border: '4px solid #000', borderRadius: '16px', padding: '0.8rem 1rem', cursor: 'pointer', fontSize: '1rem', textTransform: 'uppercase' }}>
                          {matchup.mode === '2V2' ? '🔥 ENTER 4-PLAYER ARENA' : '⚔️ ENTER MATCHUP ARENA'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leagueView === '2V2' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ color: '#39ff14', fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)', margin: 0, fontWeight: 900 }}>WORLD-FIRST 2v2 TAG-TEAM</h3>
                  <div style={{ background: 'linear-gradient(135deg, rgba(255,0,127,0.18), rgba(57,255,20,0.08), rgba(0,255,255,0.1))', border: '3px solid #ff007f', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ color: '#ffea00', fontWeight: 900, fontSize: '1.1rem' }}>THE ULTIMATE GRUDGE MATCH</span>
                    <div style={{ fontWeight: 900, fontSize: 'clamp(1.3rem, 2vw, 2.2rem)', color: '#00ffff', lineHeight: 1.2 }}>[YOU + Brendan 🦸‍♂️] vs. [Gabe 🦹‍♂️ + Z-Man 👑]</div>
                    <p style={{ margin: 0, color: '#ddd', fontSize: '1rem', maxWidth: '60ch' }}>Alternating half-moves, coordinated chaos, and enough tactical panic for the entire league group chat to implode.</p>
                    <button onClick={() => loadArena('2V2', 'Heroes vs. Villains Tag Match')} style={{ backgroundColor: '#ff007f', color: '#fff', fontSize: '1.1rem', fontWeight: 900, padding: '0.9rem 2rem', borderRadius: '18px', border: '4px solid #fff', cursor: 'pointer', marginTop: '0.5rem', width: '100%' }}>
                      🔥 ENTER 4-PLAYER ARENA
                    </button>
                  </div>
                </div>
              )}

              {leagueView === 'COACHING' && (
                <div className="player-map">
                  <div className="player-map__heading">
                    <div><span>YOUR CHESS TOWN JOURNEY</span><h3>PLAYER MAP</h3><p>Choose your next Mini Game. Each win lights a path from your first moves to pro-level pressure.</p></div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 900 }}>DIFFICULTY:</span>
                      {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const).map((diff) => (
                        <button key={diff} onClick={() => setCoachingDifficulty(diff)} style={{ backgroundColor: coachingDifficulty === diff ? '#00ffff' : '#111', color: coachingDifficulty === diff ? '#000' : '#00ffff', border: '1px solid #00ffff', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>{diff}</button>
                      ))}
                    </div>
                  </div>
                  <div className="player-map__route">
                    {COACHING_DRILLS.map((drill, index) => (
                      <button className="player-map__node" key={drill.mode} onClick={() => loadArena(drill.mode, drill.title)} style={{ '--node-color': drill.color } as React.CSSProperties}>
                        <span>{index + 1}</span><b>{drill.level}</b><strong>{drill.title}</strong><small>{drill.badge}</small>
                        {index < COACHING_DRILLS.length - 1 && <i aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: isMobile ? '1 1 35%' : 1, minHeight: 0, backgroundColor: '#000', borderRadius: '6px', border: '2px solid #ff007f', padding: isMobile ? '0.8rem' : '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(255,0,127,0.25)', overflow: 'hidden' }}>
              <h3 style={{ color: '#ff007f', fontSize: isMobile ? '1rem' : 'clamp(1.2rem, 1.6vw, 1.8rem)', borderBottom: '2px solid #ff007f', paddingBottom: isMobile ? '0.4rem' : '0.8rem', marginBottom: isMobile ? '0.5rem' : '1rem', fontWeight: 900, flexShrink: 0 }}>CHESTER'S FEED</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: isMobile ? '0.5rem' : '0.8rem', marginBottom: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
                <div style={{ backgroundColor: '#111', borderRadius: isMobile ? '10px' : '16px', border: '2px solid #ffea00', padding: isMobile ? '0.5rem' : '0.8rem', textAlign: 'center' }}>
                  <div style={{ color: '#ffea00', fontSize: isMobile ? '0.65rem' : '0.8rem', fontWeight: 900 }}>ARENA PEAK</div>
                  <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900 }}>10-1</div>
                </div>
                <div style={{ backgroundColor: '#111', borderRadius: isMobile ? '10px' : '16px', border: '2px solid #00ffff', padding: isMobile ? '0.5rem' : '0.8rem', textAlign: 'center' }}>
                  <div style={{ color: '#00ffff', fontSize: isMobile ? '0.65rem' : '0.8rem', fontWeight: 900 }}>TENSION</div>
                  <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900 }}>97%</div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1rem', overflowY: 'auto' }}>
                {COMMISSIONER_FEED.map((item) => (
                  <p key={item.label} style={{ fontSize: isMobile ? '0.75rem' : 'clamp(0.85rem, 1.1vw, 1.1rem)', color: '#ddd', margin: 0 }}><span style={{ color: item.color }}>[{item.label}]</span> <b>Chester:</b> "{item.text}"</p>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {scene === 'GAME' && (
        <div className="live-game-layout" style={{ 
          position: 'absolute',
          top: 0, 
          left: 0, 
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #031012 0%, #15000c 52%, #080a0b 100%)',
          backgroundAttachment: 'fixed',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '0.35rem', 
          gap: '0.3rem', 
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          
          {/* Animated background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30"></div>
          
          {/* Header badge */}
          <div className="live-game-header" style={{ position: 'absolute', top: '0.45rem', left: '0.55rem', backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', border: '1px solid #00ffff', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', zIndex: 50, flexShrink: 0 }}>
             <span style={{ fontSize: isMobile ? '0.75rem' : 'clamp(0.9rem, 1.3vw, 1.3rem)', color: '#fff', fontWeight: 900, letterSpacing: '1px' }}>
               <span style={{ display: 'inline-block', color: '#ff007f', animation: 'pulse 1.5s infinite', fontSize: '1.1em', marginRight: '0.5rem' }}>🔴</span> LIVE
             </span>
             <span style={{ fontSize: isMobile ? '0.8rem' : 'clamp(1rem, 1.4vw, 1.5rem)', color: '#ffea00', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMatchup}</span>
             <button onClick={createRemoteChallenge} style={{ marginLeft: 'auto', border: '1px solid #b8a2ff', borderRadius: '4px', padding: isMobile ? '.28rem .42rem' : '.4rem .6rem', background: '#100b1b', color: '#d8ccff', fontSize: isMobile ? '.55rem' : '.7rem', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>1V1 INVITE</button>
          </div>
          {/* Board section */}
          <div className="live-game-board" style={{ 
            width: 'min(92vw, 430px)', 
            height: 'auto', 
            flex: '0 0 auto',
            minHeight: 0,
            maxHeight: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexDirection: 'column',
            transition: 'all 0.4s ease', 
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 10
          }}>
             <div className="mobile-play-difficulty" aria-label="Choose Chester difficulty">
                 {(['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const).map((level) => (
                   <button key={level} type="button" onClick={() => setCoachingDifficulty(level)} aria-pressed={coachingDifficulty === level}>{level}</button>
                 ))}
             </div>
             <CapturedPieceJail capturedPieces={capturedPieces} color="b" label="BLACK CAPTURED" />
             <div style={{ 
               height: 'auto', 
               width: '100%',
               maxWidth: '100%',
               aspectRatio: '1/1', 
               background: 'linear-gradient(135deg, rgba(26,0,51,0.9), rgba(45,0,82,0.8))',
               border: '2px solid #00ffff',
               borderRadius: '4px',
               padding: 0, 
               position: 'relative', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               boxShadow: '0 0 32px rgba(0,255,255,0.35), inset 0 0 24px rgba(0,255,255,0.1)',
               boxSizing: 'border-box',
               backdropFilter: 'blur(2px)',
               margin: '0 auto'
             }}>
                <div id="phaser-game-container" style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                   <DojoEngineNoSSR
                     mode={gameMode}
                     playerColor={gameMode === 'PVP_REMOTE' && !remoteConnected ? null : remoteRole}
                     difficulty={coachingDifficulty}
                   />
                </div>
             </div>
             <CapturedPieceJail capturedPieces={capturedPieces} color="w" label="WHITE CAPTURED" />
             {(teleprompterText || teleprompterLoading) && (
               <Teleprompter text={teleprompterText} isLoading={teleprompterLoading} />
             )}
             <div className="mobile-game-commentary">
                 <ChesterTeleprompter text={hostBanter} isThinking={isThinking} isMobile />
             </div>
             <form className="play-chester-chat" onSubmit={handleSendMessage}>
               <input
                 value={chatInput}
                 onChange={(event) => setChatInput(event.target.value)}
                 placeholder="Ask Chester..."
                 aria-label="Message Chester"
               />
               <button type="submit" disabled={isThinking || !chatInput.trim()}>SEND</button>
             </form>
          </div>

          {/* Chester commentary panel */}
          {drawerOpen && arenaView === 'CHESTER' && (
            <div style={{ 
              position: (isMobile && arenaView === 'CHESTER') ? 'absolute' : 'static',
              top: 0, left: 0, right: 0, bottom: 0,
              width: (isMobile && arenaView === 'CHESTER') ? '100%' : (arenaView === 'CHESTER' ? 'min(100%, 1100px)' : 'clamp(340px, 40vw, 540px)'), 
              height: '100%', 
              flex: arenaView === 'CHESTER' ? '0 1 1100px' : '0 0 auto',
              minHeight: 0,
              maxHeight: '100dvh',
              background: (isMobile && arenaView === 'CHESTER') ? 'rgba(5, 0, 10, 0.96)' : 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(255,234,0,0.03) 100%)',
              backdropFilter: 'blur(12px)',
              border: isLandscape ? '2px solid #ffea00' : isMobile ? '4px solid #ffea00' : 'clamp(8px, 1.5vw, 16px) solid #ffea00', 
              borderTop: isMobile ? '4px solid rgba(255,234,0,0.5)' : undefined,
              borderLeft: isMobile ? undefined : 'clamp(8px, 1.5vw, 16px) solid rgba(255,234,0,0.5)',
              borderRadius: '8px',
              padding: isLandscape ? '0.55rem' : isPhonePortrait ? '1.5rem 1.2rem calc(5rem + env(safe-area-inset-bottom))' : isMobile ? '1rem' : 'clamp(1.5rem, 3vw, 3rem)', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: 'inset 0 0 60px rgba(255,234,0,0.15), 0 0 100px rgba(255,234,0,0.25)',
              boxSizing: 'border-box',
              overflowY: isPhonePortrait ? 'auto' : 'hidden',
              zIndex: 100
            }}>
              {/* Header */}
              <div style={{ 
                borderBottom: isMobile ? '3px solid rgba(255,234,0,0.3)' : 'clamp(6px, 1vw, 12px) solid rgba(255,234,0,0.3)', 
                paddingBottom: isMobile ? '0.8rem' : '1.5rem', 
                marginBottom: isMobile ? '0.8rem' : '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexShrink: 0 
              }}>
                <h2 style={{ 
                  color: '#ffea00', 
                  fontSize: isLandscape ? '1.1rem' : isMobile ? '1.8rem' : 'clamp(1.4rem, 2vw, 2rem)', 
                  fontWeight: 900, 
                  lineHeight: 1, 
                  margin: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  letterSpacing: '2px'
                }}>
                  <span style={{ display: 'inline-block', animation: 'pulse 1.2s infinite', fontSize: '0.8em' }}>🎙️</span>
                  CHESTER
                </h2>
                <button 
                  onClick={() => isMobile ? setArenaView('PLAY') : setScene('LEAGUE')} 
                  style={{ 
                    color: '#ffea00', 
                    fontSize: isMobile ? '1.8rem' : 'clamp(1.4rem, 2vw, 3rem)', 
                    fontWeight: 900, 
                    backgroundColor: 'transparent', 
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >                  {isMobile ? '🔽' : '✖'}
                </button>
              </div>

              <ChesterTeleprompter text={hostBanter} isThinking={isThinking} isMobile={isMobile} />

              {activeChallenge && (
                <div style={{ flexShrink: 0, background: 'linear-gradient(90deg, rgba(0,255,255,.12), rgba(255,0,127,.08))', borderLeft: '3px solid #00ffff', padding: isLandscape ? '0.35rem 0.45rem' : '0.65rem 0.75rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: '#00ffff', fontSize: isLandscape ? '0.45rem' : '0.62rem', fontWeight: 900, letterSpacing: '1px' }}><span>LIVE CHALLENGE</span><span>{activeChallenge.level}</span></div>
                  <div style={{ color: '#fff', fontSize: isLandscape ? '0.62rem' : '0.82rem', fontWeight: 900, margin: '0.18rem 0' }}>{activeChallenge.title}</div>
                  <div style={{ color: '#c7d5da', fontSize: isLandscape ? '0.5rem' : '0.68rem', lineHeight: 1.35 }}>{activeChallenge.objective}</div>
                </div>
              )}

              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: '0.5rem', border: '1px solid #39ff14', background: 'rgba(57,255,20,.07)', padding: isLandscape ? '0.35rem' : '0.55rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem', color: '#dfffd8', fontSize: isLandscape ? '0.48rem' : '0.66rem' }}>
                <span><b style={{ color: '#39ff14' }}>MISSION</b> {missionProgress}</span>
                <span>{gameMode.startsWith('PVP_') ? 'Live challenge' : 'Chester analysis'}</span>
              </div>

              {openingAssessment && (
                <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: isLandscape ? '0.45rem' : '0.8rem', alignItems: 'center', background: 'rgba(255,234,0,.1)', border: '2px solid #ffea00', borderRadius: '6px', padding: isLandscape ? '0.4rem' : '0.7rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem' }}>
                  <div style={{ width: isLandscape ? '52px' : '72px', aspectRatio: '1', display: 'grid', placeItems: 'center', background: '#ffea00', color: '#050008', fontSize: isLandscape ? '2rem' : '3rem', fontWeight: 900, borderRadius: '4px' }}>{openingAssessment.grade}</div>
                  <div>
                    <div style={{ color: '#ffea00', fontSize: isLandscape ? '0.52rem' : '0.7rem', fontWeight: 900, letterSpacing: '1px' }}>OPENING REPORT · {openingAssessment.score}/100</div>
                    <div style={{ color: '#fff', fontSize: isLandscape ? '0.52rem' : '0.72rem', marginTop: '0.2rem' }}>{openingAssessment.line}</div>
                    <div style={{ color: '#b8faff', fontSize: isLandscape ? '0.46rem' : '0.64rem', lineHeight: 1.35, marginTop: '0.25rem' }}>Strong: {openingAssessment.strengths.join(', ') || 'No principle secured yet'}.</div>
                    <div style={{ color: '#ffc0dc', fontSize: isLandscape ? '0.46rem' : '0.64rem', lineHeight: 1.35 }}>Next: {openingAssessment.improvements.join(', ') || 'Keep building with purpose'}.</div>
                  </div>
                </div>
              )}

              {postGameReport && (
                <div style={{ flexShrink: 0, background: 'rgba(184,162,255,.1)', border: '2px solid #b8a2ff', borderRadius: '6px', padding: isLandscape ? '0.4rem' : '0.7rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: isLandscape ? '46px' : '62px', aspectRatio: '1', background: '#b8a2ff', color: '#050008', fontSize: isLandscape ? '1.8rem' : '2.6rem', fontWeight: 900 }}>{postGameReport.grade}</span>
                    <div style={{ flex: 1 }}><b style={{ color: '#b8a2ff' }}>POST-GAME REPORT · {postGameReport.score}/100</b><div style={{ color: '#fff', fontSize: isLandscape ? '0.46rem' : '0.65rem', marginTop: '0.2rem' }}>{postGameReport.openingName} · {postGameReport.moves} ply</div></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem', marginTop: '0.55rem' }}>
                    {[['ACCURACY', postGameReport.accuracy], ['DEVELOP', postGameReport.development], ['KING', postGameReport.kingSafety], ['TACTICS', postGameReport.tactics]].map(([label, value]) => <div key={label} style={{ background: '#090510', padding: '0.35rem', textAlign: 'center', color: '#fff', fontSize: isLandscape ? '0.42rem' : '0.56rem' }}><b style={{ display: 'block', color: '#00ffff', fontSize: '1.15em' }}>{value}</b>{label}</div>)}
                  </div>
                  <div style={{ color: '#ffea00', fontSize: isLandscape ? '0.44rem' : '0.62rem', marginTop: '0.45rem' }}><b>TURNING POINT</b> {postGameReport.turningPoint}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.35rem', alignItems: 'center', marginTop: '0.55rem' }}>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('replay-step', { detail: { index: replay.index - 1 } }))} disabled={replay.index <= 0} style={{ padding: '0.35rem 0.55rem', background: '#00ffff', border: 0, fontWeight: 900, cursor: 'pointer' }}>◀</button>
                    <div style={{ textAlign: 'center', color: '#fff', fontSize: isLandscape ? '0.46rem' : '0.62rem' }}>REPLAY {replay.index}/{replay.total - 1} · {replay.move}</div>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('replay-step', { detail: { index: replay.index + 1 } }))} disabled={replay.index >= replay.total - 1} style={{ padding: '0.35rem 0.55rem', background: '#00ffff', border: 0, fontWeight: 900, cursor: 'pointer' }}>▶</button>
                  </div>
                </div>
              )}

              {gameMode === 'COACH_DAILY' && (
                <div style={{ flexShrink: 0, borderLeft: '3px solid #39ff14', padding: '0.4rem 0.6rem', marginBottom: '0.6rem', background: 'rgba(57,255,20,.05)', fontSize: isLandscape ? '0.46rem' : '0.64rem' }}>
                  <b style={{ color: '#39ff14' }}>TODAY’S LEADERBOARD</b>
                  {[...DAILY_LEADERS, ...(dailyScore === null ? [] : [{ name: guestName || 'You', score: dailyScore }])].sort((a, b) => b.score - a.score).map((entry, index) => <div key={`${entry.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', color: entry.name === (guestName || 'You') ? '#ffea00' : '#fff', marginTop: '0.18rem' }}><span>{index + 1}. {entry.name}</span><b>{entry.score}</b></div>)}
                </div>
              )}

              {achievements.length > 0 && (
                <div style={{ flexShrink: 0, display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.45rem', marginBottom: '0.2rem' }}>
                  {achievements.map((achievement) => <span key={achievement} title="Achievement unlocked" style={{ whiteSpace: 'nowrap', background: '#170d00', border: '1px solid #ffea00', color: '#ffea00', padding: '0.25rem 0.4rem', borderRadius: '4px', fontSize: isLandscape ? '0.42rem' : '0.56rem', fontWeight: 900 }}>★ {achievement}</span>)}
                </div>
              )}

              {/* Banter display */}
              <div style={{ 
                flex: 1, 
                minHeight: 0,
                overflowY: 'auto', 
                paddingRight: '0.5rem', 
                display: 'flex', 
                flexDirection: 'column',
                paddingBottom: isMobile ? '0.8rem' : '1.5rem'
              }}>
                {commentaryHistory.map((commentary, index) => {
                  const isLatest = index === commentaryHistory.length - 1;
                  return <p key={`${index}-${commentary.slice(0, 20)}`} style={{ color: isLatest && banterUpdated ? '#00ffff' : '#fff', fontSize: isLandscape ? '0.75rem' : isMobile ? '1.1rem' : arenaView === 'CHESTER' ? 'clamp(1.1rem, 1.5vw, 1.4rem)' : 'clamp(0.85rem, 1vw, 1.1rem)', fontWeight: isLatest ? 900 : 600, lineHeight: 1.5, margin: '0 0 1rem', padding: isLatest ? '0.8rem' : '0.6rem 0.8rem', background: isLatest ? 'rgba(0,255,255,.07)' : 'rgba(255,255,255,.03)', borderLeft: `4px solid ${isLatest ? '#00ffff' : '#554466'}`, whiteSpace: 'pre-wrap', transition: 'all 0.4s ease' }}>{commentary}</p>;
                })}
                {isThinking && (
                  <div style={{ 
                    color: '#ffea00', 
                    fontSize: isLandscape ? '0.7rem' : isMobile ? '1rem' : '1rem', 
                    fontWeight: 900, 
                    backgroundColor: 'rgba(255,234,0,0.1)', 
                    border: '3px solid #ffea00', 
                    padding: isMobile ? '0.8rem 1.2rem' : '1.2rem 1.5rem', 
                    borderRadius: '20px', 
                    display: 'inline-block', 
                    width: 'max-content', 
                    marginTop: '1rem', 
                    animation: 'pulse 1s infinite',
                    textShadow: '0 0 10px rgba(255,234,0,0.6)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    ⚡ Analyzing the board...
                  </div>
                )}
              </div>

              <div className="coaching-corner-chat">
                <ChesterChatOverlay
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  onSendMessage={handleSendMessage}
                  isThinking={isThinking}
                  chatError={chatError || ''}
                  isMobile={isMobile}
                />
              </div>

              {/* Action buttons */}
              <div style={{ 
                borderTop: isMobile ? '4px solid rgba(255,234,0,0.3)' : 'clamp(6px, 1vw, 12px) solid rgba(255,234,0,0.3)', 
                paddingTop: isMobile ? '0.6rem' : '1.5rem', 
                marginTop: isMobile ? '0.5rem' : '1rem', 
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.5rem' : '1rem'
              }}>

                {gameMode === 'PVP_REMOTE' && (
                  <div style={{ border: '1px solid #b8a2ff', padding: isLandscape ? '0.35rem' : isMobile ? '1rem' : '0.6rem', color: '#ddd', fontSize: isLandscape ? '0.52rem' : isMobile ? '1rem' : '0.72rem', background: 'rgba(184,162,255,.08)' }}>
                    <b style={{ color: remoteRole === 'w' ? '#39ff14' : '#b8a2ff', display: 'block', fontSize: isMobile ? '1.1rem' : 'inherit', marginBottom: '0.4rem' }}>{remoteRole === 'w' ? 'YOU ARE GREEN (WHITE SIDE)' : 'YOU ARE BLACK'}</b>{remoteStatus}
                    {remoteRole === 'w' && <>
                      <input readOnly value={challengeUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Challenge URL" style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem', boxSizing: 'border-box', background: '#08050f', border: '1px solid #b8a2ff', color: '#39ff14', fontSize: isMobile ? '1rem' : 'inherit', fontWeight: 900 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={copyChallengeLink} style={{ padding: '0.6rem', border: 0, background: '#b8a2ff', color: '#050008', fontWeight: 900, cursor: 'pointer', fontSize: isMobile ? '1rem' : 'inherit' }}>COPY URL</button>
                        <button onClick={shareChallengeLink} style={{ padding: '0.6rem', border: '1px solid #39ff14', background: '#081108', color: '#39ff14', fontWeight: 900, cursor: 'pointer', fontSize: isMobile ? '1rem' : 'inherit' }}>SHARE LINK</button>
                      </div>
                    </>}
                  </div>
                )}
                
                {matchOver && !demoActiveUI && (
                  <button
                    onClick={() => loadArena(gameMode, activeMatchup)}
                    style={{
                      width: '100%',
                      backgroundColor: '#ff007f',
                      color: '#fff',
                      fontSize: isLandscape ? '0.58rem' : isMobile ? '0.85rem' : '0.82rem',
                      fontWeight: 900,
                      padding: isLandscape ? '0.38rem' : isMobile ? '0.6rem' : '0.55rem',
                      borderRadius: isMobile ? '16px' : '28px',
                      border: isMobile ? '3px solid #fff' : 'clamp(4px, 0.8vw, 8px) solid #fff',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      boxShadow: '0 0 40px rgba(255,0,127,0.6)',
                      letterSpacing: '1px',
                      fontFamily: 'Comic Sans MS, sans-serif'
                    }}
                  >
                    🔁 REMATCH
                  </button>
                )}

                {!demoActiveUI && !gameMode.startsWith('COACH_') && !gameMode.startsWith('PVP_') && (
                  <button 
                    onClick={startAiDemo} 
                    style={{ 
                      width: '100%', 
                      backgroundColor: '#39ff14', 
                      color: '#000', 
                      fontSize: isLandscape ? '0.58rem' : isMobile ? '0.85rem' : '0.82rem', 
                      fontWeight: 900, 
                      padding: isLandscape ? '0.38rem' : isMobile ? '0.6rem' : '0.55rem', 
                      borderRadius: isMobile ? '16px' : '28px', 
                      border: isMobile ? '3px solid #000' : 'clamp(4px, 0.8vw, 8px) solid #000', 
                      cursor: 'pointer', 
                      textTransform: 'uppercase', 
                      boxShadow: '0 0 40px rgba(57,255,20,0.6), inset 0 0 20px rgba(255,255,255,0.2)',
                      transition: 'all 0.2s',
                      transform: 'scale(1)',
                      letterSpacing: '1px',
                      fontFamily: 'Comic Sans MS, sans-serif'
                    }} 
                    onMouseDown={(e) => {(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'}} 
                    onMouseUp={(e) => {(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}}
                  >
                    🚀 RUN AI DEMO
                  </button>
                )}

                {/* Chat with Chester section moved to overlay */}

                
                {isMobile && (
                  <button 
                    onClick={() => setArenaView('PLAY')} 
                    style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(255,234,0,0.15)', 
                      color: '#ffea00', 
                      fontSize: '1rem', 
                      fontWeight: 900, 
                      padding: '0.8rem', 
                      borderRadius: '8px', 
                      border: '2px solid #ffea00', 
                      cursor: 'pointer', 
                      textTransform: 'uppercase', 
                      boxSizing: 'border-box',
                      marginBottom: '0.5rem',
                      backdropFilter: 'blur(4px)',
                      transition: 'all 0.2s'
                    }}
                  >
                    ♟ BACK TO BOARD
                  </button>
                )}

                <button 
                  onClick={() => setScene('LEAGUE')} 
                  style={{ 
                    width: '100%', 
                    backgroundColor: 'rgba(0,255,255,0.1)', 
                    color: '#00ffff', 
                    fontSize: isLandscape ? '0.55rem' : isMobile ? '0.75rem' : '0.75rem', 
                    fontWeight: 900, 
                    padding: isLandscape ? '0.32rem' : isMobile ? '0.45rem' : '0.5rem', 
                    borderRadius: isMobile ? '14px' : '22px', 
                    border: isMobile ? '3px solid #00ffff' : 'clamp(4px, 0.8vw, 8px) solid #00ffff', 
                    cursor: 'pointer', 
                    textTransform: 'uppercase', 
                    boxSizing: 'border-box',
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,255,255,0.2)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(0,255,255,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,255,255,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  ⬅️ EXIT ARENA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
${GAME_SCENES_CSS}

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.06); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatPiece {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-30px) rotate(3deg); }
        }
        @keyframes sigilSpin { to { transform: rotate(360deg); } }
        @keyframes sigilSpinReverse { to { transform: rotate(-360deg); } }
        @keyframes knightBreath {
          0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); filter: brightness(1); }
          50% { transform: translateY(-10px) rotate(2deg) scale(1.045); filter: brightness(1.35); }
        }
        @keyframes eyeFlare {
          0%, 82%, 100% { opacity: 0.55; transform: scale(0.8); }
          88% { opacity: 1; transform: scale(2.4); box-shadow: 0 0 28px 12px #ff007f; }
        }
        @keyframes cunningFloat {
          0%, 100% { transform: translate(38px,-54px) rotate(-7deg) scale(.88); }
          50% { transform: translate(42px,-60px) rotate(5deg) scale(1.05); }
        }
        @keyframes sparkOrbit {
          0% { transform: rotate(0deg) translateX(42%) rotate(0deg) scale(.7); opacity: .3; }
          50% { opacity: 1; }
          100% { transform: rotate(360deg) translateX(42%) rotate(-360deg) scale(1.1); opacity: .3; }
        }
        @keyframes realmFlash {
          0%, 88%, 92%, 100% { filter: brightness(1); }
          89% { filter: brightness(1.8) contrast(1.35); }
          90% { filter: brightness(.65); }
        }
        @keyframes lightningStrike {
          0%, 86%, 90%, 100% { opacity: 0; }
          87% { opacity: .85; }
          88% { opacity: .08; }
          89% { opacity: .55; }
        }
        @keyframes horseArrival {
          0% { opacity: 0; transform: scale(.2) translateY(25px) rotate(-12deg); filter: blur(18px); }
          55% { opacity: 1; transform: scale(1.14) translateY(-6px) rotate(4deg); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0); }
        }
        @keyframes smirkArrival {
          0%, 42% { opacity: 0; transform: translate(30px,-32px) scale(.2) rotate(-20deg); }
          65%, 100% { opacity: 1; transform: translate(42px,-45px) scale(1) rotate(6deg); }
        }
        @keyframes titleArrival {
          0%, 48% { opacity: 0; letter-spacing: 18px; transform: translateY(12px); }
          100% { opacity: 1; letter-spacing: 4px; transform: translateY(0); }
        }
        @keyframes townArrival {
          0%, 68% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fogDrift {
          0%, 100% { transform: translate3d(-5%,0,0) scale(1.08); opacity: .25; }
          50% { transform: translate3d(5%,-2%,0) scale(1.18); opacity: .48; }
        }
        @keyframes storyImpact {
          0% { opacity: 0; transform: scale(1.18); filter: blur(14px); letter-spacing: 8px; }
          60% { opacity: 1; transform: scale(.98); filter: blur(0); }
          100% { transform: scale(1); letter-spacing: 0; }
        }
        @keyframes horizonPulse {
          0%, 100% { opacity: .15; transform: scaleX(.7); }
          50% { opacity: .75; transform: scaleX(1); }
        }
        .intro-rpg-stage::before { content: ''; position: absolute; inset: -20%; background: radial-gradient(ellipse at 50% 65%, rgba(128,0,128,.32), transparent 42%), radial-gradient(ellipse at 20% 50%, rgba(0,255,255,.13), transparent 32%), radial-gradient(ellipse at 80% 35%, rgba(255,0,127,.12), transparent 30%); filter: blur(35px); animation: fogDrift 8s ease-in-out infinite; pointer-events: none; }
        .intro-rpg-stage::after { content: ''; position: absolute; left: 10%; right: 10%; top: 50%; height: 1px; background: linear-gradient(90deg, transparent, #ff007f, #00ffff, transparent); box-shadow: 0 0 22px #00ffff; animation: horizonPulse 3s ease-in-out infinite; pointer-events: none; }
        .intro-story-text { animation: storyImpact .8s cubic-bezier(.16,.8,.22,1) both; }
        .opening-horse { position: relative; font-size: clamp(6rem, 19vw, 14rem); line-height: 1; filter: drop-shadow(0 0 18px #00ffff) drop-shadow(0 0 52px rgba(255,0,127,.7)); animation: horseArrival 1.35s cubic-bezier(.2,.85,.25,1) both, knightBreath 3s 1.35s ease-in-out infinite; }
        .opening-smirk { position: absolute; left: 50%; top: 50%; font-size: .28em; filter: drop-shadow(0 0 8px #ffea00); animation: smirkArrival 2.4s both; }
        .opening-hello { margin: .35rem 0 0; color: #eaffff; font-size: clamp(1.7rem, 6vw, 4.8rem); text-shadow: 0 0 18px #00ffff, 0 0 45px rgba(0,255,255,.65); animation: titleArrival 2.6s both; }
        .opening-town { margin: .55rem 0 0; color: #ff007f; font-size: clamp(.8rem, 2vw, 1.35rem); font-weight: 900; letter-spacing: 5px; text-shadow: 0 0 16px #ff007f; animation: townArrival 3.5s both; }
        .gothic-shock-scene { animation: realmFlash 6.5s infinite; }
        .gothic-shock-scene::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 14vw 4vw rgba(125,0,20,.42); animation: pulseOminous 3.5s infinite; }
        .shock-bolt { position: absolute; top: -15%; width: 2px; height: 85%; background: #eaffff; box-shadow: 0 0 8px #fff, 0 0 22px #00ffff; opacity: 0; transform: skewX(-20deg); animation: lightningStrike 6.5s infinite; }
        .shock-bolt::after { content: ''; position: absolute; top: 38%; left: -18px; width: 38px; height: 2px; background: inherit; box-shadow: inherit; transform: rotate(-44deg); }
        .shock-bolt-left { left: 18%; }
        .shock-bolt-right { right: 15%; animation-delay: 2.7s; transform: skewX(24deg); }
        .chester-intro-page { animation: fadeInUp 0.5s ease-out; }
        .chester-ring { position: absolute; inset: 4%; border-radius: 50%; border: 1px solid rgba(0,255,255,0.55); }
        .chester-ring::before, .chester-ring::after { content: ''; position: absolute; width: 12px; height: 12px; background: #00ffff; box-shadow: 0 0 16px #00ffff; transform: rotate(45deg); }
        .chester-ring::before { top: -6px; left: 50%; }
        .chester-ring::after { bottom: -6px; right: 50%; }
        .chester-ring-outer { animation: sigilSpin 16s linear infinite; box-shadow: inset 0 0 35px rgba(0,255,255,0.12), 0 0 35px rgba(0,255,255,0.18); }
        .chester-ring-inner { inset: 15%; border-color: rgba(255,0,127,0.65); animation: sigilSpinReverse 9s linear infinite; }
        .chester-knight-shadow, .chester-knight { position: absolute; font: 900 min(35vw, 280px)/1 Georgia, serif; }
        .chester-knight-shadow { color: #00181c; -webkit-text-stroke: 12px rgba(255,0,127,0.72); filter: blur(12px); }
        .chester-knight { color: #ffffff; -webkit-text-stroke: 4px #00ffff; text-shadow: 0 0 10px #fff, 0 0 22px #00ffff, 0 0 62px #00ffff, 14px 10px 0 rgba(255,0,127,0.48), -12px -8px 0 rgba(255,234,0,.18); animation: knightBreath 3s ease-in-out infinite; }
        .chester-eye { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ff007f; box-shadow: 0 0 18px 6px #ff007f; transform: translate(16px,-48px); animation: eyeFlare 4s infinite; }
        .chester-cunning { position: absolute; z-index: 4; font-size: clamp(1.5rem, 4vw, 2.8rem); filter: drop-shadow(0 0 12px #ffea00); animation: cunningFloat 2.2s ease-in-out infinite; }
        .chester-spark { position: absolute; z-index: 3; color: #ffea00; font-size: clamp(1.2rem, 3vw, 2rem); text-shadow: 0 0 15px #ffea00; animation: sparkOrbit 5s linear infinite; }
        .spark-one { inset: 8%; }
        .spark-two { inset: 19%; color: #ff007f; text-shadow: 0 0 15px #ff007f; animation-direction: reverse; animation-duration: 3.5s; }
        .chester-enter { transition: transform .2s, box-shadow .2s; }
        .chester-enter:hover { transform: translateY(-3px); box-shadow: 0 0 42px #00ffff !important; }
        .home-hub-card {
          opacity: 0;
          animation: fadeInUp 0.55s ease-out forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .arena-top-nav button {
          border-radius: 4px !important;
          font-family: Georgia, 'Times New Roman', serif !important;
          letter-spacing: .6px !important;
          text-transform: uppercase;
          transition: transform .16s ease, filter .16s ease, box-shadow .16s ease !important;
        }
        .arena-top-nav button:hover {
          transform: translateY(-2px);
          filter: brightness(1.3);
          box-shadow: 0 0 16px currentColor !important;
        }
        .home-hub-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 0 34px currentColor;
        }
        .home-float-piece {
          animation: floatPiece 6s ease-in-out infinite;
        }
        @media (orientation: landscape) and (max-height: 600px) {
          .chester-knight-shadow, .chester-knight { font-size: 34vh; }
          .chester-eye { transform: translate(8px,-22px) scale(.65); }
          .home-hub-card { animation-duration: .35s; }
        }
        @media (max-width: 860px) {
          .arena-top-nav {
            width: 100%;
            flex-wrap: wrap !important;
            gap: 3px !important;
          }
          .arena-top-nav button {
            min-width: 0 !important;
            padding: 5px 6px !important;
            font-size: 9px !important;
            line-height: 1.05 !important;
            white-space: nowrap;
          }
        }
        @media (max-width: 430px) {
          .arena-top-nav button {
            padding: 4px !important;
            font-size: 8px !important;
            letter-spacing: 0 !important;
          }
          .home-hub-card span:nth-child(3) { display: none; }
        }
      `}</style>
    </div>
  );
}
