'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PEER_CONFIG } from '@/lib/p2p';
import { askChesterChat } from '@/app/actions';
import { CaptureStrip, HeroScoreboard, splitMaterial, type CapturedPiece } from '@/components/CapturedPieceJails';
import { buildGameRecord, recordGameToFile } from '@/lib/player-file';
import { recordMillMistake, loadMill } from '@/lib/puzzle-mill';
import ChesterReportCard, { type GradedMove } from '@/components/ChesterReportCard';
import MatchCountdown from '@/components/MatchCountdown';
import { buildStoryRecap, getVerdict, personaCoaching, chesterOfflineChat, PERSONA_DESC, buildWhyLesson, buildCoachBullets, winOddsPct } from '@/lib/chester-voice';
import { isMuted, setMuted, playSfx, isHaptics, setHaptics, buzz } from '@/lib/sounds';
import PawnWarDuel from '@/components/PawnWarDuel';
import { getLadder, recordLadderGame, weakestHabit, LADDER_LABELS, type LadderState } from '@/lib/rating';
import { phrasesFromPgn, fenBeforePly, explainEngineChoice } from '@/lib/move-words';
import { awardPoints, completeBossNode, DIFFICULTY_POINTS } from '@/lib/rating';
import { ChesterChatOverlay } from '@/components/ChesterUI';
import { loadPlayerFile, analyse } from '@/lib/player-file';
import { Chess } from 'chess.js';
import { direct, postGamePrompt, parsePostGame, localScouting } from '@/lib/chester-director';

const DojoEngine = dynamic(() => import('@/components/DojoEngine'), { ssr: false });
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type GameReport = { gradeHistory: GradedMove[]; pgn?: string; grade?: string; score?: number; accuracy?: number; development?: number; kingSafety?: number; tactics?: number; openingName?: string | null; moves?: number; turningPoint?: string; habits?: { castled?: boolean; developed?: boolean; blunders?: number } };
type CoachPrompt = { kind: 'move' | 'help' | 'howler'; move?: string; movePhrase?: string | null; bestMovePhrase?: string | null; fen: string; fenBefore?: string | null; bestMove?: string | null; continuation?: string[]; engineLine?: string[] | null; sacrificePiece?: string | null; evaluation?: number | string | null; classification?: string | null; evalDelta?: number | null; evaluationBefore?: number | null; evaluationAfter?: number | null; captured?: string | null; check?: boolean; mate?: boolean; ply?: number; provisional?: boolean; principleKey?: string | null; principleFollowed?: boolean | null; exchangeLost?: string | null; exchangeWon?: string | null; exchangeNet?: number | null };
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

function PlayChesterGame() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const requestedLevel = searchParams.get('level');
  const bossNode = searchParams.get('boss');
  const requestedRoom = (searchParams.get('room') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const requestedSeat: 'w' | 'b' = searchParams.get('host') === '1' ? 'w' : 'b';
  const warMode = requestedMode === 'duel' && searchParams.get('war') === '1';
  const clockSeconds = Math.min(3600, Math.max(0, parseInt(searchParams.get('clock') || '0', 10) || 0));
  const mode = requestedMode === '1v1' ? 'PVP_LOCAL' : requestedMode === '2v2' ? '2V2' : requestedMode === 'duel' ? 'PVP_REMOTE' : requestedMode || 'COACH_OPENING';
  const [countdown, setCountdown] = useState(0);
  const coachPromptRef = useRef<CoachPrompt | null>(null);
  const [ladder, setLadder] = useState<LadderState>({ unlocked: 0, grandChester: false, lastLevel: null, lastResult: null, lastGrade: null, lastFocus: null, lastWeakness: null, updatedAt: null });
  useEffect(() => { setLadder(getLadder()); }, []);
  const [difficulty, setDifficulty] = useState<Difficulty>(requestedLevel === 'INTERMEDIATE' || requestedLevel === 'ADVANCED' || requestedLevel === 'EXPERT' ? requestedLevel : 'BEGINNER');
  const [capturedPieces, setCapturedPieces] = useState<CapturedPiece[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [deepThought, setDeepThought] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState<CoachPrompt | null>(null);
  const [muted, setMutedState] = useState(false);
  const [haptics, setHapticsState] = useState(true);
  const [resignArmed, setResignArmed] = useState(false);
  const teleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setHapticsState(isHaptics()); }, []);
  useEffect(() => { const onCalc = (e: Event) => { const d = (e as CustomEvent).detail; setCalculating(!!d?.on); setDeepThought(!!d?.on && !!d?.deep); }; window.addEventListener('chester-calculating', onCalc); return () => window.removeEventListener('chester-calculating', onCalc); }, []);
  useEffect(() => { const el = teleRef.current; if (el) el.scrollTop = freeze ? 0 : el.scrollHeight; });
  useEffect(() => { setMutedState(isMuted()); }, []);
  const [coachReply, setCoachReply] = useState('');
  const [teleprompterLlm, setTeleprompterLlm] = useState<{ key: string; text: string } | null>(null);
  const [helpRemaining, setHelpRemaining] = useState(3);
  const [report, setReport] = useState<GameReport | null>(null);
  const [millCount, setMillCount] = useState(0);
  useEffect(() => { setMillCount(loadMill().length); }, []);
  const [review, setReview] = useState('');
  const [scouting, setScouting] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [freeze, setFreeze] = useState<{ tone: 'green' | 'red'; text: string; banter: string; best: { from: string; to: string } | null } | null>(null);
  const [banter, setBanter] = useState('');
  const releaseFreeze = () => { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = false; setFreeze(null); };
  // BUILD 128 fork: ACCEPT = Chester replies at once; REWIND = take back the move (1 ply) and try again.
  const acceptConsequences = () => { (window as unknown as { __ctFastReply?: boolean }).__ctFastReply = true; releaseFreeze(); };
  const rewindAndRetry = () => { window.dispatchEvent(new CustomEvent('chester-rewind')); setFreeze(null); setCoachPrompt(null); setMoveTrail((t) => t.slice(0, -1)); setBanter(''); };
  const [reviewLoading, setReviewLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [lessonStep, setLessonStep] = useState(0);
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [chatOpen, setChatOpen] = useState(false);
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

  useEffect(() => { if (started) setCountdown((n) => n + 1); }, [started]);

  useEffect(() => {
    if (!started) return;
    setHelpRemaining(difficulty === 'BEGINNER' ? 5 : 3); setCoachPrompt(null);
    const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode } })), 0);
    const capture = (event: Event) => setCapturedPieces((current) => [...current, (event as CustomEvent<CapturedPiece>).detail]);
    const gameReport = (event: Event) => {
      const detail = (event as CustomEvent<GameReport>).detail;
      setReport(detail);
      if (!isFriendMode) {
        const result = /1-0\s*$/.test(detail.pgn || '') ? 'win' : /0-1\s*$/.test(detail.pgn || '') ? 'loss' : 'draw';
        const myMoves = detail.gradeHistory.filter((entry) => entry.player === 'You');
        try { recordGameToFile(buildGameRecord({ level: difficulty, result, pgn: detail.pgn || '', gradeHistory: detail.gradeHistory })); } catch { /* learning is a bonus, never break the report */ }
        const habit = weakestHabit(detail, myMoves.filter((entry) => entry.grade === 'F').length);
        setLadder(recordLadderGame({ level: difficulty, result, grade: detail.grade, focus: habit.focus, weakness: habit.key }));
      }
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
    const coach = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; if (!isFriendMode && detail.kind === 'move') { const d = direct({ moveSan: detail.move, bestSan: bestSanOf(detail.fenBefore, detail.bestMove), classification: detail.classification, evalDelta: detail.evalDelta, evaluationBefore: detail.evaluationBefore, evaluationAfter: detail.evaluationAfter, playerColor: 'w', movePhrase: detail.movePhrase, bestMovePhrase: detail.bestMovePhrase, captured: detail.captured, check: detail.check, mate: detail.mate, sacrificePiece: detail.sacrificePiece, principleKey: detail.principleKey, principleFollowed: detail.principleFollowed, ply: detail.ply }); if (d.ui_action === 'freeze_green' || d.ui_action === 'freeze_red') { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = true; setFreeze({ tone: d.ui_action === 'freeze_green' ? 'green' : 'red', text: d.freeze_explanation, banter: d.chester_immediate_chat, best: d.ui_action === 'freeze_red' ? bestSquares(detail.fenBefore, detail.bestMove) : null }); setBanter(''); } else { setBanter(d.chester_immediate_chat); if (d.ui_action === 'shake') { setShake(true); window.setTimeout(() => setShake(false), 700); } } } if (!isFriendMode && recordMillMistake({ fenBefore: detail.fenBefore, bestMove: detail.bestMove, move: detail.move, classification: detail.classification, evalDelta: detail.evalDelta, bestMovePhrase: detail.bestMovePhrase, provisional: detail.provisional })) setMillCount(loadMill().length); setCoachPrompt({ ...detail, kind: 'move' }); setLessonStep((step) => Math.min(2, step + 1)); if (detail.fen) setLastFen(detail.fen); if (detail.move) setMoveTrail((t) => [...t.slice(-14), { move: detail.move!, classification: detail.classification }]); if (detail.bestMove) setLastBest(detail.bestMove); if (detail.bestMovePhrase) setLastBestPhrase(detail.bestMovePhrase); if (detail.movePhrase) setLastMovePhrase(detail.movePhrase); };
    const help = (event: Event) => { const detail = (event as CustomEvent<CoachPrompt>).detail; setCoachPrompt({ ...detail, kind: 'help' }); if (detail.fen) setLastFen(detail.fen); if (detail.bestMove) setLastBest(detail.bestMove); if (detail.bestMovePhrase) setLastBestPhrase(detail.bestMovePhrase); };
    const resetJails = () => setCapturedPieces([]);
    const restored = (event: Event) => { const r = (event as CustomEvent<CapturedPiece>).detail; setCapturedPieces((pieces) => { const i = pieces.findLastIndex((p) => p.color === r.color && p.type === r.type); return i < 0 ? pieces : pieces.filter((_, k) => k !== i); }); };
    window.addEventListener('piece-restored', restored);
    window.addEventListener('load-puzzle', resetJails);
    window.addEventListener('piece-captured', capture); window.addEventListener('game-report', gameReport); window.addEventListener('chester-coaching-pause', coach); window.addEventListener('chester-help-response', help);
    return () => { window.clearTimeout(timer); window.removeEventListener('load-puzzle', resetJails); window.removeEventListener('piece-restored', restored); window.removeEventListener('piece-captured', capture); window.removeEventListener('game-report', gameReport); window.removeEventListener('chester-coaching-pause', coach); window.removeEventListener('chester-help-response', help); };
  }, [mode, started]);

  useEffect(() => { coachPromptRef.current = coachPrompt; }, [coachPrompt]);
  useEffect(() => { if (!freeze || freeze.tone === 'red') return; const t = window.setTimeout(releaseFreeze, 9000); return () => window.clearTimeout(t); }, [freeze]);
  useEffect(() => { if (!banter) return; const t = window.setTimeout(() => setBanter(''), 4500); return () => window.clearTimeout(t); }, [banter]);
  useEffect(() => () => { (window as unknown as { __ctFreeze?: boolean }).__ctFreeze = false; }, []);

  useEffect(() => {
    if (coachPrompt?.kind === 'help' && !isThinking && coachReply) setLastHintReply(coachReply);
  }, [coachPrompt, isThinking, coachReply]);

  useEffect(() => {
    if (!coachPrompt) return;
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
    const file = loadPlayerFile();
    setScouting(localScouting(file));
    const a = analyse(file);
    const playerLine = a.games ? `${a.games} games, ${a.wins} wins, ${a.perGame.toFixed(1)} big slips a game. ${a.headline}` : 'first game on record';
    void askChesterChat(JSON.stringify({ type: 'post-game-report', gradeHistory: report.gradeHistory.map((g) => ({ player: g.player, move: g.move, grade: g.grade, phrase: phraseMap.get(g.ply) || undefined })), persona: PERSONA_DESC[difficulty], instruction: postGamePrompt(topSwings, playerLine) }))
      .then((reply) => { const parsed = parsePostGame(reply); if (parsed) { setReview(parsed.debrief); setScouting(parsed.bullets); } else if (reply && !/messenger|delayed|unavailable|\{/.test(reply)) setReview(reply); })
      .catch(() => undefined);
  }, [report, difficulty]);

  const sendChat = async (event: React.FormEvent, preset?: string) => {
    event.preventDefault();
    const message = (preset || chatInput).trim();
    if (!message || chatBusy) return;
    setChatInput(''); setChatError('');
    const history = [...chatMessages, { role: 'user' as const, text: message }];
    setChatMessages(history);
    setChatBusy(true);
    const lastMove = moveTrail[moveTrail.length - 1];
    const fallback = () => chesterOfflineChat(message, { persona: difficulty, fen: lastFen, lastMove: lastMove?.move, lastMovePhrase, classification: lastMove?.classification, bestMove: lastBest, bestMovePhrase: lastBestPhrase, capturedCount: capturedPieces.length, historyCount: history.length });
    const context = `You are Chester, ${PERSONA_DESC[difficulty]}. You are chatting mid-game with your student. Live board FEN: ${lastFen}. Moves so far: ${moveTrail.map((m) => m.move).join(' ') || 'none yet'}. Last graded student move: ${lastMove ? `${lastMove.move} (${lastMove.classification || 'ungraded'})` : 'none'}. Engine-preferred idea: ${lastBest || 'unknown'}. Answer the student directly in at most 3 sentences. Be funny AND educational: every joke carries a chess lesson, every lesson lands a joke. Use only the FEN and record above for board facts - never invent pieces, squares, or lines. Plain English, no centipawns, no engine jargon.`;
    try {
      const reply = await askChesterChat(JSON.stringify({ type: 'chat', message, context, conversationHistory: history.slice(-8).map((m) => ({ role: m.role, text: m.text })) }));
      const text = reply && !/messenger|delayed|unavailable/i.test(reply) ? reply : fallback();
      setChatMessages([...history, { role: 'chester', text, kind: 'chat' }]);
    } catch {
      setChatMessages([...history, { role: 'chester', text: fallback(), kind: 'chat' }]);
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
    setReport(null);
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

  const help = () => { if (!helpRemaining || isThinking) return; setHelpRemaining((n) => n - 1); setIsThinking(true); window.dispatchEvent(new CustomEvent('chester-help-request')); };

  if (!started) return <main className="chester-start-screen">
    <section><span>{isFriendMode ? modeKicker : 'CHESS-TOWN ACADEMY'}</span><h1>{isFriendMode ? modeTitle : 'PLAY CHESTER'}</h1><p>{isFriendMode ? (mode === 'PVP_LOCAL' ? 'Two players, one device. Hand it over after each move - Chester commentates every blunder.' : 'Two versus two, one device. Chester keeps score and commentary.') : 'Pick your opponent. Chester coaches the first three decisions, then lets you fight.'}</p>
      {!isFriendMode && ladder.lastLevel && <p className="chester-remembers">🧠 CHESTER REMEMBERS: {ladder.lastGrade ? `${ladder.lastGrade} at ${LADDER_LABELS[ladder.lastLevel] || ladder.lastLevel}` : 'your last visit'}{ladder.lastResult ? ` (${ladder.lastResult})` : ''}{ladder.lastFocus ? ` - work on: ${ladder.lastFocus}` : ''}</p>}
      {!isFriendMode && requestedLevel && <p style={{ margin: '.2rem 0 .6rem', color: '#ffd84d', fontWeight: 900, letterSpacing: '1px' }}>OPPONENT: {selectedLevel.label} · {selectedLevel.note}</p>}
      {!isFriendMode && !requestedLevel && <div className="chester-level-grid">{LEVELS.map((level, index) => { const locked = index > ladder.unlocked; return <button key={level.value} className={`${difficulty === level.value ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`} disabled={locked} onClick={() => setDifficulty(level.value)}><b>{locked ? '🔒 ' : ''}{level.label}</b><small>{locked ? `Beat ${LEVELS[index - 1].label} to unlock` : level.note}</small>{!locked && (() => { const rec = ladder.levels?.[level.value]; const stars = Math.min(3, rec?.wins || 0); return rec?.games ? <i className="chester-level-stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}{rec.bestGrade ? ` · best ${rec.bestGrade}` : ''}</i> : null; })()}</button>; })}</div>}
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
  const tugPct = winOddsPct(coachPrompt?.kind === 'move' ? coachPrompt.evaluationAfter : null, viewerSeat) ?? 50;
  const gradeEmoji = coachPrompt?.kind === 'move' ? GRADE_EMOJI[(coachPrompt.classification || '').toUpperCase()] || '♟️' : null;
  const verdictStyle = coachPrompt?.kind === 'move' ? ({ '--verdict-color': getVerdict(coachPrompt.classification).color } as React.CSSProperties) : undefined;
  const moodEmoji = material.lead > 0 ? '🦄' : material.lead < 0 ? '🐴💦' : '🐴';
  const verdictKey = coachPrompt ? `${coachPrompt.move}-${coachPrompt.classification}-${isThinking ? 'think' : 'say'}` : `idle-${moodEmoji}`;
  const verdictEmoji = isThinking && coachPrompt ? '🐴💭' : coachPrompt?.kind === 'move' ? getVerdict(coachPrompt.classification).emoji : moodEmoji;
  const verdictKicker = isThinking ? 'CHESTER LIVE - READING THE BOARD…' : 'CHESTER LIVE';
  const verdictTitle = coachPrompt?.kind === 'help' ? 'Try this idea' : coachPrompt ? <>On {coachPrompt.movePhrase || coachPrompt.move} <i key={verdictKey} className="chester-verdict grade-pop">{coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}</i></> : lesson.title;
  const coachMovePrompt = coachPrompt?.kind === 'move' && !isThinking ? coachPrompt : null;
  const coachBullets = coachMovePrompt ? buildCoachBullets({ fen: coachMovePrompt.fen, classification: coachMovePrompt.classification, movePhrase: coachMovePrompt.movePhrase, bestMovePhrase: coachMovePrompt.bestMovePhrase, captured: coachMovePrompt.captured, check: coachMovePrompt.check, mate: coachMovePrompt.mate, evalDelta: coachMovePrompt.evalDelta, evaluationAfter: coachMovePrompt.evaluationAfter, opponentName: isFriendMode ? 'your rival' : null, viewerColor: mode === 'PVP_REMOTE' ? requestedSeat : 'w', ply: coachMovePrompt.ply, move: coachMovePrompt.move, bestMove: coachMovePrompt.bestMove, fenBefore: coachMovePrompt.fenBefore, engineLine: coachMovePrompt.engineLine || null }) : null;
  return <main className="chester-game" aria-label="Play Chester guided game">
    {started && countdown > 0 && <MatchCountdown key={countdown} />}
    <header className="chester-hud">
      <button type="button" className="chester-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open match menu"><b>☰ MENU</b><span className="chester-menu-btn__pill">MATCH</span></button>
      <div className="chester-matchbar chester-matchbar--hud">
        <span className={`chester-matchbar__turn ${isThinking ? 'is-thinking' : ''}`}>{isThinking ? 'CHESTER…' : mode === 'PVP_REMOTE' ? (turnColor === requestedSeat ? 'YOUR MOVE' : 'RIVAL…') : mode === 'PVP_LOCAL' || mode === '2V2' ? (turnColor === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE') : turnColor === 'w' ? 'YOUR MOVE' : 'CHESTER…'}</span>
        <span className={`chester-matchbar__score ${material.lead > 0 ? 'is-ahead' : material.lead < 0 ? 'is-behind' : ''}`} key={`mb-${capturedPieces.length}`}>{material.lead > 0 ? `+${material.lead}` : material.lead < 0 ? `${material.lead}` : '±0'}</span>
      </div>
    </header>
    <section className="chester-game__board">
      {heroTipOpen && <div className="hero-tip" role="status">
        <span>👋 <b>New here?</b> ? HINT shows you the best move. 💬 CHESTER answers any chess question.</span>
        <button type="button" onClick={dismissHeroTip}>GOT IT</button>
      </div>}
      {coachBullets?.odds && !heroTipOpen && <div className="chester-oddsline" key={`odds-${verdictKey}`}><b>📊 ODDS</b><span>{coachBullets.odds}</span></div>}
      {clockBar}
      {flagBanner}
      <HeroScoreboard material={material} youLabel={isFriendMode ? 'P1' : 'YOU'} oppLabel={isFriendMode ? 'P2' : 'CHESTER'} oppThinking={isThinking || calculating} turnSide={turnSide} tugPct={tugPct} />
      <div className={`chester-board-frame ${shake ? 'chester-board-frame--shake' : ''} ${coachPrompt?.mate ? 'is-mate' : coachPrompt?.check ? 'is-check' : ''}`}><DojoEngine mode={mode} playerColor={mode === 'PVP_REMOTE' ? requestedSeat : null} difficulty={difficulty} rookieTeaching={difficulty === 'BEGINNER' && !isFriendMode} domJails />
        {freeze?.tone === 'red' && freeze.best && <FreezeSpotlight from={freeze.best.from} to={freeze.best.to} />}
        {!freeze && banter && <div className="chester-banter" aria-live="polite"><b>CHESTER</b> {banter}</div>}
        {(coachPrompt?.check || coachPrompt?.mate) && <div className="chester-board-frame__drama" key={`${coachPrompt.move}-${coachPrompt.mate ? 'mate' : 'check'}`} aria-hidden="true" />}
        <div className={`material-score-badge ${material.lead > 0 ? 'is-ahead' : material.lead < 0 ? 'is-behind' : ''}`} key={capturedPieces.length} aria-hidden="true">{material.lead > 0 ? `+${material.lead}` : material.lead < 0 ? material.lead : '±0'}</div>
      </div>
      <div className="hero-jail-row" aria-label="Captured pieces">
        <CaptureStrip pieces={material.youTook} tone="you" label={`${isFriendMode ? 'P1' : 'YOU'} TOOK`} />
        <CaptureStrip pieces={material.oppTook} tone="opp" label={`${isFriendMode ? 'P2' : 'CHESTER'} TOOK`} />
      </div>

      <div className="chester-bottom">
      <div className="chester-stack">
      <div className="chester-console" style={verdictStyle}>
        <div className="chester-console__grade">
          <div className={`chester-console__badge ${gradeEmoji ? 'chester-console__badge--grade' : ''}`} key={verdictKey} aria-hidden="true">{gradeEmoji || verdictEmoji}</div>
          <div className="chester-console__verdict">
            <span>{isThinking ? 'READING THE BOARD…' : coachPrompt ? `LAST MOVE · ${coachPrompt.movePhrase || coachPrompt.move}` : lessonStep < 2 ? `LESSON ${lessonStep + 1}/3` : 'MATCH COACH LIVE'}</span>
            <b>{coachPrompt?.kind === 'help' ? 'Try this idea' : coachPrompt ? <i key={verdictKey} className="chester-verdict grade-pop">{coachPrompt.provisional ? 'FIRST TAKE' : getVerdict(coachPrompt.classification).word}</i> : lesson.title}{coachBullets && coachPrompt?.kind === 'move' && <button type="button" className="chester-why-button chester-why-button--ghost" onClick={(e) => { e.stopPropagation(); setWhyOpen(true); }}>📖 WHY?</button>}</b>
          </div>
        </div>
        <div className="chester-console__lifelines">
          <button type="button" className="chester-console__pill chester-console__pill--hint" onClick={() => { dismissHeroTip(); if (!helpRemaining || isThinking) return; help(); setHintOpen(true); }} disabled={!helpRemaining || isThinking} aria-label={`Hint from Chester, ${helpRemaining} left`}><b>? HINT</b><small>{helpRemaining} LEFT</small></button>
          <button type="button" className="chester-console__pill chester-console__pill--chat" onClick={() => { dismissHeroTip(); setChatOpen(true); }} aria-label="Chat with Chester"><b>💬 CHAT</b><small>CHESTER</small></button>
        </div>
      </div>
      <div className="chester-teleprompter">
        <div className="chester-teleprompter__head">
          <i className="chester-teleprompter__beacon" aria-hidden="true" />
          <span>CHESTER SAYS</span>
        </div>
        <div className="chester-teleprompter__body" ref={teleRef} aria-live="polite">
          {freeze
            ? <div className={`chester-freezebox chester-freezebox--${freeze.tone}`} role="alertdialog" aria-label={freeze.tone === 'green' ? 'Brilliant move' : 'Costly move'}>
                <b>{freeze.tone === 'green' ? 'FROZEN - NICE ONE' : 'FROZEN - HOLD ON'}</b>
                <p>{freeze.text}</p>
                <em>{freeze.banter}</em>
                <div className="chester-freezebox__actions">
                  {freeze.tone === 'red'
                    ? <><button type="button" className="chester-freezebox__primary" onClick={rewindAndRetry}>REWIND &amp; RETRY</button><button type="button" className="chester-freezebox__ghost" onClick={acceptConsequences}>ACCEPT CONSEQUENCES</button></>
                    : <button type="button" className="chester-freezebox__primary" onClick={releaseFreeze}>CONTINUE</button>}
                </div>
              </div>
            : isThinking || calculating
            ? <p className="chester-teleprompter__calculating">{deepThought ? 'CHESTER IS DEEP IN THOUGHT' : 'CHESTER IS CALCULATING'}<span className="chester-teleprompter__cursor">▮</span></p>
            : <p className="chester-teleprompter__prose" key={verdictKey}>{coachBullets ? (teleprompterLlm && coachPrompt && teleprompterLlm.key === `${coachPrompt.ply}-${coachPrompt.move}` ? teleprompterLlm.text : [coachBullets.reaction, coachBullets.why, !coachBullets.gradeGood ? coachBullets.risk : null].filter(Boolean).join(' ')) : coachPrompt ? coachReply : lesson.body}</p>}
        </div>
      </div>
      </div>
      </div>
      
    </section>
    <aside className="chester-game__coach chester-game__coach--route">
      <span>TONIGHT’S TRAINING ROUTE</span><h2>LEARN WHILE YOU PLAY</h2><p>Chester’s notes arrive beside the live board. No pop-ups, no dismissing, no break in the game.</p>
      <ol>{LESSONS.map((item, index) => <li key={item.title} className={index === lessonStep ? 'is-active' : index < lessonStep ? 'is-done' : ''}><i>{index < lessonStep ? '✓' : index + 1}</i><span>{item.title}</span></li>)}</ol>
    </aside>
    {chatOpen && <div className="chess-game-sheet" role="dialog" aria-modal="true" aria-label="Chat with Chester">
      <div className="chess-game-sheet__backdrop" onClick={() => setChatOpen(false)} />
      <section className="chess-game-sheet__content">
        <header><b>CHAT WITH CHESTER</b><button type="button" onClick={() => setChatOpen(false)} aria-label="Close">×</button></header>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.6rem 0.75rem 0', flexWrap: 'wrap' }}>
          {['What could I have done better?', 'Why was my move shaky?', 'What should I play now?', 'Teach me a tactic'].map((q) => <button key={q} type="button" className="chester-chat-chip" onClick={(e) => { void sendChat(e as unknown as React.FormEvent, q); }}>{q}</button>)}
        </div>
        <ChesterChatOverlay chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} onSendMessage={sendChat} isThinking={chatBusy} chatError={chatError} isMobile defaultExpanded />
      </section>
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
    {report && <ChesterReportCard grades={report.gradeHistory} review={review} scouting={scouting} isLoading={reviewLoading} pgn={report.pgn} difficulty={difficulty} summary={{ grade: report.grade, score: report.score, accuracy: report.accuracy, development: report.development, kingSafety: report.kingSafety, tactics: report.tactics, habits: report.habits }} onClose={() => setReport(null)} onRetry={isFriendMode ? null : retryMistake} />}
  </main>;
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

export default function PlayChesterPage() { return <Suspense fallback={<main className="chester-start-screen" />}><PlayChesterGame /></Suspense>; }
