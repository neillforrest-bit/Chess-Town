'use client'; 

import dynamic from 'next/dynamic'; 
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { askChesterChat, askChesterAdminChat, askGrandmaster, askCommentary } from '@/app/actions';
import { ChesterAvatar, ChesterChatOverlay, ChesterTeleprompter } from '@/components/ChesterUI';
import CapturedPieceJails from '@/components/CapturedPieceJails';
import type { CapturedPiece } from '@/components/CapturedPieceJails';
import { SeasonHub, TownSquare } from '@/components/SocialHub';
import ChessTownLanding from '@/components/ChessTownLanding';
import PostGameGazette from '@/components/PostGameGazette';
import Teleprompter from '@/components/Teleprompter';
import type { EngineTelemetry } from '@/lib/stockfish';

const DojoEngineNoSSR = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

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
  "Hi, I am Chester, your guide to Chess Town - the chess club that actually talks back.",
  "Learn with coaching resources, test yourself in mini-game challenges, or play me from beginner through expert difficulty.",
  "Then bring your people: find a PvP rival, send a social challenge, and build a league table with your friends. Chess Town is a community, not a lonely ladder."
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
    `🐴💬 \"Your move now, ${name}.\" 🏰`,
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
  const router = useRouter();
  const [username, setUsername] = useState('');

  const enterArena = (event: React.FormEvent) => {
    event.preventDefault();
    const savedName = username.trim().slice(0, 30) || 'Challenger';
    localStorage.setItem('chessTownUser', savedName);
    router.push('/arena');
  };

  return <main className="entry-gate" aria-labelledby="entry-gate-title">
    <div className="entry-gate__grid" aria-hidden="true" />
    <section className="entry-gate__content">
      <div className="entry-gate__chester"><ChesterAvatar isThinking={false} size="large" /></div>
      <p>THE BOARD IS WAITING</p>
      <h1 id="entry-gate-title">Chess Town</h1>
      <form onSubmit={enterArena}>
        <label htmlFor="challenger-name">CHALLENGER NAME</label>
        <input id="challenger-name" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your name, Challenger..." autoComplete="name" maxLength={30} />
        <button type="submit">ENTER <span aria-hidden="true">→</span></button>
      </form>
    </section>
  </main>;
}

function LegacyHome() {
  const router = useRouter();
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

  const [scene, setScene] = useState<SceneState>('INTRO');
  const [pageIndex, setPageIndex] = useState(0);
  const [displayedIntro, setDisplayedIntro] = useState('');
  
  const [activeMatchup, setActiveMatchup] = useState('');
  const [gameMode, setGameMode] = useState('STANDBY');
  const [coachingDifficulty, setCoachingDifficulty] = useState<'BEGINNER' | 'CASUAL' | 'PRO'>('CASUAL');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [arenaView, setArenaView] = useState<'BOARD' | 'CHESTER' | 'SPLIT'>('BOARD');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'chester'; text: string; education?: string; kind?: 'chat' | 'analysis' }[]>([]);
  const [chatError, setChatError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hostBanter, setHostBanter] = useState("🎙️ CHESTER: Arena locked. This is where bad decisions meet their final judgment.");
  const [commentaryHistory, setCommentaryHistory] = useState<string[]>([]);
  const [currentGameState, setCurrentGameState] = useState<any>(null);
  const [banterUpdated, setBanterUpdated] = useState(false);
  
  const [leagueView, setLeagueView] = useState<'STANDINGS' | 'MATCHUPS' | '2V2' | 'COACHING' | 'PLAYOFFS'>('COACHING');
  const [demoActiveUI, setDemoActiveUI] = useState(false); 
  const [matchOver, setMatchOver] = useState(false);
  const [matchResult, setMatchResult] = useState<{ pgn: string; result: 'checkmate' | 'draw' | 'resigned' } | null>(null);
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
  const [prediction, setPrediction] = useState<{ open: boolean; choice: string; result: string; points: number }>({ open: false, choice: '', result: '', points: 0 });
  const [remoteRole, setRemoteRole] = useState<'w' | 'b' | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState('');
  const [challengeUrl, setChallengeUrl] = useState('');
  const peerRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const commentaryRequestRef = useRef(0);
  const teleprompterRequestRef = useRef(0);
  const [teleprompterText, setTeleprompterText] = useState('');
  const [teleprompterLoading, setTeleprompterLoading] = useState(false);

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
            
            // Instructions for Chester
            instruction: payload?.type === 'summary' 
              ? 'Generate a quick, 2-sentence summary of the game based on the PGN highlighting the defining blunder or brilliant move. Use a punchy, witty, dry British sense of humour.'
              : (payload?.openingName && ['Trompowsky Attack', 'Halloween Gambit', 'Bongcloud Attack', 'Bongcloud'].some(spicy => payload.openingName.includes(spicy)))
                ? `You detected the '${payload.openingName}'. Drop a punchy, witty, dry British comment about this chaotic opening.`
                : 'Generate punchy, witty, strategic chess commentary on this move with a dry British sense of humour, grounded in the engine move-quality grade provided',
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

    const handleMatchComplete = (e: Event) => {
      setMatchOver(true);
      const detail = (e as CustomEvent<{ pgn?: string; result?: 'checkmate' | 'draw' | 'resigned' }>).detail;
      if (detail?.pgn && detail.result) setMatchResult({ pgn: detail.pgn, result: detail.result });
    };
    const handleCapture = (e: Event) => setCapturedPieces((pieces) => [...pieces, (e as CustomEvent<CapturedPiece>).detail]);
    const handleOpeningAssessment = (e: Event) => {
      setOpeningAssessment((e as CustomEvent).detail);
      if (['A', 'B'].includes((e as CustomEvent).detail?.grade)) unlockAchievement('Center Controller');
      setArenaView('CHESTER');
    };
    const handleGameReport = (e: Event) => {
      const report = (e as CustomEvent).detail;
      setPostGameReport(report);
      setReplay({ index: report.moves, total: report.moves + 1, move: 'Final position' });
      unlockAchievement('Game Finisher');
      setArenaView('CHESTER');
    };
    const handlePredictionOpen = () => setPrediction((current) => ({ ...current, open: true, choice: '', result: '' }));
    const handlePredictionResult = (e: Event) => {
      const result = (e as CustomEvent).detail;
      setPrediction((current) => ({
        ...current,
        open: false,
        result: current.choice ? `${result.move}: ${result.category}${current.choice === result.category ? ' · CORRECT +10' : ''}` : `${result.move}: ${result.category}`,
        points: current.points + (current.choice === result.category ? 10 : 0),
      }));
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
        if (requestId !== teleprompterRequestRef.current) return;
        setTeleprompterText(commentary);
      } finally {
        if (requestId === teleprompterRequestRef.current) setTeleprompterLoading(false);
      }
    };

    window.addEventListener('dojo-banter', handleBanter);
    window.addEventListener('demo-complete', handleDemoComplete);
    window.addEventListener('match-complete', handleMatchComplete);
    window.addEventListener('piece-captured', handleCapture);
    window.addEventListener('opening-assessment', handleOpeningAssessment);
    window.addEventListener('game-report', handleGameReport);
    window.addEventListener('prediction-open', handlePredictionOpen);
    window.addEventListener('prediction-result', handlePredictionResult);
    window.addEventListener('replay-status', handleReplayStatus);
    window.addEventListener('dojo-engine-telemetry', handleEngineTelemetry);
    
    return () => {
      window.removeEventListener('dojo-banter', handleBanter);
      window.removeEventListener('demo-complete', handleDemoComplete);
      window.removeEventListener('match-complete', handleMatchComplete);
      window.removeEventListener('piece-captured', handleCapture);
      window.removeEventListener('opening-assessment', handleOpeningAssessment);
      window.removeEventListener('game-report', handleGameReport);
      window.removeEventListener('prediction-open', handlePredictionOpen);
      window.removeEventListener('prediction-result', handlePredictionResult);
      window.removeEventListener('replay-status', handleReplayStatus);
      window.removeEventListener('dojo-engine-telemetry', handleEngineTelemetry);
    };
  }, [scene, activeMatchup, gameMode]);

  const loadArena = (mode: string, matchTitle: string) => {
    setDemoActiveUI(false);
    setIsThinking(false);
    setMatchOver(false);
    setMatchResult(null);
    setCapturedPieces([]);
    setOpeningAssessment(null);
    setOpeningName('Opening book loading');
    setPrincipleStreak(0);
    setMissionProgress(mode === 'COACH_DAILY' ? 'Score 80+ on your move' : mode === 'COACH_PRACTICE_OPENING' ? 'Build a 3-move principle streak' : 'Complete Chester’s objective');
    setDailyScore(null);
    setPostGameReport(null);
    setReplay({ index: 0, total: 1, move: 'Start' });
    setPrediction({ open: false, choice: '', result: '', points: 0 });
    setCommentaryHistory([]);
    setChatMessages([]);
    setChatError('');
    setTeleprompterText('');
    setTeleprompterLoading(false);
    setArenaView('BOARD');
    const drill = COACHING_DRILLS.find((item) => item.mode === mode);
    setActiveChallenge(drill ? { title: drill.title, objective: drill.detail, level: drill.level } : null);
    setActiveMatchup(matchTitle);
    setGameMode(mode);
    setScene('GAME');
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
    const rawMessage = chatInput.trim();
    const isAdmin = /^\/sudo\b/i.test(rawMessage);
    const message = isAdmin ? rawMessage.replace(/^\/sudo\s*/i, '') : rawMessage;
    setChatInput('');
    setChatError('');
    const conversationHistory = [...chatMessages, { role: 'user' as const, text: rawMessage }].slice(-8);
    setChatMessages(conversationHistory);
    setIsThinking(true);
    try {
      const { reply, toolCall } = await askChesterAdminChat(JSON.stringify({
        ...currentGameState,
        message,
        type: 'chat',
        mode: gameMode,
        matchup: activeMatchup,
        openingAssessment,
        conversationHistory,
        isAdmin,
        instruction: 'Answer the latest player message directly as Chester. Use the conversation history, be strategically useful, and give a clear next action.',
      }));
      if (toolCall === 'reset_chess_board') loadArena(gameMode, activeMatchup);
      if (toolCall === 'toggle_board_theme') window.dispatchEvent(new CustomEvent('toggle-board-theme'));
      setChatMessages((current) => [...current, { role: 'chester' as const, text: reply, kind: 'chat' as const }].slice(-10));
      setHostBanter(`🎙️ CHESTER: ${reply}`);
      setBanterUpdated(true);
      setTimeout(() => setBanterUpdated(false), 600);
    } catch {
      setChatError('Chester could not reach the analysis desk. Tap retry in a moment.');
      setChatInput(rawMessage);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', backgroundColor: '#050008', color: 'white', fontFamily: 'Georgia, Times New Roman, serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      
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
           <button onClick={() => router.push('/meet-chester')} style={{ marginTop: isLandscape ? '0.35rem' : '0.8rem', background: 'var(--arena-pink)', color: '#020502', border: '1px solid #ff2b88', boxShadow: '0 0 32px rgba(255,43,136,.75)', letterSpacing: '2px', cursor: 'pointer', fontWeight: 900, padding: isLandscape ? '0.45rem 1.2rem' : '0.8rem 2rem', fontSize: isLandscape ? '0.65rem' : '1rem' }}>MEET CHESTER →</button>
        </div>
      )}

      {scene === 'INTRO' && (
        <div className="chester-choice-intro">
          <div className="chester-choice-avatar" aria-hidden="true">♞</div>
          <section className="chester-choice-bubble">
            <span>CHESTER IS ONLINE</span>
            <h1>Welcome to Chess Town!</h1>
            <p>I&apos;m Chester. Master the basics, dominate league tables, or drop a cheeky Bongcloud on a friend. I&apos;ve got your back. Where are we heading first?</p>
            <div className="chester-choice-actions">
              <button onClick={() => router.push('/chester-challenge')}>Chester Challenge <small>1 Puzzle. 24 Hours. Global Glory.</small></button>
              <button onClick={() => router.push('/arena?view=mini-games')}>Player Map <small>Mini Games and learning progress.</small></button>
              <button onClick={() => router.push('/arena?view=play')}>Play Chester <small>Choose Beginner through Expert.</small></button>
              {/* <button onClick={() => router.push('/brawl')}>ENTER THE BRAWL <small>Choose two difficulty levels and face off locally.</small></button> */}
              <button onClick={() => router.push('/arena?view=matchups')}>Enter the Arena <small>Community PvP and matchmaking.</small></button>
              <button onClick={() => router.push('/arena?view=leagues')}>Town Hall <small>Leagues, challenges, and social play.</small></button>
              <button onClick={() => router.push('/profile')}>My Profile <small>Points, wins, rank, and progress.</small></button>
            </div>
          </section>
        </div>
      )}

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
            <p style={{ color: '#b8faff', fontSize: isLandscape ? '0.82rem' : 'clamp(1rem, 2vw, 1.35rem)', lineHeight: 1.45, maxWidth: '55ch', margin: isLandscape ? '0 0 1rem' : '0 auto 1.6rem' }}>I am Chester. I will help you learn, set you mini-game challenges, meet you at your chosen difficulty, and keep the whole town talking. Build a league, invite friends, and make every match matter.</p>
            <button onClick={() => router.push('/arena')} className="chester-enter"  style={{ backgroundColor: '#00ffff', color: '#020005', fontSize: isLandscape ? '0.82rem' : 'clamp(1rem, 2vw, 1.35rem)', fontWeight: 900, padding: isLandscape ? '0.65rem 1.4rem' : '0.9rem 2rem', borderRadius: '4px', border: '1px solid #dfffff', boxShadow: '0 0 25px rgba(0,255,255,0.8)', cursor: 'pointer', letterSpacing: '2px' }}>ENTER ARENA →</button>
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
                  <Link href="/arena" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #00ffff', borderRadius: '4px', padding: '0.9rem 1.15rem', background: 'rgba(0,229,229,.12)', color: '#eaffff', boxShadow: '0 0 28px rgba(0,229,229,.45), inset 0 0 18px rgba(0,229,229,.08)', fontWeight: 900, letterSpacing: '1.5px', textAlign: 'center', textDecoration: 'none' }}>ENTER THE ARENA</Link>
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

      {scene === 'LEAGUE' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '0.6rem' : 'clamp(1rem, 2vw, 2.5rem)', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '0.5rem' : 0, marginBottom: isMobile ? '0.6rem' : '1.5rem', flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.2rem' : 'clamp(2rem, 3.8vw, 4rem)', color: '#ffea00', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 0 25px rgba(255,234,0,0.8)', margin: 0 }}>CHOOSE YOUR GAME</h1>
            </div>
            <div className="arena-top-nav" style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.8rem' }}>
              <button onClick={() => setScene('HOME')} style={{ flex: isMobile ? 1 : 'none', backgroundColor: '#111', color: '#fff', border: isMobile ? '3px solid #fff' : '4px solid #fff', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>🏠 HOME</button>
              <button onClick={() => loadArena('COACH_OPENING', 'You vs. Chester')} style={{ flex: isMobile ? 1 : 'none', backgroundColor: '#39ff14', color: '#020502', border: isMobile ? '3px solid #39ff14' : '4px solid #39ff14', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '4px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>PLAY NOW</button>
              <button onClick={() => setLeagueView('MATCHUPS')} style={{ flex: isMobile ? 1 : 'none', backgroundColor: leagueView === 'MATCHUPS' ? '#ffea00' : '#111', color: leagueView === 'MATCHUPS' ? '#000' : '#fff', border: isMobile ? '3px solid #ffea00' : '4px solid #ffea00', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>1v1</button>
              <button onClick={() => setLeagueView('2V2')} style={{ flex: isMobile ? 1 : 'none', backgroundColor: leagueView === '2V2' ? '#39ff14' : '#111', color: leagueView === '2V2' ? '#000' : '#fff', border: isMobile ? '3px solid #39ff14' : '4px solid #39ff14', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>2v2</button>
              <button onClick={() => setLeagueView('COACHING')} style={{ flex: isMobile ? 1 : 'none', backgroundColor: leagueView === 'COACHING' ? '#ff007f' : '#111', color: '#fff', border: isMobile ? '3px solid #ff007f' : '4px solid #ff007f', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>COACH</button>
              <button onClick={createRemoteChallenge} style={{ flex: isMobile ? 1 : 'none', backgroundColor: '#111', color: '#fff', border: isMobile ? '3px solid #b8a2ff' : '4px solid #b8a2ff', padding: isMobile ? '0.4rem 0.3rem' : '0.6rem 1.2rem', borderRadius: '15px', fontWeight: 900, fontSize: isMobile ? '0.65rem' : 'clamp(0.8rem, 1.2vw, 1.1rem)', cursor: 'pointer' }}>CHALLENGE</button>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ color: '#ff007f', fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)', margin: 0, fontWeight: 900 }}>CHESTER'S COACHING LAB</h3>
                    <p style={{ color: '#ddd', margin: '0.4rem 0 0.8rem', lineHeight: 1.4 }}>Pick your next lesson, move the pieces yourself, and Chester will react to every decision in real time.</p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 900 }}>DIFFICULTY:</span>
                      {(['BEGINNER', 'CASUAL', 'PRO'] as const).map((diff) => (
                        <button key={diff} onClick={() => setCoachingDifficulty(diff)} style={{ backgroundColor: coachingDifficulty === diff ? '#00ffff' : '#111', color: coachingDifficulty === diff ? '#000' : '#00ffff', border: '1px solid #00ffff', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>{diff}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                    {COACHING_DRILLS.map((drill) => (
                      <div key={drill.mode} style={{ background: `linear-gradient(145deg, ${drill.color}1f, #08000f)`, border: `3px solid ${drill.color}`, borderRadius: '20px', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', minHeight: '230px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}><span style={{ alignSelf: 'flex-start', color: '#000', backgroundColor: drill.color, padding: '0.3rem 0.55rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900 }}>{drill.badge}</span><span style={{ color: drill.color, fontWeight: 900, fontSize: '0.7rem' }}>{drill.level}</span></div>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', lineHeight: 1.05 }}>{drill.title}</h4>
                        <p style={{ margin: 0, color: '#ddd', lineHeight: 1.45, fontSize: '0.9rem' }}>{drill.detail}</p>
                        <button onClick={() => loadArena(drill.mode, drill.title)} style={{ marginTop: 'auto', backgroundColor: drill.color, border: '3px solid #000', borderRadius: '12px', padding: '0.7rem', color: '#000', cursor: 'pointer', fontWeight: 900, fontSize: '0.9rem' }}>ENTER COACHING BOARD</button>
                      </div>
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
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100dvh', 
          background: 'linear-gradient(135deg, #031012 0%, #15000c 52%, #080a0b 100%)',
          backgroundAttachment: 'fixed',
          display: 'flex', 
          flexDirection: isLandscape ? 'row' : isMobile ? 'column' : 'row',
          alignItems: 'stretch', 
          justifyContent: isMobile ? 'flex-start' : 'center', 
          padding: isLandscape ? '0.3rem' : isPhonePortrait ? '0.25rem' : 'clamp(1rem, 2vw, 2rem)', 
          gap: isLandscape ? '0.4rem' : isMobile ? '0.5rem' : 'clamp(1rem, 2vw, 2.5rem)', 
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          
          {/* Animated background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30"></div>
          
          {/* Header badge */}
          <div style={{ position: isLandscape ? 'absolute' : isMobile ? 'static' : 'absolute', top: isLandscape ? '0.45rem' : '1.5rem', left: isLandscape ? '0.55rem' : '1.5rem', backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', border: isLandscape ? '1px solid #00ffff' : isMobile ? '2px solid #00ffff' : '3px solid #00ffff', padding: isLandscape ? '0.25rem 0.5rem' : isPhonePortrait ? '0.3rem 0.5rem' : '0.8rem 1.5rem', borderRadius: isLandscape ? '4px' : isPhonePortrait ? '5px' : '20px', display: 'flex', alignItems: 'center', gap: isLandscape ? '0.3rem' : isMobile ? '0.5rem' : '1rem', zIndex: 50, flexShrink: 0, alignSelf: isPhonePortrait ? 'stretch' : undefined, marginBottom: isPhonePortrait ? '0.2rem' : 0 }}>
             <span style={{ fontSize: isMobile ? '0.75rem' : 'clamp(0.9rem, 1.3vw, 1.3rem)', color: '#fff', fontWeight: 900, letterSpacing: '1px' }}>
               <span style={{ display: 'inline-block', color: '#ff007f', animation: 'pulse 1.5s infinite', fontSize: '1.1em', marginRight: '0.5rem' }}>🔴</span> LIVE
             </span>
             <span style={{ fontSize: isMobile ? '0.8rem' : 'clamp(1rem, 1.4vw, 1.5rem)', color: '#ffea00', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMatchup}</span>
          </div>
          <div className="arena-top-nav" style={{ position: 'absolute', top: isLandscape ? '0.35rem' : '0.7rem', right: isLandscape ? '0.5rem' : '1rem', zIndex: 60, display: 'flex', gap: isLandscape ? '0.2rem' : '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: isLandscape ? '62%' : '70%' }}>
            {[
              ['LOBBY', () => setScene('HOME')],
              ['NEW GAME', () => loadArena('COACH_OPENING', 'You vs. Chester')],
              ['MINI GAMES', () => { setLeagueView('COACHING'); setScene('LEAGUE'); }],
              ['INVITE', createRemoteChallenge],
            ].map(([label, action]) => (
              <button key={label as string} onClick={action as () => void} style={{ background: 'rgba(4,0,10,.9)', border: '1px solid rgba(184,162,255,.7)', color: '#dfeaff', padding: isLandscape ? '0.18rem 0.32rem' : '0.3rem 0.5rem', fontSize: isLandscape ? '0.42rem' : '0.58rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '.5px' }}>{label as string}</button>
            ))}
          </div>

          <div aria-label="Arena view" style={{ position: 'absolute', left: '50%', bottom: isLandscape ? '0.35rem' : '0.75rem', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', padding: '0.25rem', gap: '0.2rem', background: 'rgba(0,0,0,.92)', border: '2px solid #00ffff', borderRadius: '6px', boxShadow: '0 0 28px rgba(0,255,255,.35)' }}>
            {(['BOARD', 'CHESTER', ...(!isMobile && !isLandscape ? ['SPLIT'] : [])] as const).map((view) => (
              <button key={view} onClick={() => setArenaView(view as 'BOARD'|'CHESTER'|'SPLIT')} aria-pressed={arenaView === view} style={{ border: 0, borderRadius: '4px', padding: isLandscape ? '0.3rem 0.5rem' : '0.5rem 0.8rem', background: arenaView === view ? (view === 'CHESTER' ? '#ffea00' : '#00ffff') : 'transparent', color: arenaView === view ? '#050008' : '#fff', fontSize: isLandscape ? '0.48rem' : '0.68rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '1px' }}>{view === 'BOARD' ? '♟ PLAY' : view === 'CHESTER' ? '◉ COACH' : '▥ DUAL'}</button>
            ))}
          </div>

          {/* Board section */}
          <div className="live-game-board" style={{ 
            width: arenaView === 'SPLIT' ? '50%' : isPhonePortrait ? '100%' : '52%', 
            height: isPhonePortrait ? 'auto' : '100%', 
            flex: isPhonePortrait ? '0 0 auto' : arenaView === 'SPLIT' ? '0 1 50%' : '1 1 52%',
            minHeight: 0,
            maxHeight: '100dvh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isPhonePortrait ? 'flex-start' : 'center', 
            flexDirection: isPhonePortrait ? 'column' : 'row',
            transition: 'all 0.4s ease', 
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 10
          }}>
             {isPhonePortrait && (
               <div style={{ display: 'flex', gap: '0.35rem', maxWidth: '100%', marginBottom: '0.5rem', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                 <span style={{ background: 'rgba(0,0,0,.88)', border: '2px solid #ffea00', color: '#ffea00', padding: '0.35rem 0.55rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{openingName}</span>
                 <span style={{ background: principleStreak >= 3 ? '#39ff14' : 'rgba(0,0,0,.88)', border: '2px solid #39ff14', color: principleStreak >= 3 ? '#050008' : '#39ff14', padding: '0.35rem 0.55rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900, boxShadow: principleStreak >= 3 ? '0 0 24px rgba(57,255,20,.75)' : 'none' }}>STREAK ×{principleStreak}</span>
               </div>
             )}
             <div style={{ 
               height: isPhonePortrait ? 'auto' : '100%', 
               width: '100%',
               maxWidth: '100%',
               aspectRatio: '1/1', 
               background: 'linear-gradient(135deg, rgba(26,0,51,0.9), rgba(45,0,82,0.8))',
               border: isPhonePortrait ? '2px solid #00ffff' : isMobile ? '4px solid #00ffff' : '6px solid #00ffff',
               borderRadius: isPhonePortrait ? '4px' : '8px',
               padding: isPhonePortrait ? 0 : isMobile ? '0.5rem' : '1rem', 
               position: 'relative', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               boxShadow: isPhonePortrait ? 'none' : '0 0 80px rgba(0,255,255,0.35), inset 0 0 40px rgba(0,255,255,0.1)',
               boxSizing: 'border-box',
               backdropFilter: 'blur(2px)',
               margin: '0 auto'
             }}>
                {!isPhonePortrait && (
                  <div style={{ position: 'absolute', top: isLandscape ? '0.35rem' : '0.7rem', left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', gap: '0.35rem', maxWidth: '92%', whiteSpace: 'nowrap' }}>
                    <span style={{ background: 'rgba(0,0,0,.88)', border: '2px solid #ffea00', color: '#ffea00', padding: '0.35rem 0.55rem', borderRadius: '4px', fontSize: isLandscape ? '0.48rem' : '0.68rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{openingName}</span>
                    <span style={{ background: principleStreak >= 3 ? '#39ff14' : 'rgba(0,0,0,.88)', border: '2px solid #39ff14', color: principleStreak >= 3 ? '#050008' : '#39ff14', padding: '0.35rem 0.55rem', borderRadius: '4px', fontSize: isLandscape ? '0.48rem' : '0.68rem', fontWeight: 900, boxShadow: principleStreak >= 3 ? '0 0 24px rgba(57,255,20,.75)' : 'none' }}>STREAK ×{principleStreak}</span>
                  </div>
                )}
                {!isPhonePortrait && prediction.open && (
                  <div style={{ position: 'absolute', left: '50%', bottom: isLandscape ? '2.4rem' : '4.2rem', transform: 'translateX(-50%)', zIndex: 40, width: 'min(92%, 520px)', background: 'rgba(0,0,0,.94)', border: '3px solid #ff007f', borderRadius: '6px', padding: '0.65rem', textAlign: 'center', boxShadow: '0 0 35px rgba(255,0,127,.5)' }}>
                    <div style={{ color: '#fff', fontSize: isLandscape ? '0.55rem' : '0.78rem', fontWeight: 900, marginBottom: '0.45rem' }}>PREDICT CHESTER’S REPLY · {prediction.points} PTS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
                      {['CAPTURE', 'CHECK', 'DEVELOP', 'MANEUVER'].map((choice) => <button key={choice} onClick={() => setPrediction((current) => ({ ...current, choice }))} style={{ border: `2px solid ${prediction.choice === choice ? '#ffea00' : '#ff007f'}`, background: prediction.choice === choice ? '#ffea00' : '#15000c', color: prediction.choice === choice ? '#050008' : '#fff', padding: '0.45rem 0.2rem', fontSize: isLandscape ? '0.42rem' : '0.58rem', fontWeight: 900, cursor: 'pointer' }}>{choice}</button>)}
                    </div>
                  </div>
                )}
                <div id="phaser-game-container" style={{ width: '100%', height: '100%', borderRadius: isPhonePortrait ? '4px' : isMobile ? '18px' : '32px', overflow: 'hidden' }}>
                   <DojoEngineNoSSR
                     mode={gameMode}
                     playerColor={gameMode === 'PVP_REMOTE' && !remoteConnected ? null : remoteRole}
                     difficulty={coachingDifficulty}
                   />
                </div>
             </div>
             {arenaView === 'BOARD' && (teleprompterText || teleprompterLoading) && (
               <div style={{ width: '100%', marginTop: '0.5rem' }}>
                 <Teleprompter text={teleprompterText} isLoading={teleprompterLoading} />
               </div>
             )}
             {isPhonePortrait && prediction.open && (
               <div style={{ width: '100%', background: 'rgba(0,0,0,.94)', border: '2px solid #ff007f', borderRadius: '4px', padding: '0.5rem', textAlign: 'center', marginTop: '0.5rem' }}>
                 <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.35rem' }}>PREDICT CHESTER’S REPLY · {prediction.points} PTS</div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.2rem' }}>
                   {['CAPTURE', 'CHECK', 'DEVELOP', 'MANEUVER'].map((choice) => <button key={choice} onClick={() => setPrediction((current) => ({ ...current, choice }))} style={{ border: `2px solid ${prediction.choice === choice ? '#ffea00' : '#ff007f'}`, background: prediction.choice === choice ? '#ffea00' : '#15000c', color: prediction.choice === choice ? '#050008' : '#fff', padding: '0.35rem 0.15rem', fontSize: '0.5rem', fontWeight: 900, cursor: 'pointer' }}>{choice}</button>)}
                 </div>
               </div>
             )}

             {arenaView === 'BOARD' && (
               <div className="live-game-panels" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', height: isPhonePortrait ? 'auto' : '100%', flex: isPhonePortrait ? 'none' : '1', width: isPhonePortrait ? '100%' : '48%', flexShrink: 0, justifyContent: 'center' }}>
                 
                 <ChesterTeleprompter text={hostBanter} isThinking={isThinking} isMobile={isMobile} />
                 
                 <ChesterChatOverlay 
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    onSendMessage={handleSendMessage}
                    isThinking={isThinking}
                    chatError={chatError || ''}
                    isMobile={isMobile}
                 />

                 <CapturedPieceJails capturedPieces={capturedPieces} />
               </div>
             )}
          </div>

          {/* Chester commentary panel */}
          {drawerOpen && arenaView !== 'BOARD' && (
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
                  onClick={() => isMobile ? setArenaView('BOARD') : setScene('LEAGUE')} 
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

              {activeChallenge && (
                <div style={{ flexShrink: 0, background: 'linear-gradient(90deg, rgba(0,255,255,.12), rgba(255,0,127,.08))', borderLeft: '3px solid #00ffff', padding: isLandscape ? '0.35rem 0.45rem' : '0.65rem 0.75rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: '#00ffff', fontSize: isLandscape ? '0.45rem' : '0.62rem', fontWeight: 900, letterSpacing: '1px' }}><span>LIVE CHALLENGE</span><span>{activeChallenge.level}</span></div>
                  <div style={{ color: '#fff', fontSize: isLandscape ? '0.62rem' : '0.82rem', fontWeight: 900, margin: '0.18rem 0' }}>{activeChallenge.title}</div>
                  <div style={{ color: '#c7d5da', fontSize: isLandscape ? '0.5rem' : '0.68rem', lineHeight: 1.35 }}>{activeChallenge.objective}</div>
                </div>
              )}

              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: '0.5rem', border: '1px solid #39ff14', background: 'rgba(57,255,20,.07)', padding: isLandscape ? '0.35rem' : '0.55rem', marginBottom: isLandscape ? '0.35rem' : '0.7rem', color: '#dfffd8', fontSize: isLandscape ? '0.48rem' : '0.66rem' }}>
                <span><b style={{ color: '#39ff14' }}>MISSION</b> {missionProgress}</span>
                <span>{prediction.points} prediction pts</span>
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
                
                {!matchOver && !demoActiveUI && gameMode !== 'STANDBY' && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('request-resign'))}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: '#ff007f',
                      fontSize: isLandscape ? '0.55rem' : isMobile ? '0.78rem' : '0.75rem',
                      fontWeight: 900,
                      padding: isLandscape ? '0.35rem' : isMobile ? '0.55rem' : '0.5rem',
                      borderRadius: isMobile ? '16px' : '28px',
                      border: '2px solid #ff007f',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    🏳️ RESIGN
                  </button>
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
                    onClick={() => setArenaView('BOARD')} 
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

      {matchResult && (
        <PostGameGazette
          pgn={matchResult.pgn}
          result={matchResult.result}
          playerColor={gameMode === 'PVP_REMOTE' ? (remoteRole || 'w') : 'w'}
          onClose={() => setMatchResult(null)}
        />
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
