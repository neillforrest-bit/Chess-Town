// @ts-nocheck
'use client'; 

import dynamic from 'next/dynamic'; 
import { useState, useEffect } from 'react';
import { askGrandmaster } from '@/app/actions';

const DojoEngineNoSSR = dynamic(() => import('@/components/DojoEngine'), { ssr: false });

type SceneState = 'SPLASH' | 'INTRO' | 'LEAGUE' | 'GAME' | 'COACHING';

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

// ─── COACHING ARENA CHALLENGES ───────────────────────────────────────────────

type ChallengeId = 'opening' | 'sacrifice' | 'endgame' | 'pawn';

interface Challenge {
  id: ChallengeId;
  title: string;
  emoji: string;
  description: string;
  prompt: string;
  options: { label: string; value: string }[];
  correct: string;
  rubric: { A: string; B: string; C: string; D: string; F: string };
  gradeByAnswer: (answer: string) => 'A' | 'B' | 'C' | 'D' | 'F';
}

const COACHING_CHALLENGES: Challenge[] = [
  {
    id: 'opening',
    title: 'Opening 5 Moves Evaluation',
    emoji: '♟️',
    description:
      'White played: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5 Qg5?! 5.Nxf7??\n\nEvaluate White\'s opening play across these 5 moves.',
    prompt: 'How would you grade White\'s first 5 moves overall?',
    options: [
      { label: 'Excellent – controlled center, developed pieces, king safety maintained', value: 'A' },
      { label: 'Good – mostly principled, minor inaccuracies', value: 'B' },
      { label: 'Average – some principles followed but key errors made', value: 'C' },
      { label: 'Poor – several anti-positional moves, fell for a trap', value: 'D' },
      { label: 'Terrible – blundered into a losing position by move 5', value: 'F' },
    ],
    correct: 'D',
    rubric: {
      A: '90–100: All 5 moves follow opening principles flawlessly',
      B: '75–89: 4 strong moves with one inaccuracy',
      C: '60–74: Mixed bag – some principles, some errors',
      D: '45–59: Multiple mistakes, fell for the Blackburne Shilling trap',
      F: '0–44: Walked into immediate material loss or checkmate threat',
    },
    gradeByAnswer: (ans) => ans === 'D' ? 'A' : (ans === 'C' ? 'B' : (ans === 'F' ? 'B' : (ans === 'B' ? 'C' : 'F'))),
  },
  {
    id: 'sacrifice',
    title: 'Sacrifice Timing Challenge',
    emoji: '⚔️',
    description:
      'Position (White to move):\nWhite has Rook on f1, Bishop on c4, Queen on d1.\nBlack\'s King is on g8, Rook on f8.\nWhite can play Rxf7 (Rook sacrifice) to open the f-file.\n\nIs this the right moment to sacrifice the Rook?',
    prompt: 'When should White sacrifice the Rook on f7?',
    options: [
      { label: 'Yes – sacrifice immediately, the King is exposed and checkmate follows', value: 'immediate' },
      { label: 'Yes – but only after Qh5 to add Queen pressure first', value: 'qh5_first' },
      { label: 'No – the sacrifice doesn\'t lead to forced checkmate yet; develop another piece', value: 'develop' },
      { label: 'No – trade Queens first to simplify', value: 'simplify' },
    ],
    correct: 'qh5_first',
    rubric: {
      A: '90–100: Identified Qh5 setup then Rxf7 for forced mate',
      B: '75–89: Recognized sacrifice theme but timing slightly off',
      C: '60–74: Understood sacrifice idea without precise sequence',
      D: '45–59: Sacrificed without sufficient compensation',
      F: '0–44: Missed the attacking idea entirely',
    },
    gradeByAnswer: (ans) => {
      if (ans === 'qh5_first') return 'A';
      if (ans === 'immediate') return 'C';
      if (ans === 'develop') return 'D';
      return 'F';
    },
  },
  {
    id: 'endgame',
    title: 'Endgame King Activity',
    emoji: '👑',
    description:
      'Endgame position: Both sides have only King and pawns.\nWhite King is on e1, Black King is on e8.\nWhite has pawns on d4 and f4.\nBlack has a pawn on d5.\n\nThe game principle: activate your King in the endgame!',
    prompt: 'What is White\'s best first move in this King+Pawn endgame?',
    options: [
      { label: 'Ke2 – march the King toward the center immediately', value: 'ke2' },
      { label: 'f5 – advance a pawn to create a passed pawn', value: 'f5' },
      { label: 'd5 – capture Black\'s pawn immediately', value: 'dxd5' },
      { label: 'Wait – don\'t rush, let Black move first', value: 'wait' },
    ],
    correct: 'ke2',
    rubric: {
      A: '90–100: King centralization – the golden endgame rule',
      B: '75–89: Pawn advance idea is valid but King first is better',
      C: '60–74: Pawn capture attempts but misses King activity principle',
      D: '45–59: Passive play, doesn\'t understand King activity',
      F: '0–44: Move makes the position worse',
    },
    gradeByAnswer: (ans) => {
      if (ans === 'ke2') return 'A';
      if (ans === 'f5') return 'B';
      if (ans === 'dxd5') return 'C';
      return 'D';
    },
  },
  {
    id: 'pawn',
    title: 'Pawn Structure & Breaks',
    emoji: '🔨',
    description:
      'Position: White has a pawn chain on c4-d4-e5.\nBlack has pawns on c5-d6-e6.\nWhite has all pieces developed. Black has just played ...d6.\n\nIdentify the correct pawn break for White.',
    prompt: 'What is White\'s best pawn break to gain a strategic advantage?',
    options: [
      { label: 'f4-f5 – advance kingside pawns to open the f-file for attack', value: 'f4f5' },
      { label: 'd4-d5 – close the center and grab space', value: 'd5' },
      { label: 'c4xc5 – exchange pawns to open the c-file', value: 'cxc5' },
      { label: 'e5xd6 – exchange pawns to relieve tension', value: 'exd6' },
    ],
    correct: 'f4f5',
    rubric: {
      A: '90–100: f4-f5 creates kingside attack and exploits space advantage',
      B: '75–89: d5 grabs space but misses dynamic opportunity',
      C: '60–74: Opening the c-file is reasonable but passive',
      D: '45–59: Releasing tension voluntarily weakens White\'s position',
      F: '0–44: Move worsens pawn structure',
    },
    gradeByAnswer: (ans) => {
      if (ans === 'f4f5') return 'A';
      if (ans === 'd5') return 'B';
      if (ans === 'cxc5') return 'C';
      return 'D';
    },
  },
];

const GRADE_COLORS: Record<string, string> = { A: '#39ff14', B: '#00ffff', C: '#ffea00', D: '#ff7700', F: '#ff007f' };
const GRADE_LABELS: Record<string, string> = { A: 'EXCELLENT', B: 'GOOD', C: 'AVERAGE', D: 'POOR', F: 'FAILING' };

function getLetterGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

// ─── COACHING ARENA COMPONENT ────────────────────────────────────────────────

function CoachingArena({ onBack }: { onBack: () => void }) {
  const [challengeIdx, setChallengeIdx] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [grade, setGrade] = useState<'A' | 'B' | 'C' | 'D' | 'F' | null>(null);
  const [completedGrades, setCompletedGrades] = useState<Record<ChallengeId, 'A' | 'B' | 'C' | 'D' | 'F' | null>>({ opening: null, sacrifice: null, endgame: null, pawn: null });

  const challenge = challengeIdx !== null ? COACHING_CHALLENGES[challengeIdx] : null;

  const handleSubmit = () => {
    if (!selectedAnswer || !challenge) return;
    const result = challenge.gradeByAnswer(selectedAnswer);
    setGrade(result);
    setCompletedGrades(prev => ({ ...prev, [challenge.id]: result }));
  };

  const handleNext = () => {
    if (challengeIdx !== null && challengeIdx < COACHING_CHALLENGES.length - 1) {
      setChallengeIdx(challengeIdx + 1);
    } else {
      setChallengeIdx(null);
    }
    setSelectedAnswer(null);
    setGrade(null);
  };

  const totalCompleted = Object.values(completedGrades).filter(Boolean).length;
  const gradeScore = (g: 'A' | 'B' | 'C' | 'D' | 'F') => ({ A: 95, B: 82, C: 67, D: 52, F: 25 })[g] ?? 0;
  const avgScore = totalCompleted > 0 ? Math.round(Object.values(completedGrades).filter(Boolean).reduce((sum, g) => sum + gradeScore(g as any), 0) / totalCompleted) : null;
  const overallGrade = avgScore !== null ? getLetterGrade(avgScore) : null;

  const s: React.CSSProperties = {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 'clamp(1rem, 2vw, 2.5rem)', boxSizing: 'border-box', overflowY: 'auto',
  };

  // Challenge detail view
  if (challenge) {
    return (
      <div style={s}>
        <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#00ffff', fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)', fontWeight: 900, margin: 0 }}>
              {challenge.emoji} {challenge.title}
            </h2>
            <button onClick={() => { setChallengeIdx(null); setSelectedAnswer(null); setGrade(null); }}
              style={{ color: '#aaa', backgroundColor: '#111', border: '2px solid #444', padding: '0.4rem 0.8rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Comic Sans MS, sans-serif' }}>
              ← Back
            </button>
          </div>

          <div style={{ backgroundColor: '#0a001a', border: '3px solid #00ffff', borderRadius: '18px', padding: '1.2rem' }}>
            <p style={{ color: '#ddd', fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{challenge.description}</p>
          </div>

          <p style={{ color: '#ffea00', fontWeight: 900, fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', margin: 0 }}>{challenge.prompt}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {challenge.options.map(opt => {
              const isSelected = selectedAnswer === opt.value;
              const isCorrect = grade !== null && opt.value === challenge.correct;
              const isWrong = grade !== null && isSelected && opt.value !== challenge.correct;
              return (
                <button key={opt.value} onClick={() => !grade && setSelectedAnswer(opt.value)}
                  disabled={!!grade}
                  style={{
                    textAlign: 'left', padding: '0.8rem 1.2rem', borderRadius: '14px', cursor: grade ? 'default' : 'pointer',
                    border: isCorrect ? '3px solid #39ff14' : (isWrong ? '3px solid #ff007f' : (isSelected ? '3px solid #ffea00' : '3px solid #333')),
                    backgroundColor: isCorrect ? 'rgba(57,255,20,0.15)' : (isWrong ? 'rgba(255,0,127,0.15)' : (isSelected ? 'rgba(255,234,0,0.1)' : '#111')),
                    color: isCorrect ? '#39ff14' : (isWrong ? '#ff007f' : (isSelected ? '#ffea00' : '#ddd')),
                    fontFamily: 'Comic Sans MS, sans-serif', fontSize: 'clamp(0.85rem, 1.3vw, 1rem)', fontWeight: isSelected ? 900 : 600,
                    transition: 'border 0.2s, background 0.2s',
                  }}>
                  {isCorrect ? '✅ ' : isWrong ? '❌ ' : ''}{opt.label}
                </button>
              );
            })}
          </div>

          {!grade && (
            <button onClick={handleSubmit} disabled={!selectedAnswer}
              style={{ width: '100%', backgroundColor: selectedAnswer ? '#39ff14' : '#333', color: '#000', fontSize: '1.1rem', fontWeight: 900, padding: '0.8rem', borderRadius: '18px', border: 'none', cursor: selectedAnswer ? 'pointer' : 'not-allowed', fontFamily: 'Comic Sans MS, sans-serif', opacity: selectedAnswer ? 1 : 0.5 }}>
              SUBMIT ASSESSMENT
            </button>
          )}

          {grade && (
            <div style={{ backgroundColor: '#0a001a', border: `4px solid ${GRADE_COLORS[grade]}`, borderRadius: '20px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 900, color: GRADE_COLORS[grade], textShadow: `0 0 20px ${GRADE_COLORS[grade]}` }}>{grade}</span>
                <div>
                  <div style={{ color: GRADE_COLORS[grade], fontWeight: 900, fontSize: 'clamp(1.2rem, 2vw, 1.6rem)' }}>{GRADE_LABELS[grade]}</div>
                  <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Score: ~{gradeScore(grade)}/100</div>
                </div>
              </div>
              <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem' }}>
                <p style={{ color: '#ddd', fontWeight: 900, margin: '0 0 0.5rem', fontSize: '0.9rem' }}>GRADING RUBRIC:</p>
                {Object.entries(challenge.rubric).map(([g, text]) => (
                  <p key={g} style={{ margin: '0.2rem 0', color: g === grade ? GRADE_COLORS[g] : '#666', fontSize: '0.85rem', fontWeight: g === grade ? 900 : 400 }}>
                    <span style={{ fontWeight: 900 }}>{g}:</span> {text}
                  </p>
                ))}
              </div>
              <button onClick={handleNext}
                style={{ width: '100%', backgroundColor: '#00ffff', color: '#000', fontSize: '1.1rem', fontWeight: 900, padding: '0.7rem', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'Comic Sans MS, sans-serif' }}>
                {challengeIdx < COACHING_CHALLENGES.length - 1 ? '⏭ NEXT CHALLENGE' : '🏆 VIEW RESULTS'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Challenge list view
  return (
    <div style={s}>
      <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#ffea00', fontSize: 'clamp(1.6rem, 3vw, 2.8rem)', fontWeight: 900, margin: 0 }}>🎓 COACHING ARENA</h1>
          <button onClick={onBack}
            style={{ color: '#aaa', backgroundColor: '#111', border: '2px solid #444', padding: '0.4rem 0.8rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Comic Sans MS, sans-serif' }}>
            ← League
          </button>
        </div>

        {overallGrade && (
          <div style={{ backgroundColor: '#0a001a', border: `4px solid ${GRADE_COLORS[overallGrade]}`, borderRadius: '20px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 900, color: GRADE_COLORS[overallGrade] }}>{overallGrade}</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>Overall Grade: {GRADE_LABELS[overallGrade]}</div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{totalCompleted}/{COACHING_CHALLENGES.length} challenges completed · avg score {avgScore}/100</div>
            </div>
          </div>
        )}

        <p style={{ color: '#aaa', margin: 0, fontSize: '0.95rem' }}>Complete each challenge to earn your letter grade. Chester grades your chess understanding A–F.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {COACHING_CHALLENGES.map((ch, idx) => {
            const earned = completedGrades[ch.id];
            return (
              <button key={ch.id} onClick={() => { setChallengeIdx(idx); setSelectedAnswer(null); setGrade(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left',
                  backgroundColor: '#111', border: `3px solid ${earned ? GRADE_COLORS[earned] : '#333'}`,
                  borderRadius: '18px', padding: '1rem 1.2rem', cursor: 'pointer',
                  fontFamily: 'Comic Sans MS, sans-serif', transition: 'border 0.2s',
                }}>
                <span style={{ fontSize: '2rem' }}>{ch.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)' }}>{ch.title}</div>
                  <div style={{ color: '#aaa', fontSize: '0.82rem', marginTop: '0.2rem' }}>{ch.description.split('\n')[0]}</div>
                </div>
                {earned ? (
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: GRADE_COLORS[earned] }}>{earned}</span>
                ) : (
                  <span style={{ color: '#555', fontSize: '0.85rem' }}>START →</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

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

  // Mobile: toggle between board and Chester panel
  const [mobileView, setMobileView] = useState<'BOARD' | 'CHESTER'>('BOARD');

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
    
    const handleBanter = (e: any) => { setHostBanter(e.detail); };
    const handleDemoComplete = () => { setDemoActiveUI(false); };

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
    setMobileView('BOARD');
    
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
          <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0, flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 4rem)', color: '#ffea00', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 0 25px rgba(255,234,0,0.8)', margin: 0 }}>CONCORD HIGH CHESS LEAGUE</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button onClick={() => setLeagueView('STANDINGS')} style={{ backgroundColor: leagueView === 'STANDINGS' ? '#00ffff' : '#111', color: leagueView === 'STANDINGS' ? '#000' : '#fff', border: '4px solid #00ffff', padding: '0.5rem 1rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.75rem, 1.1vw, 1rem)', cursor: 'pointer' }}>TABLE</button>
              <button onClick={() => setLeagueView('MATCHUPS')} style={{ backgroundColor: leagueView === 'MATCHUPS' ? '#ffea00' : '#111', color: leagueView === 'MATCHUPS' ? '#000' : '#fff', border: '4px solid #ffea00', padding: '0.5rem 1rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.75rem, 1.1vw, 1rem)', cursor: 'pointer' }}>WEEK 11 DEMO</button>
              <button onClick={() => setLeagueView('2V2')} style={{ backgroundColor: leagueView === '2V2' ? '#39ff14' : '#111', color: leagueView === '2V2' ? '#000' : '#fff', border: '4px solid #39ff14', padding: '0.5rem 1rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.75rem, 1.1vw, 1rem)', cursor: 'pointer' }}>2v2 TAG-TEAM</button>
              <button onClick={() => setScene('COACHING')} style={{ backgroundColor: '#ff007f', color: '#fff', border: '4px solid #ff007f', padding: '0.5rem 1rem', borderRadius: '15px', fontWeight: 900, fontSize: 'clamp(0.75rem, 1.1vw, 1rem)', cursor: 'pointer' }}>🎓 COACHING</button>
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

      {scene === 'COACHING' && (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#0a0014' }}>
          <CoachingArena onBack={() => setScene('LEAGUE')} />
        </div>
      )}

      {scene === 'GAME' && (
        <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0014', boxSizing: 'border-box', position: 'relative' }}>
          
          {/* Match label */}
          <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', backgroundColor: '#000', border: '3px solid #00ffff', padding: '0.4rem 0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 50 }}>
             <span style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1rem)', color: '#fff', fontWeight: 900 }}>MATCH:</span>
             <span style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)', color: '#ffea00', fontWeight: 900 }}>{activeMatchup}</span>
          </div>

          {/* Mobile toggle button */}
          <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 50, display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => setMobileView('BOARD')}
              style={{ backgroundColor: mobileView === 'BOARD' ? '#00ffff' : '#111', color: mobileView === 'BOARD' ? '#000' : '#aaa', border: '2px solid #00ffff', padding: '0.35rem 0.7rem', borderRadius: '10px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Comic Sans MS, sans-serif' }}>
              ♟ BOARD
            </button>
            <button onClick={() => setMobileView('CHESTER')}
              style={{ backgroundColor: mobileView === 'CHESTER' ? '#ffea00' : '#111', color: mobileView === 'CHESTER' ? '#000' : '#aaa', border: '2px solid #ffea00', padding: '0.35rem 0.7rem', borderRadius: '10px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Comic Sans MS, sans-serif' }}>
              🎙 CHESTER
            </button>
          </div>

          {/* Desktop: side-by-side. Mobile: toggled view */}
          <div style={{ width: '100%', height: '100%', maxHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.5rem, 1.5vw, 2rem)', padding: 'clamp(0.8rem, 1.5vw, 1.5rem)', paddingTop: 'clamp(2.5rem, 5vw, 3.5rem)', boxSizing: 'border-box' }}>

            {/* Board panel */}
            <div style={{
              flex: drawerOpen ? '0 0 auto' : '1 1 auto',
              width: drawerOpen ? 'min(50vw, 50dvh)' : 'min(90vw, 90dvh)',
              height: drawerOpen ? 'min(50vw, 90dvh)' : 'min(90vw, 90dvh)',
              aspectRatio: '1/1',
              backgroundColor: '#1a0033',
              border: 'clamp(6px, 1.2vw, 16px) solid #00ffff',
              borderRadius: '30px',
              padding: '0.6rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 60px rgba(0,255,255,0.3)',
              boxSizing: 'border-box',
              // On small screens: hide board when CHESTER view active
              visibility: (mobileView === 'CHESTER' && drawerOpen) ? 'hidden' : 'visible',
              position: (mobileView === 'CHESTER' && drawerOpen) ? 'absolute' : 'relative',
            }}>
               <div id="phaser-game-container" style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }}>
                  <DojoEngineNoSSR mode={gameMode} />
               </div>
            </div>

            {/* Chester panel */}
            {drawerOpen && (
              <div style={{
                flex: '1 1 0',
                minWidth: '260px',
                maxWidth: '480px',
                height: '100%',
                maxHeight: '90dvh',
                backgroundColor: '#000',
                border: 'clamp(6px, 1.2vw, 14px) solid #ffea00',
                borderRadius: '30px',
                padding: 'clamp(1rem, 2vw, 2rem)',
                display: mobileView === 'CHESTER' ? 'flex' : 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 80px rgba(255,234,0,0.3)',
                boxSizing: 'border-box',
                // On small screens: only show when CHESTER toggled
                opacity: mobileView === 'CHESTER' || window.innerWidth >= 640 ? 1 : 0,
                pointerEvents: mobileView === 'CHESTER' || window.innerWidth >= 640 ? 'auto' : 'none',
              }}>
                <div style={{ borderBottom: 'clamp(4px, 0.8vw, 10px) solid rgba(255,234,0,0.4)', paddingBottom: '0.8rem', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <h2 style={{ color: '#ffea00', fontSize: 'clamp(1.2rem, 2vw, 2.5rem)', fontWeight: 900, lineHeight: 1, margin: 0 }}>CHESTER // LIVE COMMS</h2>
                  <button onClick={() => setScene('LEAGUE')} style={{ color: '#ffea00', fontSize: 'clamp(1rem, 1.4vw, 1.8rem)', fontWeight: 900, backgroundColor: '#000', border: 'clamp(2px, 0.4vw, 5px) solid #ffea00', padding: '0.3rem 0.6rem', borderRadius: '12px', cursor: 'pointer' }}>✖</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ color: '#00ffff', fontSize: 'clamp(0.9rem, 1.6vw, 2rem)', fontWeight: 900, lineHeight: 1.4, textShadow: '0 0 10px rgba(0,255,255,0.5)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {hostBanter}
                  </p>
                  {isThinking && (
                    <p style={{ color: '#ffea00', fontSize: 'clamp(0.85rem, 1.3vw, 1.6rem)', fontWeight: 900, backgroundColor: '#111', padding: '0.8rem', border: '3px solid #ffea00', borderRadius: '12px', display: 'inline-block', width: 'max-content', marginTop: '0.8rem' }}>Chester analyzing...</p>
                  )}
                </div>

                <div style={{ borderTop: 'clamp(4px, 0.8vw, 10px) solid rgba(255,234,0,0.4)', paddingTop: '0.8rem', marginTop: '0.8rem', flexShrink: 0 }}>
                  
                  {!demoActiveUI && (
                    <button onClick={startAiDemo} style={{ width: '100%', backgroundColor: '#39ff14', color: '#000', fontSize: 'clamp(0.9rem, 1.4vw, 1.8rem)', fontWeight: 900, padding: 'clamp(0.7rem, 1.5vw, 1.8rem)', borderRadius: '20px', border: 'clamp(3px, 0.6vw, 6px) solid #000', cursor: 'pointer', textTransform: 'uppercase', marginBottom: '0.8rem', boxShadow: '0 0 30px rgba(57,255,20,0.5)' }}>
                      🚀 INITIATE GEMINI AI MATCHUP
                    </button>
                  )}

                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={demoActiveUI ? "AI running..." : "Talk trash to the League..."} 
                      disabled={isThinking || demoActiveUI}
                      style={{ flex: 1, backgroundColor: '#111', border: 'clamp(3px, 0.6vw, 6px) solid #ffea00', padding: 'clamp(0.5rem, 1vw, 1.2rem)', fontSize: 'clamp(0.8rem, 1.2vw, 1.6rem)', fontWeight: 900, color: '#ffea00', borderRadius: '18px', boxSizing: 'border-box' }}
                    />
                    <button type="submit" disabled={demoActiveUI} style={{ backgroundColor: '#ffea00', color: '#000', fontSize: 'clamp(0.8rem, 1.2vw, 1.6rem)', fontWeight: 900, padding: '0 clamp(0.8rem, 1.8vw, 2rem)', borderRadius: '18px', border: 'clamp(3px, 0.6vw, 6px) solid #000', cursor: 'pointer', opacity: demoActiveUI ? 0.5 : 1 }}>SEND</button>
                  </form>
                  
                  <button onClick={() => setScene('LEAGUE')} style={{ width: '100%', backgroundColor: '#00ffff', color: '#000', fontSize: 'clamp(0.8rem, 1.1vw, 1.5rem)', fontWeight: 900, padding: 'clamp(0.5rem, 1vw, 1.2rem)', borderRadius: '18px', border: 'clamp(3px, 0.6vw, 6px) solid #000', cursor: 'pointer', textTransform: 'uppercase', boxSizing: 'border-box' }}>
                    ⬅️ FLEE THE ARENA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
