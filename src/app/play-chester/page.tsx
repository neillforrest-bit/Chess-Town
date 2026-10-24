'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PEER_CONFIG } from '@/lib/p2p';
import { askChesterChat, chesterUsageByReply } from '@/app/actions';
import { GEMINI_MODEL } from '@/lib/gemini-model';
import QAFlagButton from '@/components/QAFlagButton';
import { CaptureStrip, HeroScoreboard, LiveAccuracy, splitMaterial, type CapturedPiece } from '@/components/CapturedPieceJails';
import { buildGameRecord, recordGameToFile } from '@/lib/player-file';
import { getProfile, saveProfile } from '@/lib/profile';
import { recordMillMistake, loadMill } from '@/lib/puzzle-mill';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import MatchCountdown from '@/components/MatchCountdown';
import { buildStoryRecap, getVerdict, personaCoaching, chesterOfflineChat, PERSONA_DESC, buildWhyLesson, buildCoachBullets, winOddsPct, accPoints, accPointsFromDelta } from '@/lib/chester-voice';
import { isMuted, setMuted, playSfx, isHaptics, setHaptics, buzz } from '@/lib/sounds';
import PawnWarDuel from '@/components/PawnWarDuel';
import { bumpPlayStreak } from '@/lib/streak';
import { RUSH_LEVELS, getRush, rushWin, rushLoss } from '@/lib/boss-rush';
import { ROAD_MAX, bossFor, isBossLevel, eloForLevel, tierForLevel, getRoadLevel, setRoadLevel, bossTauntPrompt, BOSS_FOCUS, levelFocus } from '@/lib/road';
import { getLadder, recordLadderGame, weakestHabit, LADDER_LABELS, type LadderState } from '@/lib/rating';
import { phrasesFromPgn, fenBeforePly, explainEngineChoice } from '@/lib/move-words';
import { getStockfishClient } from '@/lib/stockfish';
import { awardPoints, completeBossNode, DIFFICULTY_POINTS } from '@/lib/rating';
import { ChesterChatOverlay, ChesterAvatar } from '@/components/ChesterUI';
import { loadPlayerFile, analyse } from '@/lib/player-file';
import { Chess } from 'chess.js';
import { direct, postGamePrompt, parsePostGame, localScouting } from '@/lib/chester-director';
import { BlueprintProvider, useBlueprint } from '@/lib/blueprint';
import { radarForUserMove, radarLines, buildLocalDebrief } from '@/lib/tactics';
import { buildWhyCard, bestInfo, hintFor, chatReply, formatSanToHuman, gradeIcon, isBanned, resetAnalyzerMemory, type WhyCard } from '@/lib/chester-analyzer';
import { ARMORY } from '@/lib/armory';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type GameReport = { gradeHistory: GradedMove[]; pgn?: string; grade?: string; score?: number; accuracy?: number; development?: number; kingSafety?: number; tactics?: number; openingName?: string | null; moves?: number; turningPoint?: string; habits?: { castled?: boolean; developed?: boolean; blunders?: number } };
type CoachPrompt = { evaluationMateAfter?: number | null; kind: 'move' | 'help' | 'howler'; move?: string; movePhrase?: string | null; bestMovePhrase?: string | null; fen: string; fenBefore?: string | null; bestMove?: string | null; continuation?: string[]; engineLine?: string[] | null; sacrificePiece?: string | null; evaluation?: number | string | null; classification?: string | null; evalDelta?: number | null; evaluationBefore?: number | null; evaluationAfter?: number | null; captured?: string | null; check?: boolean; mate?: boolean; ply?: number; provisional?: boolean; principleKey?: string | null; principleFollowed?: boolean | null; exchangeLost?: string | null; exchangeWon?: string | null; exchangeNet?: number | null };
// BUILD 94: giant emoji move reviews replace the static horse avatar on graded moves.
// (The horse stays for the idle/thinking coach persona - Chester IS a knight.)
const GRADE_EMOJI: Record<string, string> = { BRILLIANT: '👑', BEST: '🎯', GREAT: '🔥', GOOD: '✅', INACCURACY: '😬', MISTAKE: '⚠️', BLUNDER: '💥' };
const LEVELS: { value: Difficulty; label: string; note: string }[] = [
  { value: 'BEGINNER', label: 'ROOKIE', note: 'Chester leaves the door open' },
  { value: 'INTERMEDIATE', label: 'CLUB', note: 'A fair fight with teeth' },
  { value: 'ADVANCED', label: 'MASTER', note: 'Punishes loose pieces' },
  { value: 'EXPERT', label: 'NIGHTMARE', note: 'No mercy, no refunds' },
];
const LESSONS = [
  { title: 'Take the centre', body: 'Tap a pawn in front of your king or queen, then tap a glowing square. That opens the road for your other pieces.' },
  { title: 'Develop with purpose', body: 'Tap a horse-shaped knight or a bishop, then choose a glowing square. Bring one new teammate into the game.' },
  { title: 'Protect the king', body: 'Move your king two squares toward a rook when the road is clear. That special move is castling: king safe, rook ready.' },
];

function TypeLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); const t0 = Date.now(); const iv = window.setInterval(() => { const k = Math.max(1, Math.ceil((Date.now() - t0) / 400 * text.length)); setN(Math.min(text.length, k)); if (k >= text.length) window.clearInterval(iv); }, 24); return () => window.clearInterval(iv); }, [text]);
  return <span>{text.slice(0, n)}</span>;
}

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const requestedLevel = searchParams.get('level');
  const bossNode = searchParams.get('boss');
  const roadActive = searchParams.get('road') === '1';
  const requestedRoom = (searchParams.get('room') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const requestedSeat: 'w' | 'b' = searchParams.get('host') === '1' ? 'w' : 'b';
  const warMode = requestedMode === 'duel' && searchParams.get('war') === '1';
  const clockSeconds = Math.min(3600, Math.max(0, parseInt(searchParams.get('clock') || '0', 10) || 0));
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode === 'duel' ? 'PVP_REMOTE' : requestedMode || 'COACH_OPENING';
  const [countdown, setCountdown] = useState(0);
  const coachPromptRef = useRef<CoachPrompt | null>(null);
  const [ladder, setLadder] = useState<LadderState>({ unlocked: 0, grandChester: false, lastLevel: null, lastResult: null, lastGrade: null, lastFocus: null, lastWeakness: null, updatedAt: null });
  useEffect(() => { setLadder(getLadder()); }, []);
  // Road to Joseph: 15 levels, every 3rd is a boss fight (exam mode).
  const [roadLevel, setRoadLevelState] = useState(1);
  const rushActive = roadActive && searchParams.get('rush') === '1';
  useEffect(() => { if (roadActive) setRoadLevelState(rushActive ? RUSH_LEVELS[getRush().step] : getRoadLevel()); }, [roadActive, rushActive]);
  const [rushMsg, setRushMsg] = useState<{ kind: 'win'; step: number; complete: boolean } | { kind: 'loss' } | null>(null);
  const [victoryState, setVictoryState] = useState<'none' | 'cleared' | 'boss_defeated'>('none');
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => { if (roadActive) setIntroOpen(true); }, [roadActive]);
  const isBossFight = roadActive && isBossLevel(roadLevel);
  const boss = isBossFight ? bossFor(roadLevel) : null;
  const bossRef = useRef<{ on: boolean; boss: ReturnType<typeof bossFor> }>({ on: false, boss: null });
  bossRef.current = { on: isBossFight, boss };
  const roadRef = useRef({ active: false, level: 1 });
  roadRef.current = { active: roadActive, level: roadLevel };
  useEffect(() => { (window as unknown as { __ctRoadLevel?: number | null }).__ctRoadLevel = roadActive ? roadLevel : null; return () => { (window as unknown as { __ctRoadLevel?: number | null }).__ctRoadLevel = null; }; }, [roadActive, roadLevel]);
  const bp = useBlueprint(); const bpRef = useRef(bp); bpRef.current = bp;
  const [armoryOpen, setArmoryOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(roadActive ? 'BEGINNER' : requestedLevel === 'INTERMEDIATE' || requestedLevel === 'ADVANCED' || requestedLevel === 'EXPERT' ? requestedLevel : 'BEGINNER');
  useEffect(() => { if (roadActive) setDifficulty(tierForLevel(roadLevel)); }, [roadActive, roadLevel]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [calculating, setCalculating] = useState(false);
  // Batch 173: the verdict on the player's move shows the moment it is graded, not after Chester's reply lands.
  const [whyFresh, setWhyFresh] = useState(false);
  const calcCycle = useRef(false);
  const [deepThought, setDeepThought] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<CoachPrompt | null>(null);
  // BUILD 158: portrait reactions - ephemeral emoji overlays on the console badge.
  const [reaction, setReaction] = useState<string | null>(null);
  const reactT = useRef(0);
  const leanT = useRef(0);
  const fireReact = (emoji: string, ms = 1900) => { setReaction(emoji); window.clearTimeout(reactT.current); reactT.current = window.setTimeout(() => setReaction(null), ms); };

  // BUILD 163: emoji taunts - Chester claps back, fully rule-based, 0p.
  const tauntCool = useRef(0);
  const sendTaunt = (t: string) => {
    const now = Date.now();
    if (now < tauntCool.current || freeze || !started || isBossFight) return; // exam mode: the boss does not banter
    tauntCool.current = now + 4000;
    fireReact(t, 1600);
    const lastCls = (moveTrail[moveTrail.length - 1]?.classification || '').toUpperCase();
    const LINES: Record<string, string[]> = {
      '😏': ['I invented that smirk.', 'Smirking already? The board disagrees.'],
      '😤': ['Save the steam - you will need it for the ending.', 'Anger is just calculation with worse posture.'],
      '🤯': ['Mind blown? I have not even started.', 'Yes, I saw that too. Obviously.'],
      '💪': ['Muscles do not move pieces. Shame.', 'Flex all you like - the eval bar is mine.'],
    };
    let pool = LINES[t] || LINES['😏'];
    if (lastCls === 'BLUNDER' || lastCls === 'MISTAKE') pool = ['Bold talk from someone who just gift-wrapped a piece.', 'Taunt me when the move list stops glowing red.'];
    else if (lastCls === 'BRILLIANT' || lastCls === 'BEST') pool = ['One good move and he grows a crown. Do it again.', 'Fine. That one stung. Again.'];
    const line = pool[Math.floor(Math.random() * pool.length)];
    window.setTimeout(() => { setFreeze(null); setBanter(`${t} yourself. ${line}`); }, 700);
  };
  const [bossStrike, setBossStrike] = useState(0);
  // BUILD 158: Chester Challenge - one mid-match micro-objective per game, +150 pts even in a loss.
  type Challenge = { id: 'dfile' | 'fork' | 'survive'; label: string; n: number; target: number; done: boolean };
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const chalRef = useRef<Challenge | null>(null);
  const [skinUnlocked, setSkinUnlocked] = useState<string | null>(null);
  const [skinNow, setSkinNow] = useState<string>(() => { try { return localStorage.getItem('ct-board-theme') || 'NEON'; } catch { return 'NEON'; } });
  const [commOpen, setCommOpen] = useState(false);
  // BUILD 165 (PRD V2): structured Why Engine card, arrows, hint ladder, check/mate cinematics. All hooks live above the start-screen return.
  const [whyCard, setWhyCard] = useState<WhyCard | null>(null);
  const [whyModal, setWhyModal] = useState<WhyCard | null>(null);
  const cardsRef = useRef<WhyCard[]>([]);
  const [arrowsOn, setArrowsOn] = useState(false);
  const [chipArrow, setChipArrow] = useState<{ from: string; to: string } | null>(null);
  const [hintStage, setHintStage] = useState<0 | 1 | 2 | 3>(0);
  const liveRef = useRef<{ fen: string; bestSan: string | null; bestUci: string | null }>({ fen: '', bestSan: null, bestUci: null });
  const [liveFen, setLiveFen] = useState('');
  const [chatTop, setChatTop] = useState(0);
  const [mateStage, setMateStage] = useState<0 | 1 | 2>(0);
  const posState = (() => { try { if (!liveFen) return { check: false, mate: false, side: 'w', kingSq: '' }; const c = new Chess(liveFen); let kingSq = ''; if (c.inCheck()) { for (const row of c.board()) for (const q of row) if (q && q.type === 'k' && q.color === c.turn()) kingSq = q.square; } return { check: c.inCheck(), mate: c.isCheckmate(), side: c.turn(), kingSq }; } catch { return { check: false, mate: false, side: 'w', kingSq: '' }; } })();
  const inCheckSide = posState.check ? posState.side : null;
  const mateNow = posState.mate ? { you: posState.side === 'b' } : null;
  const mateKey = mateNow ? (mateNow.you ? 'w' : 'l') + liveFen : '';
  useEffect(() => { setMateStage(0); if (!mateKey) return; setMateStage(1); try { playSfx('select'); } catch { /* ignore */ } const t = window.setTimeout(() => setMateStage(2), 1100); return () => window.clearTimeout(t); }, [mateKey]);
  const turning = (() => { let best: WhyCard | null = null; for (const c of cardsRef.current) if (c.cp != null && c.cp >= 120 && (!best || (c.cp || 0) > (best.cp || 0))) best = c; return best; })();
  const hintInfo: WhyCard | null = (() => { const l = liveRef.current; if (!l.fen || !(l.bestSan || l.bestUci)) return null; const b = bestInfo(l.fen, l.bestSan || l.bestUci); return { ply: 0, moveNo: 0, san: '', grade: 'IDLE', cp: null, headlineBadge: '', whatHappenedLine: '', engineBlueprintLine: '', boardOverlayArrows: [], highlightedSquares: [], contextualChatChips: ['', '', ''], engineBestSan: b.san, engineBestUci: b.uci, hintMotif: b.motif, hintPiece: b.piece, hintSquare: b.from, fenBefore: l.fen, fenAfter: l.fen }; })();
  useEffect(() => {
    const onLive = (e: Event) => { const d = (e as CustomEvent<{ fen?: string; bestMoveFen?: string; bestMove?: { uci?: string | null; san?: string | null } }>).detail; if (!d?.fen) return; const fresh = !d.bestMoveFen || d.bestMoveFen === d.fen; liveRef.current = { fen: d.fen, bestSan: fresh ? (d.bestMove?.san || null) : null, bestUci: fresh ? (d.bestMove?.uci || null) : null }; setLiveFen(d.fen); };
    window.addEventListener('engine-evaluation', onLive); return () => window.removeEventListener('engine-evaluation', onLive);
  }, []);
  useEffect(() => { setHintStage(0); setChipArrow(null); }, [liveFen]);
  useEffect(() => { const up = () => { const el = document.querySelector('.chester-teleprompter__body'); if (el) (el as HTMLElement).scrollTop = 0; }; const t1 = window.setTimeout(up, 60); const t2 = window.setTimeout(up, 350); const t3 = window.setTimeout(up, 1200); up(); return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); }; }, [whyCard, hintStage]);
  useEffect(() => { if (!arrowsOn) return; const t = window.setTimeout(() => setArrowsOn(false), 6000); return () => window.clearTimeout(t); }, [arrowsOn]);
  useEffect(() => { if (!chipArrow) return; const t = window.setTimeout(() => setChipArrow(null), 4500); return () => window.clearTimeout(t); }, [chipArrow]);
  const commentaryRef = useRef<string[]>([]); // BUILD 164: filled from the coach handler (hooks cannot live past the start-screen return)
  const [drill] = useState<{ hanging: number; missed: number; drill: string } | null>(() => { try { const d = JSON.parse(localStorage.getItem('ct-drill') || 'null'); return d && d.drill ? d : null; } catch { return null; } });
  const setChal = (c: Challenge | null) => { chalRef.current = c; setChallenge(c ? { ...c } : null); };
  const startChallenge = () => {
    const games = (() => { try { return getProfile().games.chester.played; } catch { return 0; } })();
    const defs: Array<Omit<Challenge, 'n' | 'done'>> = [
      { id: 'dfile', label: 'HOLD THE D-FILE', target: 3 },
      { id: 'fork', label: 'FIND THE FORK', target: 1 },
      { id: 'survive', label: 'SURVIVE THE STORM', target: 5 },
    ];
    setChal({ ...defs[games % defs.length], n: 0, done: false });
  };
  const completeChallenge = (ch: Challenge) => {
    ch.done = true; setChal(ch); playSfx('brilliant'); buzz([20, 40, 20]);
    try { const prof = getProfile(); prof.totalPoints += 150; saveProfile(prof); } catch { /* points are a bonus */ }
  };
  const updateChallenge = (detail: { fen?: string | null; fenBefore?: string | null; move?: string | null; classification?: string | null }) => {
    const ch = chalRef.current; if (!ch || ch.done) return;
    try {
      if (ch.id === 'dfile') {
        if (!detail.fen) return;
        const c = new Chess(detail.fen);
        const onD = c.board().flat().some((sq) => sq && sq.square[0] === 'd' && sq.color === 'w');
        ch.n = onD ? ch.n + 1 : 0;
        if (ch.n >= ch.target) completeChallenge(ch); else setChal(ch);
      } else if (ch.id === 'fork') {
        if (!detail.fenBefore || !detail.move || !detail.fen) return;
        const c = new Chess(detail.fenBefore);
        const m = c.move(detail.move);
        const parts = c.fen().split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
        const c2 = new Chess(parts.join(' '));
        const caps = c2.moves({ square: m.to, verbose: true }).filter((x) => x.captured && x.captured !== 'k');
        if (caps.length >= 2 || (caps.length >= 1 && new Chess(detail.fen).isCheck())) completeChallenge(ch);
      } else {
        const rc = (detail.classification || '').toUpperCase();
        ch.n = rc === 'BLUNDER' || rc === 'MISTAKE' ? 0 : ch.n + 1;
        if (ch.n >= ch.target) completeChallenge(ch); else setChal(ch);
      }
    } catch { /* challenge is garnish */ }
  };
  const isJosephFight = boss?.name === 'Joseph';
  const isJosephFightRef = useRef(false);
  isJosephFightRef.current = isJosephFight;
  const [muted, setMutedState] = useState(false);
  const [haptics, setHapticsState] = useState(true);
  const [resignArmed, setResignArmed] = useState(false);
  const teleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setHapticsState(isHaptics()); }, []);
  // BLUEPRINT: feed every played move (user + Chester) into the BlueprintManager
  useEffect(() => {
    const onMove = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.fen) bpRef.current.onPosition(d.fen); };
    window.addEventListener('chester-coaching-pause', onMove);
    window.addEventListener('chester-ai-graded', onMove);
    return () => { window.removeEventListener('chester-coaching-pause', onMove); window.removeEventListener('chester-ai-graded', onMove); };
  }, []);
  // auto-dismiss the abort/handoff line after 8s
  useEffect(() => { if (!bp.line || bp.line.kind === 'why') return; const t = window.setTimeout(() => bpRef.current.disarm(), 8000); return () => window.clearTimeout(t); }, [bp.line]);
  // BUILD 158: Joseph pressure drone - quiet minor-key bed whose gain tracks White's danger.
  // Gated on the app's mute switch; stops the moment the fight ends. Zero network, zero cost.
  const josephDrone = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const [josephPressure, setJosephPressure] = useState(50);
  useEffect(() => {
    if (!isJosephFight) { setJosephPressure(50); return; }
    const onEval = (e: Event) => {
      const es = (e as CustomEvent<{ evalScore?: number | string | null }>).detail?.evalScore;
      let odds: number | null = null;
      if (typeof es === 'number') odds = winOddsPct(Math.round(es * 100), 'w'); // evalScore is white-absolute pawns
      else if (typeof es === 'string' && es.startsWith('M')) { const m = parseInt(es.slice(1), 10); odds = winOddsPct(null, 'w', Number.isFinite(m) ? m : null); }
      if (odds !== null) setJosephPressure(100 - odds);
    };
    window.addEventListener('engine-evaluation', onEval);
    return () => window.removeEventListener('engine-evaluation', onEval);
  }, [isJosephFight]);
  useEffect(() => { const onCalc = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.on && !calcCycle.current) setWhyFresh(false); calcCycle.current = !!d?.on; setCalculating(!!d?.on); setDeepThought(!!d?.on && !!d?.deep); if (d?.on) { window.clearTimeout(leanT.current); } else { window.clearTimeout(leanT.current); leanT.current = window.setTimeout(() => { setReaction('🧐'); window.clearTimeout(reactT.current); reactT.current = window.setTimeout(() => setReaction(null), 2400); }, 7000); } }; window.addEventListener('chester-calculating', onCalc); return () => window.removeEventListener('chester-calculating', onCalc); }, []);
  useEffect(() => { const el = teleRef.current; if (el) el.scrollTop = freeze ? 0 : el.scrollHeight; });
  useEffect(() => { setMutedState(isMuted()); }, []);
  const [coachReply, setCoachReply] = useState('');
  const qaMatchId = useRef(`qa-${Math.random().toString(36).slice(2, 10)}`);
  const [teleprompterLlm, setTeleprompterLlm] = useState<{ key: string; text: string } | null>(null);
  const [helpRemaining, setHelpRemaining] = useState(3);
  // Batch 177 (stage 2 RPG): Mario-style board power-ups on normal road levels; none spawn on bosses (exam mode stays bare).
  const [powerups, setPowerups] = useState<{ sq: string; kind: 'torch' | 'shield' }[]>([]);
  const [loot, setLoot] = useState<{ torch: number; shield: number }>({ torch: 0, shield: 0 });
  const powerupsRef = useRef<{ sq: string; kind: 'torch' | 'shield' }[]>([]);
  const helpLeftRef = useRef(helpRemaining);
  useEffect(() => { helpLeftRef.current = helpRemaining; }, [helpRemaining]);
  const [bossCards, setBossCards] = useState(0);
  const bossCardsRef = useRef(0); // boss wild cards live ONLY in this ref pair - game-start effects reset help state and must not resurrect spent cards
  const [report, setReport] = useState<GameReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // BUILD 158: Chester's Breakdown - interactive post-mortem pivot scrubber.
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const [scrubTotal, setScrubTotal] = useState(0);
  const [scrubMove, setScrubMove] = useState<string>('');
  const [feared, setFeared] = useState<string | null>(null);
  const [millCount, setMillCount] = useState(0);
  useEffect(() => { setMillCount(loadMill().length); }, []);
  const [review, setReview] = useState('');
  const [scouting, setScouting] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [freeze, setFreeze] = useState<{ tone: 'green' | 'red'; text: string; banter: string; strategy: string; pawns: number; betterPhrase: string | null; best: { from: string; to: string } | null } | null>(null);
  const [banter, setBanterRaw] = useState('');
  const setBanter = (v0: string) => { const v = isBanned(v0) ? '' : v0; setBanterRaw(v); if (v) { const t = `CHESTER: ${v}`; const log = commentaryRef.current; if (log[log.length - 1] !== t) commentaryRef.current = [...log.slice(-59), t]; } };
  // BUILD 153: live accuracy rows (same chess.com-style curve as Battle Mode).
  const accRef = useRef<{ w: { loss: number; n: number }; b: { loss: number; n: number } }>({ w: { loss: 0, n: 0 }, b: { loss: 0, n: 0 } });
  const radarTally = useRef({ hanging: 0, missed: 0 }); // BUILD 163 debrief themes
  const [accuracy, setAccuracy] = useState({ ...accRef.current });
  const [accSeries, setAccSeries] = useState<number[]>([]);
  const bumpAcc = (side: 'w' | 'b', points: number) => { const slot = accRef.current[side]; slot.loss += Math.max(0, points); slot.n += 1; setAccuracy({ ...accRef.current }); if (side === 'w') { const p = Math.max(1, Math.min(100, Math.round(103.16 * Math.exp(-0.0435 * Math.max(0, points)) - 0.8))); setAccSeries((sr) => [...sr.slice(-39), p]); } };
  const releaseFreeze = () => { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = false; window.dispatchEvent(new CustomEvent('chester-clear-better')); setFreeze(null); };
  // BUILD 128 fork: ACCEPT = Chester replies at once; REWIND = take back the move (1 ply) and try again.
  const acceptConsequences = () => { (window as unknown as { __ctFastReply?: boolean }).__ctFastReply = true; releaseFreeze(); };
  const handleNextLevel = () => {
    const atTop = roadLevel >= ROAD_MAX;
    if (rushActive) { window.location.href = '/boss-rush'; return; }
    const next = atTop ? 1 : roadLevel + 1; // beating Joseph restarts the climb at level 1
    setRoadLevel(next); setRoadLevelState(next);
    setVictoryState('none'); setReport(null); setReportOpen(false); setScrubIdx(null); setMatchOver(false); setCoachPrompt(null); setCoachReply(''); setFreeze(null); setBanter(''); setCapturedPieces([]);
    (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = false;
    window.dispatchEvent(new CustomEvent('chester-clear-better'));
    window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } }));
    burstConfetti();
  };
  const rewindAndRetry = () => { window.dispatchEvent(new CustomEvent('chester-clear-better')); window.dispatchEvent(new CustomEvent('chester-rewind')); setFreeze(null); setCoachPrompt(null); setMoveTrail((t) => t.slice(0, -1)); setBanter(''); if (bossRef.current.on) { bossCardsRef.current = Math.max(0, bossCardsRef.current - 1); setBossCards(bossCardsRef.current); } };
  const [reviewLoading, setReviewLoading] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!isJosephFight || !started) return;
    let stopped = false;
    const boot = () => {
      if (stopped || josephDrone.current) return;
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const gain = ctx.createGain(); gain.gain.value = 0;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
        const mk = (f: number) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = Math.random() * 8 - 4; o.connect(lp); o.start(); return o; };
        mk(55); mk(82.5 * Math.pow(2, 3 / 12)); mk(110); // A1 + C2 (minor third) + A2
        lp.connect(gain); gain.connect(ctx.destination);
        josephDrone.current = { ctx, gain };
        (window as unknown as { __ctJosephDrone?: { ctx: AudioContext; gain: GainNode } | null }).__ctJosephDrone = josephDrone.current;
      } catch { /* audio is garnish */ }
    };
    boot();
    return () => { stopped = true; const d = josephDrone.current; josephDrone.current = null; (window as unknown as { __ctJosephDrone?: unknown }).__ctJosephDrone = null; if (d) { try { d.gain.gain.linearRampToValueAtTime(0, d.ctx.currentTime + 0.3); window.setTimeout(() => { try { void d.ctx.close(); } catch { /* */ } }, 400); } catch { /* */ } } };
  }, [isJosephFight, started]);
  useEffect(() => {
    const d = josephDrone.current;
    if (!d) return;
    const target = muted ? 0 : 0.05 + (josephPressure / 100) * 0.16;
    try { d.gain.gain.setTargetAtTime(target, d.ctx.currentTime, 0.6); } catch { /* */ }
  }, [josephPressure, muted]);
  const breakdownPivotOf = (r: GameReport | null) => {
    if (!r || !r.gradeHistory?.length) return null;
    const graded = r.gradeHistory.filter((g) => g.centipawnLoss !== null && g.centipawnLoss !== undefined);
    if (!graded.length) return null;
    return graded.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b));
  };
  const breakdownOn = !!report && !reportOpen && victoryState === 'none' && !!report?.pgn && !!breakdownPivotOf(report);
  useEffect(() => {
    if (!breakdownOn || !report) return;
    const pv = breakdownPivotOf(report); if (!pv) return;
    const onStatus = (e: Event) => { const d = (e as CustomEvent<{ index: number; total: number; move: string }>).detail; setScrubIdx(d.index); setScrubTotal(d.total); setScrubMove(d.move || ''); };
    window.addEventListener('replay-status', onStatus);
    window.dispatchEvent(new CustomEvent('replay-step', { detail: { index: pv.ply - 1 } }));
    return () => window.removeEventListener('replay-status', onStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdownOn]);
  useEffect(() => {
    if (!breakdownOn || !report?.pgn) return;
    const pv = breakdownPivotOf(report); if (!pv) return;
    let dead = false;
    setFeared(null);
    try {
      const fen = fenBeforePly(report.pgn, pv.ply);
      if (!fen) return;
      void getStockfishClient().analyzeForDisplay(fen).then((a) => {
        if (dead) return;
        try { const u = a.pv[0]; const m = u ? new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] as 'q' | 'r' | 'b' | 'n' | undefined }) : null; setFeared(m ? m.san : null); } catch { setFeared(null); }
      }).catch(() => undefined);
    } catch { /* breakdown is garnish */ }
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdownOn]);
  const [lessonStep, setLessonStep] = useState(0);
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => { if (!chatOpen) return; const b = document.querySelector('.chester-board-frame'); if (b) setChatTop(Math.round(b.getBoundingClientRect().bottom) + 6); }, [chatOpen]);
  const [heroTipOpen, setHeroTipOpen] = useState(false);
  const dismissHeroTip = () => { setHeroTipOpen(false); try { localStorage.setItem('ct-hero-tip-seen', '1'); } catch {} };
  useEffect(() => {
    if (!started) return;
    try { if (!localStorage.getItem('ct-hero-tip-seen')) setHeroTipOpen(true); } catch { setHeroTipOpen(true); }
  }, [started]);

  const [duelStatus, setDuelStatus] = useState<'idle' | 'waiting' | 'connected' | 'failed'>('idle');
  const duelConnRef = useRef<{ send: (d: unknown) => void } | null>(null);
  useEffect(() => {
    if (mode !== 'PVP_REMOTE' || !requestedRoom) return;
    let dead = false;
    const cleanupRef: Array<() => void> = [];
    type Conn = { on: (e: string, cb: (a?: unknown) => void) => void; send: (d: unknown) => void };
    type DuelPeer = { on: (e: string, cb: (a?: unknown) => void) => void; destroy: () => void; connect: (id: string) => Conn };
    let peer: DuelPeer | null = null;
    let duelConnected = false;
    const wireConn = (conn: Conn) => {
      duelConnRef.current = conn;
      conn.on('open', () => { if (!dead) { duelConnected = true; setDuelStatus('connected'); setStarted(true); } });
      conn.on('data', (data?: unknown) => {
        const d = data as { type?: string; from?: string; to?: string; fen?: string } | undefined;
        if (d && d.type === 'move' && d.from && d.to) window.dispatchEvent(new CustomEvent('remote-chess-move', { detail: { from: d.from, to: d.to, fen: d.fen } }));
        if (d && d.type === 'flag') { setFlagResult('won'); setMatchOver(true); }
      });
      conn.on('close', () => { if (!dead) setDuelStatus('failed'); });
    };
    const localMoveRelay = (event: Event) => {
      const d = (event as CustomEvent<{ from: string; to: string; fen: string }>).detail;
      try { duelConnRef.current?.send({ type: 'move', from: d.from, to: d.to, fen: d.fen }); } catch {}
    };
    window.addEventListener('local-chess-move', localMoveRelay);
    setDuelStatus('waiting');
    void import('peerjs').then(({ default: Peer }) => {
      if (dead) return;
      const roomId = `chess-town-duel-${requestedRoom}`;
      if (requestedSeat === 'w') {
        // Host. A quick refresh (or a double-opened tab) can hit unavailable-id while the
        // broker still holds the old registration - retry every 3s like the guest's knock
        // instead of showing a dead CONNECTION DROPPED panel. ~2 minutes of patience.
        let hostTries = 0;
        let hostTimer: ReturnType<typeof setTimeout> | null = null;
        const openRoom = () => {
          if (dead) return;
          hostTries += 1;
          try {
            peer = new Peer(roomId, PEER_CONFIG as never) as unknown as DuelPeer;
            peer!.on('connection', (conn?: unknown) => wireConn(conn as Conn));
            peer!.on('error', (err?: unknown) => {
              if (dead) return;
              const t = (err as { type?: string })?.type || '';
              if (t === 'unavailable-id' && hostTries < 40) {
                try { peer?.destroy(); } catch {}
                hostTimer = setTimeout(openRoom, 3000);
                return;
              }
              setDuelStatus('failed');
            });
          } catch { if (hostTries < 40) hostTimer = setTimeout(openRoom, 3000); }
        };
        openRoom();
        cleanupRef.push(() => { if (hostTimer) clearTimeout(hostTimer); });
      } else {
        // Guest. The friend often opens the link BEFORE the host opens their room, so a
        // peer-unavailable must retry - that was the real-world failure (one shot, then a
        // dead "connection dropped" panel). Retry every 3s for ~3 minutes.
        let tries = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const knock = () => {
          if (dead || !peer || duelConnected) return;
          tries += 1;
          try {
            const conn = peer.connect(roomId);
            wireConn(conn);
          } catch { /* fall through to the retry */ }
          timer = setTimeout(knock, 3000);
        };
        peer = new Peer(PEER_CONFIG as never) as unknown as DuelPeer;
        peer!.on('open', knock);
        peer!.on('error', (err?: unknown) => {
          if (dead) return;
          const t = (err as { type?: string })?.type || '';
          if (t === 'peer-unavailable' && tries < 60) return; // the retry loop owns this case
          if (tries >= 60 || (t && t !== 'peer-unavailable')) setDuelStatus('failed');
        });
        cleanupRef.push(() => { if (timer) clearTimeout(timer); });
      }
    }).catch(() => { if (!dead) setDuelStatus('failed'); });
    return () => { dead = true; cleanupRef.forEach((fn) => fn()); window.removeEventListener('local-chess-move', localMoveRelay); try { peer?.destroy(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, requestedRoom, requestedSeat]);

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'chester'; text: string; kind?: 'chat' | 'reaction' }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [lastFen, setLastFen] = useState(START_FEN);
  const [moveTrail, setMoveTrail] = useState<{ move: string; classification?: string | null }[]>([]);
  const [lastBest, setLastBest] = useState<string | null>(null);
  const [lastBestPhrase, setLastBestPhrase] = useState<string | null>(null);
  const [lastMovePhrase, setLastMovePhrase] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [lastHintReply, setLastHintReply] = useState('');
  const selectedLevel = useMemo(() => LEVELS.find((level) => level.value === difficulty)!, [difficulty]);
  const modeKicker = mode === 'PVP_LOCAL' ? 'FRIENDLY DUEL' : mode === '2V2' ? 'TAG MATCH' : mode === 'PVP_REMOTE' ? 'LIVE DUEL' : 'PLAYING CHESTER';
  const modeTitle = mode === 'PVP_LOCAL' ? 'PASS & PLAY' : mode === '2V2' ? '2V2 CHAOS' : mode === 'PVP_REMOTE' ? (requestedSeat === 'w' ? 'YOU ARE WHITE' : 'YOU ARE BLACK') : selectedLevel.label;
  const isFriendMode = mode === 'PVP_LOCAL' || mode === '2V2' || mode === 'PVP_REMOTE';
  const placePowerups = () => {
    if (roadActive && !isBossFight && !isFriendMode) {
      const squares = ['d4', 'e4', 'c4', 'f4', 'd5', 'e5', 'c5', 'f5', 'c3', 'f3', 'c6', 'f6'];
      const pick = () => squares.splice(Math.floor(Math.random() * squares.length), 1)[0];
      powerupsRef.current = [{ sq: pick(), kind: 'torch' }, { sq: pick(), kind: 'shield' }];
      setPowerups(powerupsRef.current);
    } else { powerupsRef.current = []; setPowerups([]); }
  };
  useEffect(() => { setLoot({ torch: 0, shield: 0 }); placePowerups(); }, [started, roadLevel, roadActive, isBossFight, isFriendMode]);
  useEffect(() => {
    const collect = (e: Event) => {
      const to = (e as CustomEvent<{ to?: string }>).detail?.to;
      if (!to) return;
      const hit = powerupsRef.current.find((p) => p.sq === to);
      if (!hit) return;
      powerupsRef.current = powerupsRef.current.filter((p) => p.sq !== to);
      setPowerups(powerupsRef.current);
      setLoot((l) => ({ ...l, [hit.kind]: l[hit.kind] + 1 }));
      playSfx('win');
      setBanter(hit.kind === 'torch' ? '⭐ POWER-UP: TORCH collected. Cash it in for the full engine answer, free.' : '⭐ POWER-UP: SHIELD collected. Cash it in for a free take-back, no questions asked.');
    };
    const reload = () => { setLoot({ torch: 0, shield: 0 }); placePowerups(); };
    window.addEventListener('chester-move-squares', collect);
    window.addEventListener('load-puzzle', reload);
    return () => { window.removeEventListener('chester-move-squares', collect); window.removeEventListener('load-puzzle', reload); };
  }, [roadActive, isBossFight, isFriendMode, roadLevel, started]);


  useEffect(() => { if (started) setCountdown((n) => n + 1); }, [started]);

  useEffect(() => {
    if (!started) return;
    setHelpRemaining(bossRef.current.on ? 2 : difficulty === 'BEGINNER' ? 5 : 3); const bc = bossRef.current.on ? 2 : 0; bossCardsRef.current = bc; setBossCards(bc); setCoachPrompt(null);
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const capture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const gameReport = (event: Event) => {
      const detail = (event as CustomEvent<GameReport>).detail;
      if (!isFriendMode) bumpPlayStreak();
      setReport(detail); setReportOpen(true);
      if (!isFriendMode) {
        const result = /1-0\s*$/.test(detail.pgn || '') ? 'win' : /0-1\s*$/.test(detail.pgn || '') ? 'loss' : 'draw';
        const myMoves = detail.gradeHistory.filter((entry) => entry.player === 'You');
        try { recordGameToFile(buildGameRecord({ level: difficulty, result, pgn: detail.pgn || '', gradeHistory: detail.gradeHistory })); } catch { /* learning is a bonus, never break the report */ }
        const habit = weakestHabit(detail, myMoves.filter((entry) => entry.grade === 'F').length);
        setLadder(recordLadderGame({ level: difficulty, result, grade: detail.grade, focus: habit.focus, weakness: habit.key }));
      }
      if (roadRef.current.active && !isFriendMode && new URLSearchParams(window.location.search).get('rush') === '1' && detail.pgn) {
        if (/1-0\s*$/.test(detail.pgn)) { const r = rushWin(); setRushMsg({ kind: 'win', step: r.step, complete: r.complete }); setVictoryState('boss_defeated'); if (r.complete) { try { burstConfetti(); } catch { /* */ } } } else { rushLoss(); setRushMsg({ kind: 'loss' }); }
      } else if (roadRef.current.active && !isFriendMode && detail.pgn && /1-0\s*$/.test(detail.pgn)) { const lv = roadRef.current.level; setRoadLevel(Math.min(ROAD_MAX, lv + 1)); try { window.localStorage.setItem('ct-road-level-v1-seen', String(Math.min(ROAD_MAX, lv + 1))); } catch { /* */ } setVictoryState(isBossLevel(lv) ? 'boss_defeated' : 'cleared'); if (isBossLevel(lv)) { try { const SKIN: Record<number, string> = { 3: 'EMBER', 6: 'SHADOW', 9: 'CRIMSON', 12: 'FROST', 15: 'GOLD' }; const s = SKIN[lv]; const u = JSON.parse(localStorage.getItem('ct-skins') || '[]'); if (s && !u.includes(s)) { u.push(s); localStorage.setItem('ct-skins', JSON.stringify(u)); setSkinUnlocked(s); } } catch { /* */ } } }
      if (!isFriendMode && detail.pgn && /1-0\s*$/.test(detail.pgn)) {
        awardPoints('chester-win', `Beat ${difficulty} Chester`, DIFFICULTY_POINTS[difficulty] || 40);
        if (bossNode) completeBossNode(bossNode);
      }
    };
    const bestSquares = (fenBefore: string | null | undefined, best: string | null | undefined): { from: string; to: string } | null => {
      if (!fenBefore || !best) return null;
      try { const m = new Chess(fenBefore).move(best, { strict: false } as never) ?? null; if (m) return { from: m.from, to: m.to }; } catch { /* not SAN */ }
      const u = /^([a-h][1-8])([a-h][1-8])/.exec(best); return u ? { from: u[1], to: u[2] } : null;
    };
    const bestSanOf = (fenBefore: string | null | undefined, best: string | null | undefined): string | null => {
      const sq = bestSquares(fenBefore, best); if (!fenBefore || !sq) return null;
      try { return new Chess(fenBefore).move({ from: sq.from, to: sq.to, promotion: 'q' })?.san ?? null; } catch { return null; }
    };
    const coach = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; if (!isFriendMode && detail.kind === 'move') { const d = direct({ moveSan: detail.move, bestSan: bestSanOf(detail.fenBefore, detail.bestMove), classification: detail.classification, evalDelta: detail.evalDelta, evaluationBefore: detail.evaluationBefore, evaluationAfter: detail.evaluationAfter, playerColor: 'w', movePhrase: detail.movePhrase, bestMovePhrase: detail.bestMovePhrase, captured: detail.captured, check: detail.check, mate: detail.mate, sacrificePiece: detail.sacrificePiece, principleKey: detail.principleKey, principleFollowed: detail.principleFollowed, ply: detail.ply, fenBefore: detail.fenBefore, move: detail.move, bestMove: detail.bestMove }); { const wc = buildWhyCard({ ply: detail.ply || cardsRef.current.length * 2 + 1, san: detail.move || '', fenBefore: detail.fenBefore || '', fenAfter: detail.fen || '', classification: detail.classification, cp: detail.evalDelta, bestSan: bestSanOf(detail.fenBefore, detail.bestMove), check: detail.check, mate: detail.mate, captured: detail.captured }); setWhyCard(wc); setWhyFresh(true); cardsRef.current = [...cardsRef.current.slice(-59), wc]; if (geminiTierOn() && (wc.grade === 'SHAKY' || wc.grade === 'BLUNDER' || wc.grade === 'BRILLIANT')) { const facts = { moveNumber: wc.moveNo, playerMoveSan: wc.san, moveGrade: wc.grade, centipawnLoss: wc.cp, engineBestSan: wc.engineBestSan, deterministic: { headline: wc.headlineBadge, whatHappened: wc.whatHappenedLine, engine: wc.engineBlueprintLine }, recentLines: cardsRef.current.slice(-5, -1).map((c) => c.whatHappenedLine) }; fetch('/api/chester/commentary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ facts }) }).then((r) => r.json()).then((j: { headlineBadge?: string; whatHappenedLine?: string; engineBlueprintLine?: string; usage?: { input: number; output: number } }) => { if (j.usage) { const w = window as unknown as { __chesterUsage?: { input: number; output: number }[] }; (w.__chesterUsage ||= []).push(j.usage); } if (j.whatHappenedLine && j.engineBlueprintLine) { const up: WhyCard = { ...wc, headlineBadge: (j.headlineBadge || wc.headlineBadge).toUpperCase(), whatHappenedLine: `${wc.grade === 'SHAKY' || wc.grade === 'BLUNDER' ? '❌' : '✅'} ${j.whatHappenedLine}`, engineBlueprintLine: `🤖 ${j.engineBlueprintLine}` }; cardsRef.current = cardsRef.current.map((c) => (c.ply === wc.ply && c.san === wc.san ? up : c)); setWhyCard((cur) => (cur && cur.ply === wc.ply && cur.san === wc.san ? up : cur)); } }).catch(() => undefined); } if (wc.grade === 'BLUNDER') { setArrowsOn(true); } else setArrowsOn(false); } const radar = radarForUserMove(detail.fenBefore || '', detail.fen || '', bestSanOf(detail.fenBefore, detail.bestMove), detail.move || '', null); const rl = radarLines(radar, detail.move || '', /BLUNDER|MISTAKE|INACCURACY|MISS/i.test(detail.classification || '')); if (radar.hanging.length) radarTally.current.hanging += 1; if (radar.missedFork || radar.missedMate) radarTally.current.missed += 1; if (bossRef.current.on && !(d.ui_action === 'freeze_red' && bossCardsRef.current > 0)) { setFreeze(null); setBanter(''); } else if (d.ui_action === 'freeze_red' && !(bpRef.current.opening && bpRef.current.status === 'guiding' && bpRef.current.opening.steps[bpRef.current.step]?.san === detail.move)) { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = true; commentaryRef.current = [...commentaryRef.current.slice(-59), `FROZEN - ${d.freeze_explanation}`]; setFreeze({ tone: 'red', text: d.freeze_explanation, banter: rl.length ? rl.join(' ') : d.chester_immediate_chat, strategy: d.strategy, pawns: d.pawns, betterPhrase: detail.bestMovePhrase || null, best: bestSquares(detail.fenBefore, detail.bestMove) }); setBanter(''); if (d.better) window.dispatchEvent(new CustomEvent('chester-show-better', { detail: { ...d.better, tone: 'red' } })); } else if (d.ui_action === 'freeze_green') { setFreeze({ tone: 'green', text: d.freeze_explanation, banter: d.chester_immediate_chat, strategy: d.strategy, pawns: 0, betterPhrase: null, best: null }); setBanter(''); } else { setFreeze(null); setBanter(rl.length ? rl.join(' ') : d.chester_immediate_chat); if (d.ui_action === 'shake') { setShake(true); window.setTimeout(() => setShake(false), 700); } } } if (detail.kind === 'move' && detail.evalDelta != null && detail.ply != null) { const mv = detail.ply % 2 === 1 ? 'w' : 'b'; const afterMover = detail.evaluationAfter == null ? null : (mv === 'w' ? detail.evaluationAfter : -detail.evaluationAfter); bumpAcc(mv, detail.evaluationBefore != null && afterMover != null ? accPoints(detail.evaluationBefore, afterMover) : accPointsFromDelta(detail.evalDelta)); } if (!isFriendMode && recordMillMistake({ fenBefore: detail.fenBefore, bestMove: detail.bestMove, move: detail.move, classification: detail.classification, evalDelta: detail.evalDelta, bestMovePhrase: detail.bestMovePhrase, provisional: detail.provisional })) setMillCount(loadMill().length); setCoachPrompt({ ...detail, kind: 'move' }); try { const bl = buildCoachBullets({ fen: detail.fen, classification: detail.classification, movePhrase: detail.movePhrase, bestMovePhrase: detail.bestMovePhrase, captured: detail.captured, check: detail.check, mate: detail.mate, evalDelta: detail.evalDelta, evaluationAfter: detail.evaluationAfter, opponentName: isFriendMode ? 'your rival' : null, viewerColor: mode === 'PVP_REMOTE' ? requestedSeat : 'w', ply: detail.ply, move: detail.move, bestMove: detail.bestMove, fenBefore: detail.fenBefore, engineLine: detail.engineLine || null }); const line = [bl.reaction, bl.why, !bl.gradeGood ? bl.risk : null].filter(Boolean).join(' '); const log = commentaryRef.current; if (line && log[log.length - 1] !== line) commentaryRef.current = [...log.slice(-59), line]; } catch { /* logging is a bonus */ } setLessonStep((step) => Math.min(2, step + 1)); if (detail.fen) setLastFen(detail.fen); if (detail.move) setMoveTrail((t) => [...t.slice(-14), { move: detail.move!, classification: detail.classification }]); if (detail.bestMove) setLastBest(detail.bestMove); if (detail.bestMovePhrase) setLastBestPhrase(detail.bestMovePhrase); if (detail.movePhrase) setLastMovePhrase(detail.movePhrase); if (detail.kind === 'move' && detail.ply === 1 && !isFriendMode) startChallenge(); if (detail.kind === 'move' && !isFriendMode) updateChallenge(detail); if (detail.kind === 'move') { window.clearTimeout(leanT.current); const rc = (detail.classification || '').toUpperCase(); if (rc === 'BLUNDER' || rc === 'MISTAKE') fireReact('😏'); else if (rc === 'BRILLIANT') fireReact('😲'); } };
    const aiGraded = (event: Event) => { const d = (event as CustomEvent<{ evalDelta: number | null }>).detail; if (d && d.evalDelta != null) { bumpAcc('b', accPointsFromDelta(d.evalDelta)); if (d.evalDelta >= 250) fireReact('😬'); } if (bossRef.current.on) setBossStrike(Date.now()); };
    const help = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; setCoachPrompt({ ...detail, kind: 'help' }); if (detail.fen) setLastFen(detail.fen); if (detail.bestMove) setLastBest(detail.bestMove); if (detail.bestMovePhrase) setLastBestPhrase(detail.bestMovePhrase); };
    const resetJails = () => setCapturedPieces([]);
    const restored = (event: Event) => { const r = (event as CustomEvent<CapturedPiece>).detail; setCapturedPieces((pieces) => { const i = pieces.findLastIndex((p) => p.color === r.color && p.type === r.type); return i < 0 ? pieces : pieces.filter((_, k) => k !== i); }); };
    window.addEventListener('piece-restored', restored);
    window.addEventListener('load-puzzle', resetJails);
    window.addEventListener('piece-captured', capture); window.addEventListener('game-report', gameReport); window.addEventListener('chester-coaching-pause', coach); window.addEventListener('chester-help-response', help); window.addEventListener('chester-ai-graded', aiGraded); accRef.current = { w: { loss: 0, n: 0 }, b: { loss: 0, n: 0 } }; setAccuracy({ ...accRef.current });
    return () => { window.clearTimeout(timer); window.removeEventListener('load-puzzle', resetJails); window.removeEventListener('piece-restored', restored); window.removeEventListener('piece-captured', capture); window.removeEventListener('game-report', gameReport); window.removeEventListener('chester-coaching-pause', coach); window.removeEventListener('chester-help-response', help); window.removeEventListener('chester-ai-graded', aiGraded); };
  }, [mode, started]);

  useEffect(() => { coachPromptRef.current = coachPrompt; }, [coachPrompt]);
  useEffect(() => { if (!freeze || freeze.tone === 'red') return; const t = window.setTimeout(releaseFreeze, 5000); return () => window.clearTimeout(t); }, [freeze]);
  useEffect(() => { if (!banter) return; const t = window.setTimeout(() => setBanter(''), 4500); return () => window.clearTimeout(t); }, [banter]);
  useEffect(() => () => { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = false; }, []);

  useEffect(() => {
    if (coachPrompt?.kind === 'help' && !isThinking && coachReply) setLastHintReply(coachReply);
  }, [coachPrompt, isThinking, coachReply]);

  useEffect(() => {
    if (!coachPrompt) return;
    if (coachPrompt.kind === 'move' && bossRef.current.on && bossRef.current.boss) {
      // BOSS EXAM MODE: no coaching. The boss taunts in one hostile sentence (Joseph stays silent).
      setIsThinking(false); setCoachReply(''); setTeleprompterLlm(null);
      const bs = bossRef.current.boss; const p = coachPrompt;
      if (bs.name === 'Joseph') { setBanter(''); return; }
      void askChesterChat(JSON.stringify({ type: 'boss-taunt', message: bossTauntPrompt(bs, 'Forrest'), evalDelta: p.evalDelta ?? null, evaluationBefore: p.evaluationBefore ?? null, evaluationAfter: p.evaluationAfter ?? null, fen: p.fen }))
        .then((reply) => { if (reply && !/messenger|delayed|unavailable/i.test(reply)) setCoachReply(reply.trim()); })
        .catch(() => undefined);
      return;
    }
    if (coachPrompt.kind === 'move') {
      // Verdict bullets stay fully local. The LLM speaks only on VALUE MOMENTS
      // (blunder/mistake/brilliant/great, or a 2+ pawn swing) - the hybrid guard
      // that keeps the persona voice where it matters at near-zero per-move cost.
      setIsThinking(false); setCoachReply('');
      setTeleprompterLlm(null);
      const loss = Math.abs(coachPrompt.evalDelta ?? 0);
      const bigGrade = /blunder|mistake|brilliant|great/i.test(coachPrompt.classification || '');
      const prompt = coachPrompt;
      if (bigGrade || loss >= 200) {
        // Anchor the LLM to the SAME descriptor the WWCD line prints
          // (explainEngineChoice) - one move, one wording, no divergence.
          const anchorIdea = (prompt.fenBefore && prompt.bestMove ? explainEngineChoice(prompt.fenBefore, prompt.bestMove) : null) || prompt.bestMovePhrase || 'unknown';
          const swingFact = loss >= 200
          ? ` The move gave away about ${(loss / 100).toFixed(1)} pawns.`
          : /brilliant|great/i.test(prompt.classification || '') ? ' This is a big POSITIVE moment - praise it.' : '';
        void askChesterChat(JSON.stringify({ type: 'teleprompter', message: 'Write the teleprompter line for this move.', context: `The player just played ${prompt.movePhrase || prompt.move}. Grade: ${prompt.classification || 'ungraded'}.${swingFact}${prompt.check ? ' It gives check.' : ''}${prompt.mate ? ' It is checkmate.' : ''} The engine's preferred idea was: ${anchorIdea} - COACH ONLY THIS IDEA: hint at its theme without naming the exact move, and never suggest any other move or plan.`, fen: prompt.fen || lastFen }))
          .then((reply) => {
            if (!reply || /messenger|delayed|unavailable/i.test(reply)) return;
            // Agreement guard: the LLM line must share a content word with the
            // engine's preferred idea, or the WWCD template stays on screen.
            const STOP = new Set(['pawn', 'push', 'move', 'piece', 'best', 'with', 'your', 'into', 'the', 'and', 'for', 'square', 'play', 'two']);
            const anchors = anchorIdea.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
            const low = reply.toLowerCase();
            if (!anchors.length || anchors.some((w) => low.includes(w))) setTeleprompterLlm({ key: `${prompt.ply}-${prompt.move}`, text: reply });
          })
          .catch(() => undefined);
        // CHAT target from the spec: Chester the friendly opponent reacts live
        // to big eval swings in the chat drawer - praise on great finds, a gentle
        // tease + hint on 2+ pawn drops, under 20 words.
        if (!isFriendMode && mode !== 'PVP_REMOTE') {
          void askChesterChat(JSON.stringify({ type: 'reaction', message: 'React to this move as the opponent.', context: `The player just played ${prompt.movePhrase || prompt.move}. Grade: ${prompt.classification || 'ungraded'}.${swingFact}`, fen: prompt.fen || lastFen }))
            .then((reply) => { if (reply && !/messenger|delayed|unavailable/i.test(reply)) setChatMessages((prev) => [...prev.slice(-30), { role: 'chester', text: reply, kind: 'reaction' }]); })
            .catch(() => undefined);
        }
      }
      return;
    }
    setIsThinking(true); setCoachReply('');
    const grounded = personaCoaching({ ...coachPrompt, kind: coachPrompt.kind as 'move' | 'help' }, difficulty);
    const FACT_PIECE: Record<string, string> = { p: 'a pawn', n: 'a knight', b: 'a bishop', r: 'a rook', q: 'the queen' };
    const moveFact = coachPrompt.movePhrase || coachPrompt.move || 'help request';
    const capturedFact = coachPrompt.captured ? (FACT_PIECE[coachPrompt.captured] || 'a piece') : 'nothing';
    const sacrificeFact = coachPrompt.sacrificePiece
      ? `yes - the student deliberately offered their ${coachPrompt.sacrificePiece} and the engine calls the move ${coachPrompt.classification || 'strong'} because the payback is forced. If you mention the sacrifice, name the ${coachPrompt.sacrificePiece} and no other piece`
      : 'no';
    const scriptFact = (coachPrompt.engineLine || []).filter(Boolean).slice(0, 3).join(', then ');
    // ROOKIE teaching lens: name the principle at stake so commentary, chat and hints all
    // teach the same opening curriculum the WHY sheets teach.
    const PRINCIPLE_FACTS: Record<string, string> = {
      'centre': 'fighting for the centre with a central pawn',
      'development': 'bringing a new piece into the game',
      'king-safety': 'castling the king to safety',
      'repeat-move': 'moving the same piece twice while other pieces still sleep',
      'early-queen': 'bringing the queen out too early',
      'edge-pawn': 'pushing an edge pawn that fights for nothing',
      'exposed-piece': 'putting a piece where it can be taken for nothing',
    };
    const principleFact = coachPrompt.principleKey && PRINCIPLE_FACTS[coachPrompt.principleKey]
      ? ` This move is an example of ${PRINCIPLE_FACTS[coachPrompt.principleKey]}${coachPrompt.principleFollowed ? ' done RIGHT' : ' done WRONG'} - teach that principle in one plain sentence.`
      : '';
    const rookieTeaching = difficulty === 'BEGINNER'
      ? ' The student is a beginner: teach the opening principles whenever they apply - fight for the centre, bring every piece out once before moving any piece twice, castle early, never put a piece where it can be taken for free. In the middlegame, say plainly where the real danger is or where a strong opening can turn into a real attack.'
      : '';
    const provisionalFact = coachPrompt.provisional ? ' IMPORTANT: the deep engine has not confirmed this verdict yet - call it a first impression, never a settled grade.' : '';
    const exchangeFact = coachPrompt.exchangeLost && coachPrompt.exchangeWon
      ? ` PLANNED EXCHANGE (direction facts - do NOT invert): CHESTER (the opponent) wins the student's ${coachPrompt.exchangeLost}. Then THE STUDENT wins Chester's ${coachPrompt.exchangeWon} back with the recapture. Net: the student comes out ahead on material - losing ${coachPrompt.exchangeLost}, gaining ${coachPrompt.exchangeWon}. The student set the trap on purpose: praise the foresight, and never call the lost ${coachPrompt.exchangeLost} a blunder or say the student wins ${coachPrompt.exchangeLost}.`
      : '';
    const toneInstruction = difficulty === 'BEGINNER' ? ' TONE: warm and encouraging, never scolding, never tell them to take a breath - frame every mistake as a useful discovery and acknowledge the plan behind the move before the flaw.' : '';
    // WHY-card de-dup: the student can open the WHY sheet for the same move, so the
    // spoken commentary must add something new rather than recite the card.
    const whyCard = null;
    const whyDedupeFact = '';
    const ladderMemory = (() => { try { const lad = getLadder(); if (!lad.lastLevel) return ''; return ` HISTORY WITH THIS STUDENT (reference at most once, only when genuinely relevant - e.g. they repeat an old mistake or finally fix it): last visit they earned ${lad.lastGrade || 'an ungraded game'} at ${LADDER_LABELS[lad.lastLevel] || lad.lastLevel}${lad.lastFocus ? ` and you told them to work on: ${lad.lastFocus}` : ''}.`; } catch { return ''; } })();
    const context = `You are Chester, ${PERSONA_DESC[difficulty]}. Stay in that voice, at most 3 short sentences (up to 480 characters). SPECIFICITY IS THE WHOLE JOB: name the piece in the facts and the concrete danger or idea - never say a move was just 'risky' or 'loose' when the facts say why.${ladderMemory} FACTS about the move (exact and complete - never contradict them, never name a different piece than these): the student played ${moveFact}. It captured ${capturedFact}. Sacrifice: ${sacrificeFact}. Engine verdict: ${coachPrompt.classification || 'unknown'}.${provisionalFact} Eval swing: ${coachPrompt.evalDelta ?? 'unknown'} centipawns. Engine-preferred move: ${coachPrompt.bestMovePhrase || 'unknown'}.${scriptFact ? ` The engine's script from here: ${scriptFact}.` : ''}${principleFact}${exchangeFact}${toneInstruction}${rookieTeaching}${whyDedupeFact} Explain the threat, plan and why in plain English (no centipawns, no engine jargon). Give one concrete next action. Never invent board facts: which piece moved, what was captured and what was sacrificed are exactly as stated above. NEVER use chess notation or coordinates - describe moves in words, like 'knight to the kingside' or 'pawn two squares up'.`;
    void askChesterChat(JSON.stringify({ type: 'coach', message: 'Give me a strategic hint.', context, fen: coachPrompt.fen || lastFen }))
      .then((reply) => { const text = reply && !/messenger|delayed|unavailable/i.test(reply) ? reply : grounded; setCoachReply(text); })
      .catch(() => { setCoachReply(grounded); })
      .finally(() => setIsThinking(false));
  }, [coachPrompt]);

  useEffect(() => {
    if (!report) return;
    const phraseMap = phrasesFromPgn(report.pgn || '');
    const story = buildStoryRecap(report.gradeHistory, difficulty, (ply) => phraseMap.get(ply) || null);
    setReview(story);
    setReviewLoading(false);
    const topSwings = [...report.gradeHistory].filter((g) => g.player === 'You').sort((a, b) => (b.centipawnLoss ?? 0) - (a.centipawnLoss ?? 0)).slice(0, 2).map((g) => `${phraseMap.get(g.ply) || g.move} (graded ${g.grade}, lost about ${((g.centipawnLoss ?? 0) / 100).toFixed(1)} pawns)`).join('; ') || 'no big swings on record';
    // BUILD 163: local debrief FIRST (zero AI spend, instant) - the Gemini path below
    // only overrides if it ever answers again.
    const local = buildLocalDebrief(report.gradeHistory, phraseMap, radarTally.current);
    setReview(local.review); setReviewLoading(false);
    // BUILD 163: drill of the day - carry the debrief's fix into the start screen, then reset tallies.
    try { localStorage.setItem('ct-drill', JSON.stringify({ ts: Date.now(), hanging: radarTally.current.hanging, missed: radarTally.current.missed, drill: (local.scouting[2] || '').replace('One adjustment: ', '') })); } catch { /* private mode */ }
    radarTally.current = { hanging: 0, missed: 0 };
    const file = loadPlayerFile();
    setScouting([...local.scouting, ...localScouting(file)]);
    const a = analyse(file);
    const playerLine = a.games ? `${a.games} games, ${a.wins} wins, ${a.perGame.toFixed(1)} big slips a game. ${a.headline}` : 'first game on record';
    void askChesterChat(JSON.stringify({ type: 'post-game-report', gradeHistory: report.gradeHistory.map((g) => ({ player: g.player, move: g.move, grade: g.grade, phrase: phraseMap.get(g.ply) || undefined })), persona: PERSONA_DESC[difficulty], instruction: postGamePrompt(topSwings, playerLine) }))
      .then((reply) => { const parsed = parsePostGame(reply); if (parsed) { setReview(parsed.debrief); setScouting(parsed.bullets); } else if (reply && !/messenger|delayed|unavailable|\{/.test(reply)) setReview(reply); })
      .catch(() => undefined);
  }, [report, difficulty]);

  type PeekLine = { uci: string | null; score: number | null; mate: number | null };
  const peekBoard = (multiPv = 1) => new Promise<{ fen: string; bestMove: string | null; lines?: PeekLine[] } | null>((resolve) => {
    const id = Date.now() + Math.random();
    const onResp = (ev: Event) => { const d = (ev as CustomEvent<{ id: number; fen: string; bestMove: string | null; lines?: PeekLine[] }>).detail; if (d?.id !== id) return; window.removeEventListener('chester-peek-response', onResp); window.clearTimeout(tm); resolve(d); };
    const tm = window.setTimeout(() => { window.removeEventListener('chester-peek-response', onResp); resolve(null); }, 5000);
    window.addEventListener('chester-peek-response', onResp);
    window.dispatchEvent(new CustomEvent('chester-peek-request', { detail: { id, multiPv } }));
  });
  const sendChat = async (event: React.FormEvent | null, preset?: string) => {
    event?.preventDefault();
    const message = (preset || chatInput).trim();
    if (!message || chatBusy) return;
    setChatInput(''); setChatError('');
    const history = [...chatMessages, { role: 'user' as const, text: message }];
    setChatMessages(history);
    setChatBusy(true);
    const lastMove = moveTrail[moveTrail.length - 1];
    const fallback = () => chesterOfflineChat(message, { persona: difficulty, fen: lastFen, lastMove: lastMove?.move, lastMovePhrase, classification: lastMove?.classification, bestMove: lastBest, bestMovePhrase: lastBestPhrase, capturedCount: capturedPieces.length, historyCount: history.length });
    const context = `You are Chester, ${PERSONA_DESC[difficulty]}. You are chatting mid-game with your student. Live board FEN: ${lastFen}. Moves so far: ${moveTrail.map((m) => m.move).join(' ') || 'none yet'}. Last graded student move: ${lastMove ? `${lastMove.move} (${lastMove.classification || 'ungraded'})` : 'none'}. Engine-preferred idea: ${lastBest || 'unknown'}. Answer the student directly in at most 3 sentences. Be funny AND educational: every joke carries a chess lesson, every lesson lands a joke. Use only the FEN and record above for board facts - never invent pieces, squares, or lines. Plain English, no centipawns, no engine jargon.`;
    const deterministic = () => chatReply(message, whyCard, liveRef.current.fen ? { fen: liveRef.current.fen, bestSan: liveRef.current.bestSan } : null);
    if (/what should i (do|play)|what next|what now|next move|what do i do|my best move|stuck|\blost\b|suggest|help me/i.test(message)) {
      // Next-move questions are answered from a fresh look at the board as it is right now, never from an older card.
      const got = await peekBoard();
      let text: string;
      const turn = got?.fen.split(' ')[1];
      if (!got) text = 'I could not read the board in time. Ask me again in a second.';
      else if (!isFriendMode && turn !== 'w') text = 'It is my move right now. Ask me again once I have played and I will tell you what I would do.';
      else { const sug = got.bestMove ? explainEngineChoice(got.fen, got.bestMove) : null; text = sug ? `Here is what I would do: ${sug}.` : 'I cannot find a clear suggestion for this position yet. Look for anything of yours that is attacked and not protected, then for a safe capture.'; }
      setChatMessages([...history, { role: 'chester', text: text.charAt(0).toUpperCase() + text.slice(1), kind: 'chat' }]); setChatBusy(false);
      return;
    }
    if (/compare|candidate|top 2|top two/i.test(message)) {
      // One-tap compare: two real engine lines for THIS position, in words, with an honest gap call.
      const got = await peekBoard(2);
      let text: string;
      const turn = got?.fen.split(' ')[1];
      if (!got) text = 'I could not read the board in time. Ask me again in a second.';
      else if (!isFriendMode && turn !== 'w') text = 'It is my move right now. Ask me again once I have played.';
      else if (got.lines && got.lines.length >= 2 && got.lines[0].uci && got.lines[1].uci) {
        const a = explainEngineChoice(got.fen, got.lines[0].uci as string);
        const b = explainEngineChoice(got.fen, got.lines[1].uci as string);
        const s0 = got.lines[0].score, s1 = got.lines[1].score;
        const gap = s0 != null && s1 != null ? Math.abs(s0 - s1) : null;
        text = `My two favourite moves here: first, ${a || got.lines[0].uci}; second, ${b || got.lines[1].uci}.` + (gap == null ? '' : gap < 25 ? ' There is almost nothing between them - pick the one you understand.' : gap < 90 ? ' The first is a little better, but the second is very playable.' : ' The first is clearly stronger.');
      } else text = deterministic();
      setChatMessages([...history, { role: 'chester', text: text.charAt(0).toUpperCase() + text.slice(1), kind: 'chat' }]); setChatBusy(false);
      return;
    }
    if (!geminiTierOn()) { // BUILD 165: deterministic analyzer is the default (0p); Gemini tier only when this flag is on AND credit exists
      window.setTimeout(() => { setChatMessages([...history, { role: 'chester', text: deterministic(), kind: 'chat' }]); setChatBusy(false); }, 250);
      return;
    }
    try {
      const lv = liveRef.current; const facts = { fen: lv.fen || lastFen, engineBestSan: lv.bestSan, lastMove: whyCard ? { san: whyCard.san, grade: whyCard.grade, cp: whyCard.cp, said: whyCard.whatHappenedLine, engine: whyCard.engineBlueprintLine } : null, recentMoves: moveTrail.slice(-6).map((m) => m.move) };
      const r = await fetch('/api/chester/commentary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat: { message }, facts }) });
      const j = (await r.json()) as { reply?: string; usage?: { input: number; output: number } };
      if (j.usage) { const w = window as unknown as { __chesterUsage?: { input: number; output: number; kind?: string }[] }; (w.__chesterUsage ||= []).push({ ...j.usage, kind: 'chat' }); }
      const text = j.reply && !isBanned(j.reply) ? j.reply : deterministic();
      setChatMessages([...history, { role: 'chester', text, kind: 'chat' }]);
    } catch {
      setChatMessages([...history, { role: 'chester', text: deterministic(), kind: 'chat' }]);
    } finally {
      setChatBusy(false);
    }
  };

  const retryMistake = () => {
    if (!report?.pgn || !report.gradeHistory.length) return;
    const myMoves = report.gradeHistory.filter((entry) => entry.player === 'You');
    if (!myMoves.length) return;
    const worstMove = myMoves.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b));
    const fen = fenBeforePly(report.pgn, worstMove.ply);
    if (!fen) return;
    setReport(null); setReportOpen(false);
    window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode, fen } }));
  };

  // Duel blitz clock: each client runs both clocks and flags itself; a flag relay tells the rival they won on time.
  const [clocks, setClocks] = useState({ w: clockSeconds, b: clockSeconds });
  const [flagResult, setFlagResult] = useState<'won' | 'lost' | null>(null);
  const [matchOver, setMatchOver] = useState(false);
  const turnColor: 'w' | 'b' = lastFen.split(' ')[1] === 'b' ? 'b' : 'w';
  useEffect(() => {
    const over = () => setMatchOver(true);
    const turn = (event: Event) => { const f = (event as CustomEvent<{ fen?: string }>).detail?.fen; if (f) setLastFen(f); };
    window.addEventListener('match-complete', over);
    window.addEventListener('duel-turn', turn);
    return () => { window.removeEventListener('match-complete', over); window.removeEventListener('duel-turn', turn); };
  }, []);
  useEffect(() => {
    if (mode !== 'PVP_REMOTE' || !clockSeconds || duelStatus !== 'connected' || !started || matchOver || flagResult) return;
    const timer = setInterval(() => { setClocks((c) => ({ ...c, [turnColor]: Math.max(0, c[turnColor] - 0.25) })); }, 250);
    return () => clearInterval(timer);
  }, [mode, clockSeconds, duelStatus, started, matchOver, flagResult, turnColor]);
  useEffect(() => {
    if (flagResult || !clockSeconds || !started || matchOver) return;
    if (clocks.w > 0 && clocks.b > 0) return;
    setMatchOver(true);
    const flagged = clocks.w <= 0 ? 'w' : 'b';
    if (flagged === requestedSeat) { setFlagResult('lost'); try { duelConnRef.current?.send({ type: 'flag' }); } catch {} }
    else setFlagResult('won');
  }, [clocks, clockSeconds, flagResult, started, matchOver, requestedSeat]);
  const fmtClock = (secs: number) => { const t = Math.max(0, Math.ceil(secs)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const rivalSeat: 'w' | 'b' = requestedSeat === 'w' ? 'b' : 'w';
  const clockBar = clockSeconds > 0 ? <div className="duel-clock-bar" aria-live="off">
    <span className={`duel-clock-chip ${turnColor === requestedSeat && !matchOver ? 'is-active' : ''} ${clocks[requestedSeat] <= 30 ? 'is-low' : ''}`}>YOU {fmtClock(clocks[requestedSeat])}</span>
    <span className={`duel-clock-chip ${turnColor !== requestedSeat && !matchOver ? 'is-active' : ''} ${clocks[rivalSeat] <= 30 ? 'is-low' : ''}`}>RIVAL {fmtClock(clocks[rivalSeat])}</span>
  </div> : null;
  const flagBanner = flagResult ? <div className={`duel-flag-banner ${flagResult === 'won' ? 'is-won' : 'is-lost'}`} role="status">{flagResult === 'won' ? '⚡ FLAG FALL - rival ran out of time. You win on the clock!' : '⏱ FLAG FALL - your clock hit zero. Rival wins on time.'}</div> : null;

  const torchReady = () => { const l = liveRef.current; return Boolean(l.fen && l.fen === liveFen && l.bestUci && l.fen.split(' ')[1] === 'w'); };
  const spendTorch = () => { if (!loot.torch || !torchReady()) { setBanter('🔦 Torch not ready - wait for your turn while Chester reads the position.'); return; } setLoot((l) => ({ ...l, torch: l.torch - 1 })); dismissHeroTip(); const uci = liveRef.current.bestUci!; setHintStage(3); setChipArrow({ from: uci.slice(0, 2), to: uci.slice(2, 4) }); };
  const spendShield = () => { if (!loot.shield) return; setLoot((l) => ({ ...l, shield: l.shield - 1 })); rewindAndRetry(); };
  const help = () => { if (isThinking) return; if (bossRef.current.on) { if (!bossCardsRef.current) return; bossCardsRef.current -= 1; setBossCards(bossCardsRef.current); } else { if (!helpRemaining) return; setHelpRemaining((n) => n - 1); } setIsThinking(true); window.dispatchEvent(new CustomEvent('chester-help-request')); };

  if (!started) return <main className="chester-start-screen">
    <section><span>{isFriendMode ? modeKicker : 'CHESS-TOWN ACADEMY'}</span><h1>{isFriendMode ? modeTitle : 'PLAY CHESTER'}</h1><p>{isFriendMode ? (mode === 'PVP_LOCAL' ? 'Two players, one device. Hand it over after each move - Chester commentates every blunder.' : 'Two versus two, one device. Chester keeps score and commentary.') : 'Pick your opponent. Chester coaches the first three decisions, then lets you fight.'}</p>
      {!isFriendMode && drill && <p className="chester-drill">🎯 TODAY'S DRILL: {drill.drill}{drill.hanging ? ` Last game: ${drill.hanging} loose piece${drill.hanging === 1 ? '' : 's'} left hanging.` : drill.missed ? ` Last game: ${drill.missed} winning tactic${drill.missed === 1 ? '' : 's'} missed.` : ''}</p>}
      {!isFriendMode && ladder.lastLevel && <p className="chester-remembers">🧠 CHESTER REMEMBERS: {ladder.lastGrade ? `${ladder.lastGrade} at ${LADDER_LABELS[ladder.lastLevel] || ladder.lastLevel}` : 'your last visit'}{ladder.lastResult ? ` (${ladder.lastResult})` : ''}{ladder.lastFocus ? ` - work on: ${ladder.lastFocus}` : ''}</p>}
      {introOpen && !started && (
        <div className="road-intro" role="dialog" aria-modal="true" aria-label="Chester">
          <div className={boss ? 'road-intro__card road-intro__card--boss' : 'road-intro__card'}>
            {boss && <div className="road-intro__boss" aria-label={`Boss fight: ${boss.name}`}>
              <div className="road-intro__boss-emoji" aria-hidden="true">{BOSS_FOCUS[roadLevel]?.emoji || '⚔️'}</div>
              <p className="road-intro__boss-name">BOSS FIGHT: {boss.name}</p>
              <p className="road-intro__boss-arch">{boss.archetype} · difficulty setting ~{eloForLevel(roadLevel)} · exam mode, 2 wild cards</p>
              <p className="road-intro__boss-focus">{BOSS_FOCUS[roadLevel]?.focus}</p>
            </div>}
            {!boss && roadActive && <div className="road-intro__boss">
              <p className="road-intro__boss-name">LEVEL {roadLevel}/{ROAD_MAX} · difficulty setting ~{eloForLevel(roadLevel)}</p>
              <p className="road-intro__boss-focus">{levelFocus(roadLevel)}</p>
            </div>}
            <div className="road-intro__avatar"><ChesterAvatar isThinking={false} size="large" /></div>
            {boss ? <p>This one actually plays. No power-ups on this board - just you, your two wild cards, and whatever you have learned. Do not waste my time.</p> : <p>&ldquo;You actually think you&rsquo;re ready for him? Fine. But don&rsquo;t expect me to hold your hand when the real players sit down at the board. Let&rsquo;s see if you can even survive the pawns.&rdquo;</p>}
            <button type="button" onClick={() => { setIntroOpen(false); playSfx('start'); setStarted(true); }}>PROVE IT.</button>
          </div>
        </div>
      )}
      {!isFriendMode && roadActive && (
        <div className="road-strip" aria-label={`Road to Joseph, level ${roadLevel} of ${ROAD_MAX}`}>
          <p className="road-strip__title">ROAD TO JOSEPH · LEVEL {roadLevel}/{ROAD_MAX}</p>
          {boss && <p className="road-strip__boss" aria-label={`Boss: ${boss.name}`}><span className="road-strip__boss-emoji" aria-hidden="true">{BOSS_FOCUS[roadLevel]?.emoji || '⚔️'}</span> <b>{boss.name}</b> is watching. No power-ups on this board.</p>}
          <ol>{Array.from({ length: ROAD_MAX }, (_, i) => i + 1).map((n) => <li key={n} className={`${n < roadLevel ? 'is-done' : ''} ${n === roadLevel ? 'is-now' : ''} ${isBossLevel(n) ? 'is-boss' : ''}`}>{isBossLevel(n) ? '★' : n}</li>)}</ol>
          <div className="road-gauge" aria-hidden="true"><i style={{ width: `${roadLevel >= ROAD_MAX ? 100 : (((eloForLevel(roadLevel) || 600) - 600) / 1800) * 100}%` }} /><span>600</span><span>2400+</span></div>
          <p className="road-strip__who">{roadLevel >= ROAD_MAX ? 'JOSEPH. Grandmaster strength, no limits. This is the top of the road.' : boss ? `BOSS FIGHT: ${boss.name} · ${boss.archetype}. Difficulty setting ~${eloForLevel(roadLevel)}. Two wild cards for hints or take-backs - spend them well. Exam mode.` : `Difficulty setting ~${eloForLevel(roadLevel)} this level. Next boss: ${(() => { const nb = [3, 6, 9, 12, 15].find((b) => b >= roadLevel); return nb ? bossFor(nb)?.name : ''; })()} (level ${[3, 6, 9, 12, 15].find((b) => b >= roadLevel)}).`}</p>
          {roadLevel < ROAD_MAX && <p className="road-strip__top">At the top waits <b>JOSEPH</b>: a grandmaster at full engine strength, the hardest opponent here. Each rung is a real step up.</p>}
        </div>
      )}
      {!isFriendMode && !requestedLevel && !roadActive && <a className="road-entry" href="/play-chester?road=1"><b>ROAD TO JOSEPH</b><small>15 levels · a boss every 3rd · your level is saved</small></a>}
      {!isFriendMode && requestedLevel && <p style={{ margin: '.2rem 0 .6rem', color: '#ffd84d', fontWeight: 900, letterSpacing: '1px' }}>OPPONENT: {selectedLevel.label} · {selectedLevel.note}</p>}
      {!isFriendMode && !requestedLevel && !roadActive && <div className="chester-level-grid">{LEVELS.map((level, index) => { const locked = index > ladder.unlocked; return <button key={level.value} className={`${difficulty === level.value ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`} disabled={locked} onClick={() => setDifficulty(level.value)}><b>{locked ? '🔒 ' : ''}{level.label}</b><small>{locked ? `Beat ${LEVELS[index - 1].label} to unlock` : level.note}</small>{!locked && (() => { const rec = ladder.levels?.[level.value]; const stars = Math.min(3, rec?.wins || 0); return rec?.games ? <i className="chester-level-stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}{rec.bestGrade ? ` · best ${rec.bestGrade}` : ''}</i> : null; })()}</button>; })}</div>}
      {!isFriendMode && !requestedLevel && !roadActive && <div className="bp-armory">
        <button className={`bp-toggle${bp.opening ? ' is-on' : ''}`} style={bp.opening ? { borderColor: bp.opening.color, color: bp.opening.color } : undefined} onClick={() => { if (bp.opening) bp.disarm(); else setArmoryOpen((v) => !v); }}>
          ⚔ GUIDED OPENING{bp.opening ? `: ${bp.opening.name} ✕` : armoryOpen ? ' ▲' : ' ▼'}
        </button>
        {armoryOpen && !bp.opening && <div className="bp-drawer">
          {ARMORY.map((o) => <button key={o.id} className="bp-card" style={{ borderColor: o.color }} onClick={() => { bp.arm(o.id); setArmoryOpen(false); }}>
            <small style={{ color: o.color }}>{o.tier}</small><b>{o.name}</b><span>{o.blurb}</span>
          </button>)}
        </div>}
      </div>}
      {mode === 'PVP_REMOTE' ? (
        <div style={{ margin: '.6rem 0', padding: '.7rem .9rem', border: '1px solid #ffd84d', borderRadius: 8, background: 'rgba(255,216,77,.08)' }}>
          <b style={{ color: '#ffd84d', letterSpacing: '1px' }}>{duelStatus === 'connected' ? 'FRIEND CONNECTED - FIGHT!' : duelStatus === 'failed' ? 'CONNECTION DROPPED - BOTH REOPEN THE LINK' : requestedSeat === 'w' ? `ROOM ${requestedRoom} - WAITING FOR YOUR FRIEND...` : `KNOCKING ON ROOM ${requestedRoom}...`}</b>
          <p style={{ margin: '.35rem 0 0', fontSize: '.72rem', color: '#c7d5da' }}>{requestedSeat === 'w' ? 'Share your link (without the host flag). The game starts the moment they join. You are White.' : 'Knocking on the room - if the host has not opened their side yet, we keep knocking until they do. You are Black.'}</p>
        </div>
      ) : <button className="chester-start-button" onClick={() => { playSfx('start'); setStarted(true); }}>{isFriendMode ? 'START FRIEND GAME' : 'START GUIDED GAME'} <i>→</i></button>}
    </section>
  </main>;

  if (warMode) return <PawnWarDuel playerColor={requestedSeat} clockBar={clockBar} flagBanner={flagBanner} onTurn={(f) => setLastFen(f)} onGameOver={() => setMatchOver(true)} />;

  const lesson = LESSONS[lessonStep];
  const material = splitMaterial(capturedPieces, 'w');
  const viewerSeat: 'w' | 'b' = mode === 'PVP_REMOTE' ? requestedSeat : 'w';
  const turnSide: 'you' | 'opp' = turnColor === viewerSeat ? 'you' : 'opp';
  // BUILD 94 tug-of-war: same winOddsPct + same evaluationAfter as the ODDS bullet, so
  // the bar and the ODDS line can never disagree. 50/50 until the first graded move.
  const tugPct = winOddsPct(coachPrompt?.kind === 'move' ? coachPrompt.evaluationAfter : null, viewerSeat, coachPrompt?.kind === 'move' ? coachPrompt.evaluationMateAfter : null) ?? 50;
  const gradeEmoji = coachPrompt?.kind === 'move' ? GRADE_EMOJI[(coachPrompt.classification || '').toUpperCase()] || '♟️' : null;
  const verdictStyle = coachPrompt?.kind === 'move' ? ({ '--verdict-color': getVerdict(coachPrompt.classification).color } as React.CSSProperties) : undefined;
  const moodEmoji = material.lead > 0 ? '🦄' : material.lead < 0 ? '🐴💦' : '🐴';
  const verdictKey = coachPrompt ? `${coachPrompt.move}-${coachPrompt.classification}-${isThinking ? 'think' : 'say'}` : `idle-${moodEmoji}`;
  const verdictEmoji = isThinking && coachPrompt ? '🐴💭' : coachPrompt?.kind === 'move' ? getVerdict(coachPrompt.classification).emoji : moodEmoji;
  const verdictKicker = isThinking ? 'CHESTER LIVE - READING THE BOARD…' : 'CHESTER LIVE';
  const verdictTitle = coachPrompt?.kind === 'help' ? 'Try this idea' : coachPrompt ? <>On {coachPrompt.movePhrase || coachPrompt.move} <i key={verdictKey} className="chester-verdict grade-pop">{coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}</i></> : lesson.title;
  const coachMovePrompt = coachPrompt?.kind === 'move' && !isThinking ? coachPrompt : null;
  const coachBullets = coachMovePrompt && !isBossFight ? buildCoachBullets({ fen: coachMovePrompt.fen, classification: coachMovePrompt.classification, movePhrase: coachMovePrompt.movePhrase, bestMovePhrase: coachMovePrompt.bestMovePhrase, captured: coachMovePrompt.captured, check: coachMovePrompt.check, mate: coachMovePrompt.mate, evalDelta: coachMovePrompt.evalDelta, evaluationAfter: coachMovePrompt.evaluationAfter, opponentName: isFriendMode ? 'your rival' : null, viewerColor: mode === 'PVP_REMOTE' ? requestedSeat : 'w', ply: coachMovePrompt.ply, move: coachMovePrompt.move, bestMove: coachMovePrompt.bestMove, fenBefore: coachMovePrompt.fenBefore, engineLine: coachMovePrompt.engineLine || null }) : null;
  // Chester's Breakdown: pivot = biggest single-move swing of the game.
  const pivot = breakdownPivotOf(report);
  const breakdownVisible = !!report && !reportOpen && victoryState === 'none' && !!pivot && !!report?.pgn;
  const pivotIdx = pivot ? pivot.ply - 1 : 0;
  const breakdownStep = (d: number) => {
    const cur = scrubIdx ?? pivotIdx;
    const total = scrubTotal || (report?.gradeHistory?.length ?? 1);
    const next = Math.max(0, Math.min(total - 1, cur + d));
    window.dispatchEvent(new CustomEvent('replay-step', { detail: { index: next } }));
  };
  return <main data-challenge={challenge && !challenge.done ? '1' : '0'} className={`chester-game${boss ? ` boss-${boss.name.toLowerCase().replace(/[^a-z]+/g, '-')}` : ''}`} aria-label="Play Chester guided game">
    {bossStrike > 0 && <div key={bossStrike} className="boss-strike" aria-hidden="true" />}
    {started && countdown > 0 && <MatchCountdown key={countdown} />}
    <header className="chester-hud">
      <button type="button" className="chester-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open match menu"><b>☰ MENU</b></button>
      <div className="chester-matchbar chester-matchbar--hud">
        <span className={`chester-matchbar__turn ${isThinking ? 'is-thinking' : ''}`}>{isThinking ? 'CHESTER…' : mode === 'PVP_REMOTE' ? (turnColor === requestedSeat ? 'YOUR MOVE' : 'RIVAL…') : mode === 'PVP_LOCAL' || mode === '2V2' ? (turnColor === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE') : turnColor === 'w' ? 'YOUR MOVE' : 'CHESTER…'}</span>
        {boss && started && <span className={`chester-matchbar__boss${freeze?.tone === 'red' ? ' is-mocking' : ''}`} aria-label={`Boss fight: ${boss.name}`}><span className="road-strip__boss-emoji road-strip__boss-emoji--walk" aria-hidden="true">{BOSS_FOCUS[roadLevel]?.emoji || '⚔️'}</span> BOSS</span>}
        <span className={`chester-matchbar__score ${material.lead > 0 ? 'is-ahead' : material.lead < 0 ? 'is-behind' : ''}`} key={`mb-${capturedPieces.length}`}>{material.lead > 0 ? `+${material.lead}` : material.lead < 0 ? `${material.lead}` : '±0'}</span>
      </div>
    </header>
    <section className="chester-game__board">
      {heroTipOpen && <div className="hero-tip" role="status">
        <span><Ico n="wave" /> <b>New here?</b> HINT shows you the best move. <Ico n="chat" /> CHESTER answers any chess question.</span>
        <button type="button" onClick={dismissHeroTip}>GOT IT</button>
      </div>}
      {clockBar}
      {flagBanner}
      <div className="hero-jail-row" aria-label="Captured pieces">
        <CaptureStrip pieces={material.youTook} tone="you" label={`${isFriendMode ? 'P1' : 'YOU'} TOOK`} />
        <CaptureStrip pieces={material.oppTook} tone="opp" label={`${isFriendMode ? 'P2' : 'CHESTER'} TOOK`} />
      </div>
      <HeroScoreboard material={material} youLabel={isFriendMode ? 'P1' : 'YOU'} oppLabel={isFriendMode ? 'P2' : (boss ? boss.name.toUpperCase() : 'CHESTER')} oppThinking={isThinking || calculating} turnSide={turnSide} tugPct={tugPct} lead={material.lead} />
      <LiveAccuracy extra={challenge ? <span className={`chester-challenge${challenge.done ? ' is-done' : ''}`} role="status"><b>{challenge.done ? '✓ CHALLENGE · +150' : `CHALLENGE: ${challenge.label}`}</b>{!challenge.done && <i>{challenge.n}/{challenge.target}</i>}</span> : undefined} rows={(['w', 'b'] as const).map((c) => { const a = accuracy[c]; return { label: c === 'w' ? (isFriendMode ? 'P1' : 'YOU') : (isFriendMode ? 'P2' : (boss ? 'BOSS' : 'CHESTER')), side: c === 'w' ? 'you' as const : 'opp' as const, pct: a.n === 0 ? 100 : Math.max(1, Math.min(100, Math.round(103.16 * Math.exp(-0.0435 * (a.loss / a.n))) - 0.8)) }; })} />
      {isJosephFight && started && <div className="joseph-gauge" aria-label={`Joseph pressure ${Math.round(josephPressure)} percent`}><i style={{ height: `${josephPressure}%` }} /><span>JOSEPH<br/>PRESSURE</span></div>}
      <div className={`chester-board-frame ${shake ? 'chester-board-frame--shake' : ''} ${coachPrompt?.mate ? 'is-mate' : coachPrompt?.check ? 'is-check' : ''}`}><DojoEngine mode={mode} playerColor={mode === 'PVP_REMOTE' ? requestedSeat : null} difficulty={difficulty} rookieTeaching={difficulty === 'BEGINNER' && !isFriendMode} domJails />
        {bp.line && bp.opening && <div className="bp-line" style={{ borderColor: bp.opening.color }}>
          <small style={{ color: bp.line.kind === 'abort' ? '#f59e0b' : bp.opening.color }}>{bp.line.kind === 'abort' ? '⚠ BLUEPRINT ABORTED' : bp.line.kind === 'handoff' ? '★ BLUEPRINT COMPLETE' : `BLUEPRINT · ${bp.opening.name.toUpperCase()} · ${Math.min(bp.line.step + 1, bp.line.total)}/${bp.line.total}`}</small>
          <TypeLine text={bp.line.text} />
        </div>}
        {victoryState !== 'none' && (() => {
          const finalWin = roadLevel >= ROAD_MAX;
          const bossName = bossFor(roadLevel)?.name || 'THE BOSS';
          const rw = rushActive && rushMsg?.kind === 'win' ? rushMsg : null;
          const title = rw ? (rw.complete ? 'BOSS RUSH COMPLETE.' : `${bossName.toUpperCase()} DOWN.`) : finalWin ? 'JOSEPH DETHRONED.' : victoryState === 'boss_defeated' ? `${bossName.toUpperCase()} DETHRONED.` : `LEVEL ${roadLevel} CLEARED.`;
          const sub = rw ? (rw.complete ? '🏆 Trophy won for this week. All three bosses, back to back.' : `${rw.step} of ${RUSH_LEVELS.length} down. Next: ${bossFor(RUSH_LEVELS[rw.step])?.name || 'the next boss'}. One loss resets the run.`) : finalWin ? 'You beat the Final Mastermind. The Road to Joseph is complete.' : victoryState === 'boss_defeated' ? 'Joseph felt that. Keep climbing.' : 'The ladder gets steeper.';
          return (
            <div className={`road-victory road-victory--${victoryState}`} role="dialog" aria-live="polite">
              <h2>{title}</h2>
              <p style={{ maxWidth: '100%', overflowWrap: 'anywhere', padding: '0 8px', boxSizing: 'border-box' }}>{sub}</p>
              {skinUnlocked && <p className="road-victory__skin">🏆 SKIN UNLOCKED: {skinUnlocked} — wear it from ☰ MENU → BOARD SKIN.</p>}
              <button type="button" className="road-victory__next" onClick={handleNextLevel}>{rw ? (rw.complete ? 'SEE MY TROPHY' : 'NEXT BOSS') : finalWin ? 'CLIMB AGAIN' : 'NEXT RUNG'}</button>
              <a href="/road/chess" className="road-victory__next" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', margin: '8px auto 0', boxSizing: 'border-box', width: 'min(100%, 240px)' }}>BACK TO THE MAP</a>
            </div>
          );
        })()}
        {rushActive && rushMsg?.kind === 'loss' && victoryState === 'none' && <div className="road-victory road-victory--cleared" role="dialog" aria-live="polite" style={{ position: 'fixed', left: 12, right: 12, bottom: 24, top: 'auto', width: 'auto', zIndex: 99999, boxSizing: 'border-box', background: 'linear-gradient(180deg,#2a0f1d,#14080f)', border: '2px solid #f43f5e', borderRadius: 16, padding: '16px 14px' }}>
          <h2>RUSH RESET.</h2>
          <p>That boss won this round, so the run starts again from the first boss. Quick tip: check what you leave undefended before each move.</p>
          <a href="/boss-rush" className="road-victory__next" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', margin: '8px auto 0', boxSizing: 'border-box', width: 'min(100%, 260px)' }}>TRY THE RUSH AGAIN</a>
        </div>}
        {freeze?.tone === 'red' && freeze.best && <FreezeSpotlight from={freeze.best.from} to={freeze.best.to} />}
        {powerups.length > 0 && <PowerupOverlay items={powerups} />}
        <ArrowOverlay kingSq={posState.kingSq} mate={!!mateNow} arrows={[...(arrowsOn && whyCard ? whyCard.boardOverlayArrows : []), ...(chipArrow ? [{ ...chipArrow, intent: 'ENGINE_BEST' as const }] : [])]} rings={[...(arrowsOn && whyCard ? whyCard.highlightedSquares.filter((q) => q.type === 'HANGING_PIECE').map((q) => q.square) : []), ...(hintStage === 1 && hintInfo?.hintSquare ? [hintInfo.hintSquare] : [])]} />
        {inCheckSide && !mateNow && <div className="chester-check-banner" role="status">⚠️ CHECK!</div>}
        {mateNow && <div className={`chester-mate-ribbon chester-mate-ribbon--${mateNow.you ? 'win' : 'loss'}`} role="status">{mateNow.you ? '⚔️ CHECKMATE - YOU WIN!' : '🛡️ CHECKMATE - CHESTER WINS!'}</div>}
        {mateStage === 2 && mateNow && <div className="chester-turning" role="dialog" aria-label="Match debrief">
          <b>{mateNow.you ? '🏆 WELL PLAYED' : 'CRITICAL TURNING POINT'}</b>
          {mateNow.you ? <p>{cardsRef.current.filter((c) => c.grade === 'BRILLIANT' || c.grade === 'STRONG').length} engine-grade moves. Chester wants a rematch.</p>
            : turning ? <p>Move {turning.moveNo}: {turning.san} cost {(turning.cp! / 100).toFixed(1)} pawns. {turning.engineBlueprintLine.replace(/^🤖\s*/, '')}</p> : <p>No single big mistake. It was a slow squeeze: take the engine-grade move more often.</p>}
          <div className="chester-hud-actions">
            {!mateNow.you && turning && <button type="button" className="chester-pill chester-pill--primary" onClick={() => { setMateStage(0); window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode, fen: turning.fenBefore } })); }}>🔄 Replay from turning point</button>}
            <button type="button" className="chester-pill" onClick={() => setMateStage(0)}>Close</button>
          </div>
        </div>}
        {!freeze && banter && <div className="chester-banter" aria-live="polite"><b>{boss ? boss.name.toUpperCase() : 'CHESTER'}</b> {banter}</div>}
        {(coachPrompt?.check || coachPrompt?.mate) && <div className="chester-board-frame__drama" key={`${coachPrompt.move}-${coachPrompt.mate ? 'mate' : 'check'}`} aria-hidden="true" />}
        <div className={`material-score-badge ${material.lead > 0 ? 'is-ahead' : material.lead < 0 ? 'is-behind' : ''}`} key={capturedPieces.length} aria-hidden="true">{material.lead > 0 ? `+${material.lead}` : material.lead < 0 ? material.lead : '±0'}</div>
      </div>
      <div className={`chester-teleprompter chester-teleprompter--tappable${whyCard && !isThinking && !calculating ? ` chester-hud chester-hud--${whyCard.grade.toLowerCase()}` : ' chester-hud chester-hud--idle'}`} key={whyCard ? `hud-${whyCard.ply}-${whyCard.grade}` : 'hud-idle'} role="button" tabIndex={0} aria-label="Chester commentary - tap to read full history" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; if (whyCard) setWhyModal(whyCard); else setCommOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter') setCommOpen(true); }}>
        <div className="chester-teleprompter__head">
          <i className="chester-teleprompter__beacon" aria-hidden="true" />
          <span>CHESTER SAYS</span><span className="chester-teleprompter__expand" aria-hidden="true">⤢ TAP TO READ</span>
          {coachPrompt && coachPrompt.kind === 'move' && <QAFlagButton key={`qa-${coachPrompt.ply}-${coachPrompt.move}`} build={() => {
            const shown = (teleRef.current?.innerText || '').trim();
            const llm = teleprompterLlm && coachPrompt && teleprompterLlm.key === `${coachPrompt.ply}-${coachPrompt.move}` ? teleprompterLlm.text : null;
            const usage = llm ? chesterUsageByReply.get(llm) : undefined;
            return { match_id: qaMatchId.current, move_number: coachPrompt.ply ?? null, current_fen: coachPrompt.fen, stockfish_cpl: coachPrompt.evalDelta == null ? null : Math.round(Math.abs(coachPrompt.evalDelta)), tactic_flagged: `${coachPrompt.classification || 'ungraded'} - ${coachPrompt.movePhrase || coachPrompt.move || ''}${llm ? '' : ' (local template, no Gemini call)'}`, gemini_output: shown, model: GEMINI_MODEL, usageMetadata: usage ? { promptTokenCount: usage.input, candidatesTokenCount: usage.output } : null };
          }} />}
        </div>
        <div className="chester-teleprompter__body" ref={teleRef} aria-live="polite">
          {(isThinking || calculating) && !(whyFresh && whyCard && !isThinking)
            ? <p className="chester-teleprompter__calculating">{deepThought ? 'CHESTER IS DEEP IN THOUGHT' : 'CHESTER IS CALCULATING'}<span className="chester-teleprompter__cursor">▮</span></p>
            : whyCard
            ? <div className="chester-why" key={`${whyCard.ply}-${whyCard.san}`}>
                <div className="chester-why__head"><span className="chester-why__san">{whyCard.moveNo}. {whyCard.san}</span><span className="chester-why__grade">{gradeIcon(whyCard.grade)} {whyCard.grade}{whyCard.cp != null && whyCard.grade !== 'STRONG' && whyCard.grade !== 'BRILLIANT' ? ` (-${(whyCard.cp / 100).toFixed(1)})` : ''}</span><b className="chester-why__headline">{whyCard.headlineBadge}</b></div>
                <p className="chester-why__row">{whyCard.whatHappenedLine}</p>
                <p className="chester-why__row chester-why__row--eng">{whyCard.engineBlueprintLine}</p>
                {!isFriendMode && <button type="button" className="chester-chat-nudge" onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}>{whyCard.grade === 'BLUNDER' || whyCard.grade === 'SHAKY' ? '💬 Not sure why? Ask Chester to explain' : '💬 Want more? Ask Chester about this move'}</button>}
              </div>
            : <p className="chester-teleprompter__prose" key={verdictKey}>{coachPrompt && coachReply ? coachReply : lesson.body || 'Make a move. I will grade it here, in plain English, with the exact squares.'}</p>}
          {hintStage > 0 && <p className="chester-why__hint" aria-live="polite">💡 HINT {hintStage}/3 - {hintFor(hintInfo, hintStage as 1 | 2 | 3)}</p>}
        </div>
        <div className="chester-hud-actions" role="group" aria-label="Chester actions">
          {freeze?.tone === 'red' && <><button type="button" className="chester-pill chester-pill--primary" onClick={rewindAndRetry}>⏪ Retry move</button><button type="button" className="chester-pill" onClick={acceptConsequences}>Accept</button></>}
          {freeze?.tone === 'green' && <button type="button" className="chester-pill chester-pill--primary" onClick={releaseFreeze}>Continue ▸</button>}
          {whyCard && whyCard.boardOverlayArrows.length > 0 && <button type="button" className="chester-pill" onClick={() => setArrowsOn((v) => !v)}>👁️ {arrowsOn ? 'Hide line' : 'Show line'}</button>}
          {whyCard && <button type="button" className="chester-pill" onClick={() => setWhyModal(whyCard)}>🔎 Read</button>}
          {whyCard && <button type="button" className="chester-pill" onClick={() => { setChatOpen(true); void sendChat({ preventDefault() {} } as unknown as React.FormEvent, `Why was my last move graded ${whyCard.grade.toLowerCase()}?`); }}>💬 Ask why</button>}
        </div>
      </div>

      <div className="chester-bottom">
      <div className="chester-stack">
      <div className={`chester-console ${freeze ? 'chester-console--hidden' : ''}`} style={verdictStyle}>
        <div className="chester-console__grade">
          <div className={`chester-console__badge ${gradeEmoji ? 'chester-console__badge--grade' : ''}`} key={verdictKey} aria-hidden="true">{reaction || gradeEmoji || verdictEmoji}</div>
          <div className="chester-console__verdict">
            <span>{isThinking ? 'READING THE BOARD…' : coachPrompt ? `LAST MOVE · ${coachPrompt.movePhrase || coachPrompt.move}` : lessonStep < 2 ? `LESSON ${lessonStep + 1}/3` : 'MATCH COACH LIVE'}</span>
            <b>{coachPrompt?.kind === 'help' ? 'Try this idea' : coachPrompt ? <i key={verdictKey} className="chester-verdict grade-pop">{coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}</i> : lesson.title}{coachBullets && coachPrompt?.kind === 'move' && <button type="button" className="chester-why-button chester-why-button--ghost" onClick={(e) => { e.stopPropagation(); setWhyOpen(true); }}><Ico n="book" /> WHY?</button>}</b>
          </div>
        </div>
        <div className="chester-console__lifelines">
          <button type="button" className="chester-console__pill chester-console__pill--hint" onClick={() => { dismissHeroTip(); const next = (hintStage < 3 ? hintStage + 1 : 3) as 1 | 2 | 3; if (next === 3 && hintStage !== 3) { if (isBossFight) { if (!bossCards) return; bossCardsRef.current = bossCards - 1; setBossCards(bossCards - 1); } else { if (!helpRemaining) return; setHelpRemaining((n) => n - 1); } setChipArrow(liveRef.current.bestUci ? { from: liveRef.current.bestUci.slice(0, 2), to: liveRef.current.bestUci.slice(2, 4) } : null); } setHintStage(next); }} disabled={hintStage === 2 && (isBossFight ? !bossCards : !helpRemaining)} title={undefined} aria-label={`Hint from Chester, ${isBossFight ? bossCards : helpRemaining} left`}><b>? HINT{hintStage > 0 ? ` ${hintStage}/3` : ''}</b><small>{isBossFight ? bossCards : helpRemaining} LEFT</small></button>
          {loot.torch > 0 && <button type="button" className="chester-console__pill chester-console__pill--loot" onClick={spendTorch} disabled={!torchReady()} aria-label="Use torch power-up for the full engine answer"><b>🔦 TORCH</b><small>{loot.torch} LEFT</small></button>}
          {loot.shield > 0 && <button type="button" className="chester-console__pill chester-console__pill--loot" onClick={spendShield} aria-label="Use shield power-up for a free take-back"><b>🛡️ SHIELD</b><small>{loot.shield} LEFT</small></button>}
          <button type="button" className="chester-console__pill chester-console__pill--chat" onClick={() => { dismissHeroTip(); setChatOpen(true); }} aria-label="Chat with Chester"><b><Ico n="chat" /> CHAT</b><small>CHESTER</small></button>
          <div className="chester-taunts" role="group" aria-label="Taunt Chester">
            {['😏', '😤', '🤯', '💪'].map((t) => <button key={t} type="button" className="chester-taunt" onClick={() => sendTaunt(t)} aria-label={`Taunt Chester with ${t}`}>{t}</button>)}
          </div>
        </div>
      </div>
      </div>
      </div>
      
    </section>
    {whyModal && (() => { const wm = whyCard && whyCard.ply === whyModal.ply && whyCard.san === whyModal.san ? whyCard : whyModal; return (
      <div className="chester-why-modal" role="dialog" aria-modal="true" aria-label="Chester explains the last move">
        <div className="chester-why-modal__backdrop" onClick={() => setWhyModal(null)} />
        <section className="chester-why-modal__content">
          <header><b>{gradeIcon(wm.grade)} {wm.moveNo}. {wm.san} · {wm.grade}</b><button type="button" onClick={() => setWhyModal(null)} aria-label="Close">×</button></header>
          <b className="chester-why-modal__headline">{wm.headlineBadge}</b>
          <p>{wm.whatHappenedLine}</p>
          <p>{wm.engineBlueprintLine}</p>
          <div className="chester-why-modal__actions">
            <button type="button" className="chester-pill" onClick={() => { setWhyModal(null); setCommOpen(true); }}>📜 History</button>
            <button type="button" className="chester-pill" onClick={() => { setWhyModal(null); setChatOpen(true); void sendChat({ preventDefault() {} } as unknown as React.FormEvent, `Why was my last move graded ${wm.grade.toLowerCase()}?`); }}>💬 Ask why</button>
            <button type="button" className="chester-pill chester-pill--primary" onClick={() => setWhyModal(null)}>Got it</button>
          </div>
        </section>
      </div>
    ); })()}
    {commOpen && <div className="chester-comm-modal" role="dialog" aria-modal="true" aria-label="Chester commentary this game" onClick={() => setCommOpen(false)}>
      <div className="chester-comm-modal__card" onClick={(e) => e.stopPropagation()}>
        <header><b>CHESTER SAYS · THIS GAME</b><button type="button" onClick={() => setCommOpen(false)} aria-label="Close">×</button></header>
        <div className="chester-comm-modal__log">
          {cardsRef.current.length ? cardsRef.current.map((c, i) => <div key={`${c.ply}-${i}`} className={`chester-why chester-why--${c.grade.toLowerCase()} ${i === cardsRef.current.length - 1 ? 'is-latest' : ''}`}>
            <div className="chester-why__head"><span className="chester-why__san">{c.moveNo}. {c.san}</span><span className="chester-why__grade">{gradeIcon(c.grade)} {c.grade}{c.cp != null && c.grade !== 'STRONG' && c.grade !== 'BRILLIANT' ? ` (-${(c.cp / 100).toFixed(1)})` : ''}</span><b className="chester-why__headline">{c.headlineBadge}</b></div>
            <p className="chester-why__row">{c.whatHappenedLine}</p>
            <p className="chester-why__row chester-why__row--eng">{c.engineBlueprintLine}</p>
          </div>) : <p>Make a move and Chester starts talking.</p>}
        </div>
      </div>
    </div>}
    <aside className="chester-game__coach chester-game__coach--route">
      <span>TONIGHT’S TRAINING ROUTE</span><h2>LEARN WHILE YOU PLAY</h2><p>Chester’s notes arrive beside the live board. No pop-ups, no dismissing, no break in the game.</p>
      <ol>{LESSONS.map((item, index) => <li key={item.title} className={index === lessonStep ? 'is-active' : index < lessonStep ? 'is-done' : ''}><i>{index < lessonStep ? '✓' : index + 1}</i><span>{item.title}</span></li>)}</ol>
    </aside>
    {chatOpen && <div className="chester-chatsheet" role="dialog" aria-label="Chat with Chester">
      <header><b>CHAT WITH CHESTER</b><button type="button" onClick={() => setChatOpen(false)} aria-label="Close">×</button></header>
      <div className="chester-chatsheet__msgs" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
        {chatMessages.length === 0 && <p className="chester-chatsheet__hint">Ask about your last move, a threat, or what to play. Tap a move I mention to see it on the board.</p>}
        {chatMessages.map((m, i) => <div key={i} className={`chester-chatsheet__msg chester-chatsheet__msg--${m.role === 'user' ? 'you' : 'chester'}`}>{m.role === 'user' ? m.text : <MoveChipText text={m.text} onChip={(san) => { try { const c = new Chess(liveRef.current.fen || lastFen); const mv = (c.moves({ verbose: true }) as { san: string; from: string; to: string }[]).find((x) => x.san.replace(/[+#]/g, '') === san.replace(/[+#]/g, '')); if (mv) setChipArrow({ from: mv.from, to: mv.to }); } catch { /* ignore */ } }} />}</div>)}
        {chatBusy && <div className="chester-chatsheet__msg chester-chatsheet__msg--chester">…</div>}
      </div>
      <div className="chester-chatsheet__quicklabel">QUICK QUESTIONS</div><div className="chester-chatsheet__chips">{(whyCard ? whyCard.contextualChatChips : ['What should my next move be?', 'Compare my top 2 candidate moves', 'Are any of my pieces undefended right now?', "What is Chester's plan here?"]).map((q) => <button key={q} type="button" className="chester-chat-chip" onClick={(e) => { void sendChat(e as unknown as React.FormEvent, q); }}>{q}</button>)}</div>
      <form className="chester-chatsheet__form" onSubmit={(e) => { void sendChat(e); }}><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message Chester..." aria-label="Message Chester" /><button type="submit" disabled={chatBusy}>Send</button></form>
    </div>}
    {hintOpen && <div className="chess-game-sheet" role="dialog" aria-modal="true" aria-label="Hint from Chester">
      <div className="chess-game-sheet__backdrop" onClick={() => setHintOpen(false)} />
      <section className="chess-game-sheet__content chester-line-sheet">
        <header><b>💡 CHESTER / HINT · {helpRemaining} LEFT</b><button type="button" onClick={() => setHintOpen(false)} aria-label="Close">×</button></header>
        <div className="chester-line-sheet__body" onClick={() => setHintOpen(false)}>
          <b>{coachPrompt?.kind === 'help' && isThinking ? 'Reading the board…' : 'Try this idea'}</b>
          <p>{coachPrompt?.kind === 'help' && isThinking ? 'I’m checking the danger and your strongest next idea. Keep your eyes on the board.' : (coachPrompt?.kind === 'help' && coachReply ? coachReply : (lastHintReply || 'Tap the ? for a hint and Chester’s idea will wait for you here.'))}</p>
        </div>
      </section>
    </div>}
    {menuOpen && <div className="chester-navdrawer-wrap" role="dialog" aria-modal="true" aria-label="Match menu">
      <div className="chester-navdrawer-wrap__backdrop" onClick={() => { setMenuOpen(false); setResignArmed(false); }} />
      <aside className="chester-navdrawer">
        <header><b>☰ MATCH CONTROL</b><button type="button" onClick={() => { setMenuOpen(false); setResignArmed(false); }} aria-label="Close">×</button></header>
        {!isFriendMode && <div className="chester-navdrawer__tier">
          <span>YOUR LADDER</span>
          <ul>{LEVELS.map((level, index) => { const locked = index > ladder.unlocked; const rec = ladder.levels?.[level.value]; const stars = Math.min(3, rec?.wins || 0); return <li key={level.value} className={`${level.value === difficulty ? 'is-current' : ''} ${locked ? 'is-locked' : ''}`}><b>{locked ? '🔒 ' : level.value === difficulty ? '▶ ' : ''}{level.label}</b><small>{locked ? `beat ${LEVELS[index - 1].label}` : `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${rec?.bestGrade ? ` · best ${rec.bestGrade}` : ''}`}</small></li>; })}</ul>
        </div>}
        <div className="chester-navdrawer__toggles">
          <button type="button" onClick={() => { const next = !muted; setMuted(next); setMutedState(next); if (!next) playSfx('select'); }}><b>{muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON'}</b><small>tap to {muted ? 'unmute' : 'mute'}</small></button>
          <button type="button" onClick={() => { const next = !haptics; setHaptics(next); setHapticsState(next); if (next) buzz(18); }}><b>{haptics ? '📳 HAPTICS: ON' : '📴 HAPTICS: OFF'}</b><small>tap to {haptics ? 'disable' : 'enable'}</small></button>
          <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('toggle-board-theme')); window.setTimeout(() => { try { setSkinNow(localStorage.getItem('ct-board-theme') || 'NEON'); } catch { /* */ } }, 150); }}><b>🎨 BOARD SKIN: {skinNow}</b><small>beat road bosses to unlock more</small></button>
        </div>
        <div className="chester-navdrawer__actions">
          {resignArmed
            ? <button type="button" className="is-confirm" onClick={() => { setMenuOpen(false); setResignArmed(false); window.dispatchEvent(new CustomEvent('request-resign')); }}><b>⚠ CONFIRM RESIGN?</b><small>ends the match, shows your report</small></button>
            : <button type="button" onClick={() => setResignArmed(true)}><b>🏳 RESIGN MATCH</b><small>asks again before it fires</small></button>}
          {!isFriendMode && <button type="button" onClick={() => { setMenuOpen(false); setResignArmed(false); setStarted(false); }}><b>🎓 CHANGE LEVEL</b><small>back to the level select</small></button>}
          <Link href="/" className="chester-navdrawer__link" onClick={() => setMenuOpen(false)}><b>🏠 BACK TO HUB</b><small>leave the board for Chesterville</small></Link>
        </div>
      </aside>
    </div>}
    {whyOpen && coachPrompt && <div className="chess-game-sheet" role="dialog" aria-modal="true" aria-label="Why this verdict">
      <div className="chess-game-sheet__backdrop" onClick={() => setWhyOpen(false)} />
      <section className="chess-game-sheet__content">
        <header><b>WHY {coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}?</b><button type="button" onClick={() => setWhyOpen(false)} aria-label="Close">×</button></header>
        <div className="chester-why-body" style={{ padding: '1rem 1.1rem', color: '#e8f6ff', lineHeight: 1.6, fontSize: '0.95rem' }}>
          {(() => { const why = buildWhyLesson({ fen: coachPrompt.fen, classification: coachPrompt.classification, movePhrase: coachPrompt.movePhrase, bestMovePhrase: coachPrompt.bestMovePhrase, captured: coachPrompt.captured, check: coachPrompt.check, mate: coachPrompt.mate, evalDelta: coachPrompt.evalDelta, ply: coachPrompt.ply, move: coachPrompt.move, bestMove: coachPrompt.bestMove, fenBefore: coachPrompt.fenBefore, engineLine: coachPrompt.engineLine || null, sacrificePiece: coachPrompt.sacrificePiece || null, principleKey: coachPrompt.principleKey || null, principleFollowed: coachPrompt.principleFollowed ?? null, provisional: coachPrompt.provisional || null, exchangeLost: coachPrompt.exchangeLost || null, exchangeWon: coachPrompt.exchangeWon || null, exchangeNet: coachPrompt.exchangeNet ?? null }); return <>
            {why.patternName && <p style={{ margin: '0 0 0.8rem' }}><span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(255,216,77,.5)', color: '#ffd84d', fontSize: '0.72rem', letterSpacing: '0.12em', fontWeight: 700 }}>PATTERN: {why.patternName}</span></p>}
            <p style={{ margin: '0 0 0.8rem' }}><b style={{ color: getVerdict(coachPrompt.classification).color }}>WHY {coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}:</b> {why.gradeLine}</p>
            <p style={{ margin: '0 0 0.8rem' }}><b style={{ color: '#ffd84d' }}>{why.considerHeading}:</b> {why.considerLine}</p>
            <p style={{ margin: 0, opacity: 0.72, fontSize: '0.85rem' }}><b style={{ color: '#c084fc' }}>THE {why.phase} RULE:</b> {why.phaseTip}</p>
          </>; })()}
        </div>
      </section>
    </div>}
    {report && millCount > 0 && <Link href="/puzzle-mill" className="puzzle-mill-pill">🏭 {millCount} of your slips banked in the PUZZLE MILL - fix them →</Link>}
    {report && reportOpen && victoryState === 'none' && <ChesterReportCard grades={report.gradeHistory} review={review} scouting={scouting} isLoading={reviewLoading} pgn={report.pgn} difficulty={difficulty} summary={{ grade: report.grade, score: report.score, accuracy: report.accuracy, development: report.development, kingSafety: report.kingSafety, tactics: report.tactics, habits: report.habits }} onClose={() => setReportOpen(false)} onRetry={isFriendMode ? null : retryMistake} />}
    {breakdownVisible && pivot && (
      <div className="breakdown" role="dialog" aria-label="Chester's breakdown">
        <header><b>CHESTER'S BREAKDOWN</b><button type="button" aria-label="Close breakdown" onClick={() => setReport(null)}>×</button></header>
        <p className="breakdown__pivot">PIVOT · MOVE {Math.ceil(pivot.ply / 2)}{pivot.ply % 2 === 1 ? '.' : '…'} <b>{pivot.move}</b> - the move that swung it ({(pivot.centipawnLoss ?? 0) >= 90000 ? 'mate on the board' : `${((pivot.centipawnLoss ?? 0) / 100).toFixed(1)} pawns`}).</p>
        <p className="breakdown__vs">YOU SAW <b>{pivot.move}</b> · I FEARED <b>{feared ?? 'calculating…'}</b></p>
        <div className="breakdown__scrub">
          <button type="button" onClick={() => breakdownStep(-1)} aria-label="Previous move">‹</button>
          <span>{(scrubIdx ?? pivotIdx) + 1}/{scrubTotal || '…'}{scrubMove ? ` · ${scrubMove}` : ''}</span>
          <button type="button" onClick={() => breakdownStep(1)} aria-label="Next move">›</button>
          {(scrubIdx ?? pivotIdx) !== pivotIdx && <button type="button" className="breakdown__jump" onClick={() => window.dispatchEvent(new CustomEvent('replay-step', { detail: { index: pivotIdx } }))}>PIVOT</button>}
          <button type="button" className="breakdown__report" onClick={() => setReportOpen(true)}>REPORT</button>
        </div>
      </div>
    )}
  </main>;
}

// Inline icons: an emoji font is not guaranteed (headless Chrome, some Android builds show boxes), SVG always renders.
// Small canvas confetti burst (no dependency). Runs ~1.8s then removes itself.
function burstConfetti() {
  try {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9500';
    c.width = window.innerWidth; c.height = window.innerHeight; document.body.appendChild(c);
    const g = c.getContext('2d'); if (!g) { c.remove(); return; }
    const colors = ['#ffd84d', '#22d3ee', '#ff4eb1', '#4ade80', '#ffffff'];
    const parts = Array.from({ length: 110 }, () => ({ x: c.width / 2, y: c.height * 0.45, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 3, s: 4 + Math.random() * 6, col: colors[Math.floor(Math.random() * colors.length)], r: Math.random() * 6 }));
    const t0 = performance.now();
    const tick = (t: number) => {
      const age = t - t0; g.clearRect(0, 0, c.width, c.height);
      parts.forEach((p) => { p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.r += 0.2; g.save(); g.globalAlpha = Math.max(0, 1 - age / 1800); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); g.restore(); });
      if (age < 1800) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  } catch { /* effects are a bonus */ }
}

function Ico({ n }: { n: 'wave' | 'chat' | 'chart' | 'book' }) {
  const d = { wave: 'M7 11V5a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-5a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L7 14', chat: 'M4 5h16v11H9l-5 4z', chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm2 14h13' }[n];
  return <svg className="chester-ico" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

// Batch 177 (stage 2 RPG): board power-up markers, same square geometry as FreezeSpotlight.
function PowerupOverlay({ items }: { items: { sq: string; kind: 'torch' | 'shield' }[] }) {
  const ctr = (sq: string) => { const c = sq.charCodeAt(0) - 97; const r = 8 - Number(sq[1]); return [30 + c * 92 + 46, 30 + r * 92 + 46] as const; };
  if (!items.length) return null;
  return <svg className="chester-arrows chester-powerups" viewBox="0 0 796 796" aria-hidden="true">
    {items.map((p) => { const [x, y] = ctr(p.sq); return <g key={p.sq} data-square={p.sq} className="chester-powerup"><circle className="chester-powerup__ring" cx={x} cy={y} r={40} /><text className="chester-powerup__glyph" x={x} y={y + 16} textAnchor="middle" fontSize={48}>{p.kind === 'torch' ? '🔦' : '🛡️'}</text></g>; })}
  </svg>;
}

// BUILD 128: Red Freeze spotlight. Everything on the board is dimmed except the two squares of the best move.
// The Phaser board is 796 units wide (8 x 92 squares + a 30 unit margin), so the cut-outs sit at fixed percentages.
function FreezeSpotlight({ from, to }: { from: string; to: string }) {
  const cell = (sq: string) => { const c = sq.charCodeAt(0) - 97; const r = 8 - Number(sq[1]); return [30 + c * 92, 30 + r * 92] as const; };
  const hole = (sq: string) => { const [x, y] = cell(sq); return `M${x} ${y}h92v92h-92Z`; };
  return <svg className="chester-spotlight" viewBox="0 0 796 796" role="img" aria-label={`Best move: ${from} to ${to}`}>
    <path className="chester-spotlight__dim" fillRule="evenodd" d={`M0 0h796v796H0Z ${hole(from)} ${hole(to)}`} />
    {[from, to].map((sq) => { const [x, y] = cell(sq); return <rect key={sq} x={x + 3} y={y + 3} width={86} height={86} rx={8} className="chester-spotlight__ring" fill="none" />; })}
  </svg>;
}

// BUILD 165: Gemini tier is ON only for Vercel PREVIEW hosts (hostname contains "-git-") and never in production; any failure keeps the deterministic card.
function geminiTierOn(): boolean { try { return typeof location !== 'undefined' && /-git-/.test(location.hostname) && localStorage.getItem('ct-no-gemini') !== '1'; } catch { return false; } }

function MoveChipText({ text, onChip }: { text: string; onChip: (san: string) => void }) {
  const parts = text.split(/(\bO-O(?:-O)?[+#]?|\b[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g);
  return <>{parts.map((p, i) => (i % 2 === 1 && /[a-h][1-8]|O-O/.test(p) && (p.length >= 3 || /^[a-h][1-8]$/.test(p) === false) && /^(O-O|[KQRBN]|[a-h]x)/.test(p) ? <button key={i} type="button" className="chester-movechip" onClick={() => onChip(p)}>{p}</button> : p))}</>;
}

function ArrowOverlay({ arrows, rings, kingSq, mate }: { arrows: { from: string; to: string; intent: 'ENGINE_BEST' | 'OPPONENT_THREAT' | 'PLAYER_MISTAKE' }[]; rings: string[]; kingSq: string; mate: boolean }) {
  const ctr = (sq: string) => { const c = sq.charCodeAt(0) - 97; const r = 8 - Number(sq[1]); return [30 + c * 92 + 46, 30 + r * 92 + 46] as const; };
  if (!arrows.length && !rings.length && !kingSq) return null;
  return <svg className="chester-arrows" viewBox="0 0 796 796" aria-hidden="true">
    <defs>
      <marker id="ca-cyan" markerWidth="6" markerHeight="6" refX="4.2" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#22d3ee" /></marker>
      <marker id="ca-red" markerWidth="6" markerHeight="6" refX="4.2" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#f43f5e" /></marker>
    </defs>
    {kingSq && (() => { const [x, y] = ctr(kingSq); return <g><rect className="chester-king-aura" x={x - 46} y={y - 46} width={92} height={92} rx={10} /><text x={x} y={y + 14} textAnchor="middle" fontSize="44">{mate ? '👑' : ''}</text></g>; })()}
    {rings.map((sq) => { const [x, y] = ctr(sq); return <circle key={sq} className="chester-ring" cx={x} cy={y} r={44} />; })}
    {arrows.map((a, i) => { const [x1, y1] = ctr(a.from); const [x2, y2] = ctr(a.to); const cyan = a.intent === 'ENGINE_BEST'; return <line key={i} className={cyan ? 'chester-arrow chester-arrow--cyan' : 'chester-arrow chester-arrow--red'} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={`url(#${cyan ? 'ca-cyan' : 'ca-red'})`} />; })}
  </svg>;
}

export default function PlayChesterPage() { return <Suspense fallback={<main className="chester-start-screen" />}><BlueprintProvider><PlayChesterGame /></BlueprintProvider></Suspense>; }
