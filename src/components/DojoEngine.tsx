// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Chess } from 'chess.js';
import { describeMove } from '@/lib/move-words';
import { applyMaterialReality,  detectOpeningPrinciple, detectPlannedExchange, detectTraps, type OpeningPrinciple, type PlannedExchange } from '@/lib/coaching-core';
import { disposeStockfishClient, getStockfishClient } from '@/lib/stockfish';
import { checkChaosTriggers } from '@/lib/ChaosEngine';
import { useBrawlState } from '@/components/EngineEvaluationProvider';

import { drawPieceSprite } from '@/lib/piece-sprites';

const PIECE_GLYPHS: Record<string, Record<string, string>> = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const DEMO_SEQUENCES: Record<string, string[]> = {
  SIMULATION: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
  '2V2': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6'],
};

const BOARD_THEMES = {
  NEON: [0xfffaf0, 0xecd9b0],
  RETRO: [0xe8d9b5, 0x4a3728],
} as const;

const AI_TAGS: Record<string, { player: string; rival: string; title: string }> = {
  SIMULATION: { player: 'Neill', rival: 'Brendan 🦸‍♂️', title: 'Neill vs. Brendan 🦸‍♂️' },
  '2V2': { player: 'Neill + Brendan', rival: 'Gabe + Z-Man', title: 'Heroes vs. Villains Tag Match' },
  COACH_OPENING: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Own the Center' },
  COACH_PRACTICE_OPENING: { player: 'You', rival: 'Chester', title: 'Chester Assessment: Practice Your Opening' },
  COACH_DAILY: { player: 'You', rival: 'Chester', title: 'Daily Challenge: Find the Breakthrough' },
  COACH_DEVELOPMENT: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Activate the Backline' },
  COACH_PRESSURE: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Tactical Pressure' },
  COACH_KING_SAFETY: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Castle Before Chaos' },
  COACH_ENDGAME: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Convert the Advantage' },
  COACH_KNIGHTMARE: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: The Knightmare' },
  COACH_INVISIBLE: { player: 'You', rival: 'Chester', title: 'Chester Mini Game: Phantom Threat' },
  PVP_LOCAL: { player: 'Challenger', rival: 'Defender', title: 'Local Challenge: Face to Face' },
  PVP_REMOTE: { player: 'White Challenger', rival: 'Black Challenger', title: 'Live Challenge: White vs. Black' },
};

const COACHING_POSITIONS: Record<string, { fen: string; briefing: string }> = {
  COACH_OPENING: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    briefing: 'Training objective: claim the center with a pawn, then develop your knights and bishops before moving the same piece twice.',
  },
  COACH_PRACTICE_OPENING: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    briefing: 'Play your first five opening moves. Chester will assess central control, minor-piece development, king safety, tempo, and early queen activity, then award an A-F grade.',
  },
  COACH_DAILY: {
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
    briefing: 'Daily mission: find an active move that creates a concrete threat while keeping your king safe. Chester grades the move and records your daily score.',
  },
  COACH_DEVELOPMENT: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    briefing: 'Training objective: complete development. Find a move that activates a back-rank piece while preparing king safety.',
  },
  COACH_PRESSURE: {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w kq - 4 6',
    briefing: 'Training objective: build pressure without rushing. Improve a piece, target a weakness, and make Chester answer your threat.',
  },
  COACH_KING_SAFETY: {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
    briefing: 'Training objective: your pieces are active, but your king is still in the middle. Prioritize king safety before Chester creates a tactical emergency.',
  },
  COACH_ENDGAME: {
    fen: '8/5pk1/3p2p1/3Pp3/2P1P3/1P3K2/6PP/8 w - - 0 35',
    briefing: 'Training objective: convert the endgame. Activate your king, create a passed pawn, and calculate before every pawn push.',
  },
  COACH_KNIGHTMARE: {
    fen: 'nnbnkbn1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    briefing: 'Training objective: Survive the Knightmare. Chester has no Queen, but he has an overwhelming swarm of four aggressive Knights. Defend your king and do not let him fork your pieces!',
  },
  COACH_INVISIBLE: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    briefing: 'Training objective: play against Chester, but 5 of his pieces (Queen, Rooks, Knights) are completely invisible to you. Survive if you can.',
  },
};

const FLAVOR_LINES = [
  'central mastery and tempo theft',
  'a calculated gambit that nobody saw coming',
  'the kind of move that swings the entire narrative',
  'pure tactical pressure and league dominance',
  'a swagger move that just rewrote the standings',
  'calculated brilliance wrapped in confidence',
  'the board is screaming and so is the arena',
];

const OPENING_LINES = [
  { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { name: 'French Defense', moves: ['e4', 'e6'] },
  { name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { name: 'English Opening', moves: ['c4'] },
  { name: 'Trompowsky Attack', moves: ['d4', 'Nf6', 'Bg5'] },
  { name: 'Halloween Gambit', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Nxe5'] },
  { name: 'King\'s Pawn Game: Bongcloud Attack', moves: ['e4', 'e5', 'Ke2'] },
];

function getOpeningName(chess: any) {
  const history = chess.history().map((move: string) => move.replace(/[+#?!]/g, ''));
  const match = OPENING_LINES
    .filter((opening) => opening.moves.every((move, index) => history[index] === move))
    .sort((left, right) => right.moves.length - left.moves.length)[0];
  return match?.name || (history.length < 2 ? 'Opening book loading' : 'Uncharted Opening');
}

function getPostGameReport(chess: any, qualities: { label: string; move: string; ply: number; provisional?: boolean }[]) {
  // Provisional entries are depth-1 guesses the analyst engine never confirmed (slow-phone
  // timeouts): the report card must not grade a guess, so they are excluded from scoring.
  const confirmed = qualities.filter((quality) => !quality.provisional);
  // Player-side dimensions only (the human plays White against Chester): the old
  // version counted BOTH sides' minor moves all game, credited king safety when
  // either side castled, and pinned a typical beginner win to a C by formula.
  const qualityScores: Record<string, number> = { BEST: 100, GREAT: 90, GOOD: 78, INACCURACY: 58, MISTAKE: 35, BLUNDER: 10 };
  const accuracy = confirmed.length
    ? Math.round(confirmed.reduce((total, quality) => total + (qualityScores[quality.label] || 50), 0) / confirmed.length)
    : 50;
  const history = chess.history({ verbose: true }) as any[];
  const playerMoves = history.filter((move) => move.color === 'w');
  const developedFroms = new Set(playerMoves.filter((move) => (move.piece === 'n' || move.piece === 'b') && ['b1', 'g1', 'c1', 'f1'].includes(move.from)).map((move) => move.from));
  const development = Math.min(100, developedFroms.size * 25);
  const castled = playerMoves.some((move) => move.flags.includes('k') || move.flags.includes('q'));
  const kingSafety = castled ? 95 : 45;
  const captures = playerMoves.filter((move) => move.captured).length;
  const checksGiven = playerMoves.filter((move) => (move.san || '').includes('+')).length;
  const tactics = Math.min(100, 45 + captures * 15 + checksGiven * 5);
  const blunders = confirmed.filter((quality) => quality.label === 'BLUNDER').length;
  const score = Math.round(accuracy * 0.5 + development * 0.2 + kingSafety * 0.15 + tactics * 0.15);
  const grade = score >= 88 ? 'A' : score >= 74 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const turningPoint = [...confirmed].sort((left, right) => (qualityScores[left.label] || 50) - (qualityScores[right.label] || 50))[0];
  return { grade, score, accuracy, development, kingSafety, tactics, openingName: getOpeningName(chess), moves: chess.history().length, turningPoint: turningPoint ? `${turningPoint.move} (${turningPoint.label})` : 'No decisive turning point', habits: { castled, developed: developedFroms.size >= 3, blunders } };
}

function getMoveFlavor(player: string, move: string, ply: number, mode: string) {
  const flavor = FLAVOR_LINES[ply % FLAVOR_LINES.length];
  if (player.includes('Neill')) {
    return `Neill plays ${move} with ${flavor}. Brendan is already calculating the counterplay, but this move just changed EVERYTHING.`;
  }
  return `Brendan slams ${move} down with ${flavor}. That is league-altering chess and Neill knows it.`;
}

// --- Lightweight chess AI: material-based alpha-beta search (depth 2) ---
const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Depth 1 already looks one reply ahead (avoids free blunders) and stays fast enough
// to run synchronously on the main thread without freezing the board animation.
const AI_SEARCH_DEPTH = 1;
const AI_RESPONSE_DELAY_MS = 2200;

function evaluatePosition(chess: any): number {
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const value = PIECE_VALUES[sq.type];
      score += sq.color === 'w' ? value : -value;
    }
  }
  return score;
}

function minimax(chess: any, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (chess.isCheckmate()) return maximizing ? -100000 - depth : 100000 + depth;
  if (chess.isDraw() || chess.isStalemate() || depth === 0) return evaluatePosition(chess);

  const moves = chess.moves({ verbose: true }).sort((a: any, b: any) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Picks the strongest available move for whichever color is currently on the move.
// Rookie move source: human-looking moves - random choice among moves that do not
// immediately lose material, so BEGINNER games are genuinely winnable while still sane.
function pickRookieMove(chess: any): any {
  try {
    const candidates: any[] = [];
    for (const m of chess.moves({ verbose: true })) {
      const next = new Chess(chess.fen());
      next.move({ from: m.from, to: m.to, promotion: 'q' });
      const replies = next.moves({ verbose: true });
      let worstLoss = 0;
      for (const r of replies) if (r.captured) worstLoss = Math.max(worstLoss, ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[r.captured] || 0);
      const gain = (({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[m.captured] || 0) + (m.promotion ? 8 : 0);
      if (worstLoss <= gain) candidates.push(m);
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch {
    return null;
  }
}

// Rookie "casual human" picker: genuine beginner chess. Mostly sane moves, sometimes
// tunnel-vision greed, sometimes pure wandering - so ROOKIE is genuinely beatable
// while still looking like a person learning, not a random mover.
function pickCasualMove(chess: any): any {
  try {
    const moves = chess.moves({ verbose: true });
    if (!moves.length) return null;
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const safe: any[] = [];
    for (const m of moves) {
      const next = new Chess(chess.fen());
      next.move({ from: m.from, to: m.to, promotion: 'q' });
      let worstLoss = 0;
      for (const r of next.moves({ verbose: true })) if (r.captured) worstLoss = Math.max(worstLoss, values[r.captured] || 0);
      const gain = (values[m.captured] || 0) + (m.promotion ? 8 : 0);
      if (worstLoss <= gain) safe.push(m);
    }
    const roll = Math.random();
    if (roll < 0.25) return moves[Math.floor(Math.random() * moves.length)]; // beginner blindness
    if (roll < 0.7 && safe.length) return safe[Math.floor(Math.random() * safe.length)]; // sensible but unoptimised
    const greedy = moves.map((m: any) => ({ m, g: (values[m.captured] || 0) + (m.promotion ? 8 : 0) + (m.san.includes('+') ? 0.5 : 0) + Math.random() * 1.5 }));
    greedy.sort((a, b) => b.g - a.g);
    return greedy[Math.floor(Math.random() * Math.min(3, greedy.length))].m; // tunnel-vision greed, can hang pieces
  } catch {
    return null;
  }
}

function pickBestMove(chess: any, searchDepth: number): any {
  const aiIsWhite = chess.turn() === 'w';
  const moves = chess.moves({ verbose: true });

  const scored = moves.map((m: any) => {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    // Small random jitter keeps play from feeling robotic when several moves are near-equal.
    const score = minimax(chess, searchDepth, -Infinity, Infinity, !aiIsWhite) + (Math.random() * 8 - 4);
    chess.undo();
    return { move: m, score };
  });

  scored.sort((a: any, b: any) => (aiIsWhite ? b.score - a.score : a.score - b.score));
  return scored[0]?.move || moves[0];
}

// Grades a played move against every legal alternative from the same position, Stockfish-style
// centipawn-loss grading (approximated with our own alpha-beta search since the app runs
// entirely client-side without a bundled engine binary).
function classifyMove(fenBeforeMove: string, playedMove: { from: string; to: string; promotion?: string }, searchDepth: number) {
  const board = new Chess(fenBeforeMove);
  const moverIsWhite = board.turn() === 'w';
  const moves = board.moves({ verbose: true });
  if (!moves.length) return null;

  let bestScore = -Infinity;
  let playedScore = -Infinity;
  for (const m of moves) {
    board.move({ from: m.from, to: m.to, promotion: m.promotion });
    const raw = minimax(board, searchDepth, -Infinity, Infinity, !moverIsWhite);
    board.undo();
    const normalized = moverIsWhite ? raw : -raw;
    if (normalized > bestScore) bestScore = normalized;
    if (m.from === playedMove.from && m.to === playedMove.to && (m.promotion || null) === (playedMove.promotion || null)) {
      playedScore = normalized;
    }
  }

  const centipawnLoss = Math.max(0, Math.round(bestScore - playedScore));
  let label = 'GOOD';
  // Toy fallback never mints TOP DOG (owner calibration, batch 43): a provisional crown
  // from a shallow local search reads as over-rewarding. Real BRILLIANT comes from the
  // analyst path (only-strong-move gap or forced mate) or the sound-sacrifice bell.
  if (centipawnLoss <= 5) label = 'BEST';
  else if (centipawnLoss <= 25) label = 'GREAT';
  else if (centipawnLoss <= 60) label = 'GOOD';
  else if (centipawnLoss <= 120) label = 'INACCURACY';
  else if (centipawnLoss <= 300) label = 'MISTAKE';
  else label = 'BLUNDER';

  return { label, centipawnLoss };
}

function getLetterGrade(centipawnLoss: number | null | undefined) {
  if (centipawnLoss === null || centipawnLoss === undefined || centipawnLoss <= 60) return 'A';
  if (centipawnLoss <= 120) return 'B';
  if (centipawnLoss <= 300) return 'C';
  return 'F';
}

function getGradeColor(grade: string | undefined) {
  // Traffic-light grading: green good, amber middling, red bad.
  if (grade === 'A') return 0x2fd17c;
  if (grade === 'B') return 0xffc53d;
  if (grade === 'C') return 0xff8c00;
  return 0xff1744;
}

// Simple opening-principles checklist used to give the Chester coaching module concrete talking points.
function getOpeningChecklist(chess: any) {
  const history = chess.history({ verbose: true });
  const centerSquares = ['d4', 'e4', 'd5', 'e5'];
  return {
    centerClaimed: history.some((m: any) => m.piece === 'p' && centerSquares.includes(m.to)),
    minorsDeveloped: history.filter((m: any) => m.piece === 'n' || m.piece === 'b').length,
    castled: history.some((m: any) => m.flags.includes('k') || m.flags.includes('q')),
    movesPlayed: history.length,
  };
}

function getOpeningAssessment(chess: any) {
  const openingMoves = chess.history({ verbose: true }).filter((move: any) => move.color === 'w').slice(0, 5);
  if (openingMoves.length < 5) return null;

  const centerClaimed = openingMoves.some((move: any) => move.piece === 'p' && ['d4', 'e4'].includes(move.to));
  const developedMinorSquares = new Set(
    openingMoves
      .filter((move: any) => (move.piece === 'n' || move.piece === 'b') && ['b1', 'g1', 'c1', 'f1'].includes(move.from))
      .map((move: any) => move.from)
  );
  const castled = openingMoves.some((move: any) => move.flags.includes('k') || move.flags.includes('q'));
  const earlyQueenMoves = openingMoves.filter((move: any) => move.piece === 'q').length;
  const repeatedMinorMoves = openingMoves.filter(
    (move: any) => (move.piece === 'n' || move.piece === 'b') && !['b1', 'g1', 'c1', 'f1'].includes(move.from)
  ).length;

  const score = Math.max(0, Math.min(100,
    (centerClaimed ? 30 : 0)
    + Math.min(40, developedMinorSquares.size * 15)
    + (castled ? 20 : 0)
    + (earlyQueenMoves === 0 ? 10 : 0)
    - repeatedMinorMoves * 10
  ));
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  const strengths = [
    centerClaimed && 'claimed central space',
    developedMinorSquares.size >= 2 && `developed ${developedMinorSquares.size} minor pieces`,
    castled && 'secured the king by castling',
    earlyQueenMoves === 0 && 'kept the queen out of early danger',
  ].filter(Boolean);
  const improvements = [
    !centerClaimed && 'fight for the center with the d- or e-pawn',
    developedMinorSquares.size < 2 && 'develop at least two knights or bishops',
    !castled && 'prepare to castle sooner',
    earlyQueenMoves > 0 && 'delay queen adventures until minor pieces are active',
    repeatedMinorMoves > 0 && 'avoid spending extra tempi on the same minor piece',
  ].filter(Boolean);

  return {
    grade,
    score,
    line: openingMoves.map((move: any) => move.san).join(' '),
    strengths,
    improvements,
    principles: { centerClaimed, minorsDeveloped: developedMinorSquares.size, castled, earlyQueenMoves, repeatedMinorMoves },
  };
}

function getChesterDifficulty(difficulty: string) {
  if (difficulty === 'BEGINNER') return 'BEGINNER' as const;
  if (difficulty === 'ADVANCED') return 'ADVANCED' as const;
  if (difficulty === 'EXPERT') return 'EXPERT' as const;
  if (difficulty === 'PRO') return 'EXPERT' as const;
  return 'INTERMEDIATE' as const;
}

export default function DojoEngine({ mode = 'STANDBY', playerColor = null, difficulty = 'INTERMEDIATE', rookieTeaching = false }: { mode?: string; playerColor?: 'w' | 'b' | null; difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'CASUAL' | 'PRO'; rookieTeaching?: boolean }) {
  const { p1Difficulty, p2Difficulty, setActiveChaosEvent } = useBrawlState();
  const containerRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRef = useRef<any>({
    chess: new Chess(),
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    coachSuggestion: null,
    trailPly: -1,
    openingAssessment: null,
    principleStreak: 0,
    playerQualities: [],
    gradeHistory: [],
    timeline: [],
    isGameOver: false,
    ply: 0,
    boardTheme: 'NEON',
    coachMarks: [] as any[],
  });

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Clean up old instance
    if (phaserRef.current) {
      phaserRef.current.destroy(true);
      phaserRef.current = null;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#05000a',
      input: { activePointers: 2, touch: { capture: true }, dragDistanceThreshold: 14 },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 800 },
      scene: {
        create: function (this: Phaser.Scene) {
          const scene = this;
          const tileSize = 92;
          const boardOffset = 30;
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

          const graphics = scene.add.graphics();
          let pieceContainers: Record<string, any> = {};
          let squareZones: Phaser.GameObjects.Zone[] = [];
          let legalTargetMarkers: Phaser.GameObjects.Arc[] = [];
          let renderBoard: () => void;
          const royalCatTextures: Partial<Record<'q' | 'k', string>> = {};
          const spotlightLayer = document.createElement('div');
          spotlightLayer.className = 'dojo-board__spotlights';
          containerRef.current?.appendChild(spotlightLayer);

          const updateSpotlights = () => {
            spotlightLayer.replaceChildren();
            const lastMove = gameRef.current.lastMove;
            if (!lastMove) return;

            [lastMove.from, lastMove.to].forEach((squareName) => {
              const col = files.indexOf(squareName[0]);
              const row = ranks.indexOf(squareName[1]);
              if (col < 0 || row < 0) return;
              const spotlight = document.createElement('div');
              spotlight.className = 'square-spotlight';
              spotlight.dataset.grade = lastMove.grade || 'A';
              spotlight.dataset.square = squareName === lastMove.to ? 'to' : 'from';
              spotlight.style.left = `${((boardOffset + col * tileSize) / 800) * 100}%`;
              spotlight.style.top = `${((boardOffset + row * tileSize) / 800) * 100}%`;
              spotlight.style.width = `${(tileSize / 800) * 100}%`;
              spotlight.style.height = `${(tileSize / 800) * 100}%`;
              spotlightLayer.appendChild(spotlight);
            });
          };

          const loadRoyalCatTextures = () => {
            (['q', 'k'] as const).forEach((pieceType) => {
              const imageUrl = localStorage.getItem(`chess-town-royal-cat-${pieceType}`);
              if (!imageUrl || royalCatTextures[pieceType]) return;
              const image = new Image();
              image.onload = () => {
                const textureKey = `royal-cat-${pieceType}`;
                if (!scene.textures.exists(textureKey)) scene.textures.addImage(textureKey, image);
                royalCatTextures[pieceType] = textureKey;
                renderBoard?.();
              };
              image.src = imageUrl;
            });
          };

          // Glossy sprite piece textures: bitmaps, so iOS emoji presentation can never
          // override the piece colors. Generated once per scene.
          (['w', 'b'] as const).forEach((color) => {
            ['p', 'r', 'n', 'b', 'q', 'k'].forEach((type) => {
              const key = `piece-${color}-${type}`;
              if (scene.textures.exists(key)) return;
              const tex = scene.textures.createCanvas(key, 144, 144);
              if (!tex) return;
              drawPieceSprite(tex.getContext(), color, type, 144);
              tex.refresh();
            });
          });

          const jailY = 16;
          // Jails are wide strips in the top margin: label on the left, captured pieces line up beside it.
          const jailX = 630;
          const greenJailX = 170;
          scene.add.rectangle(jailX, jailY, 310, 30, 0x240019, 0.95)
            .setStrokeStyle(2, 0xf43f7a, 0.9)
            .setDepth(20);
          scene.add.text(486, jailY, 'PIECE JAIL', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#fecdd8' }).setOrigin(0, 0.5).setDepth(21);
          scene.add.rectangle(greenJailX, jailY, 310, 30, 0x08200d, 0.95).setStrokeStyle(2, 0x39ff14, 0.9).setDepth(20);
          scene.add.text(26, jailY, 'GREEN JAIL', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#dfffda' }).setOrigin(0, 0.5).setDepth(21);
          const jailGlyphLayers: Record<'w' | 'b', Phaser.GameObjects.Container> = {
            w: scene.add.container(0, 0).setDepth(21),
            b: scene.add.container(0, 0).setDepth(21),
          };
          gameRef.current.jailedCounts = { w: 0, b: 0 };
          const jailCapturedPiece = (color: 'w' | 'b', type: string) => {
            try {
              const count = gameRef.current.jailedCounts[color]++;
              const layer = jailGlyphLayers[color];
              const startX = color === 'w' ? 112 : 570;
              const spacing = Math.min(26, 200 / Math.max(1, count + 1));
              (layer.getAll() as any[]).forEach((child, index) => child.setX(startX + index * spacing));
              const glyph = scene.add.image(startX + count * spacing, jailY, `piece-${color}-${type}`).setDisplaySize(28, 28);
              const fullScale = glyph.scaleX;
              glyph.setScale(0.02);
              scene.tweens.add({ targets: glyph, scaleX: fullScale, scaleY: fullScale, duration: 260, ease: 'Back.Out' });
              layer.add(glyph);
            } catch { /* jail art is decorative - never break the game for it */ }
          };

          // Draw board coordinates (static background)
          for (let col = 0; col < 8; col++) {
            // File letters (a-h)
            scene.add.text(boardOffset + col * tileSize + tileSize / 2, boardOffset + 8 * tileSize + 8, files[col], {
              fontFamily: 'sans-serif',
              fontSize: '16px',
              fontStyle: 'bold',
              color: '#ffffff',
            }).setOrigin(0.5, 0);
          }
          
          for (let row = 0; row < 8; row++) {
            // Rank numbers (1-8)
            scene.add.text(boardOffset - 12, boardOffset + row * tileSize + tileSize / 2, ranks[row], {
              fontFamily: 'sans-serif',
              fontSize: '16px',
              fontStyle: 'bold',
              color: '#ffffff',
            }).setOrigin(1, 0.5);
          }

          const emitCapture = (move: any) => {
            if (!move.captured) return;
            jailCapturedPiece(move.color === 'w' ? 'b' : 'w', move.captured);
            window.dispatchEvent(new CustomEvent('piece-captured', {
              detail: { color: move.color === 'w' ? 'b' : 'w', type: move.captured },
            }));
          };

          const renderAfterCapture = (move: any) => {
            if (!move.captured) {
              renderBoard();
              return;
            }

            const capturedPiece = pieceContainers[move.to];
            if (!capturedPiece) {
              renderBoard();
              return;
            }

            const attackingPiece = pieceContainers[move.from];
            if (attackingPiece) attackingPiece.setAlpha(0);
            capturedPiece.setDepth(30).setInteractive(false);
            const capturedIsWhite = move.color === 'b';
            const targetX = capturedIsWhite ? greenJailX : jailX;
            const targetColor = capturedIsWhite ? 0x2563eb : 0xf43f7a;
            const targetY = jailY;
            const impact = scene.add.circle(capturedPiece.x, capturedPiece.y, tileSize * 0.42, targetColor, 0.45).setDepth(29);
            scene.tweens.add({ targets: impact, scale: 1.8, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => impact.destroy() });
            const legs = scene.add.text(capturedPiece.x, capturedPiece.y + tileSize * 0.28, '🦵', { fontSize: '24px' }).setOrigin(0.5).setDepth(31).setScale(0.2);
            scene.tweens.add({ targets: legs, x: targetX, y: targetY + 14, scale: 0.65, angle: { from: -18, to: 18 }, duration: 1250, ease: 'Sine.InOut', yoyo: true, repeat: 0, onComplete: () => legs.destroy() });

            const moonwalk = scene.tweens.add({
              targets: capturedPiece,
              x: targetX,
              y: targetY,
              angle: { from: -14, to: 14 },
              scaleX: { from: 1, to: 0.52 },
              scaleY: { from: 1, to: 0.52 },
              duration: 1250,
              ease: 'Sine.InOut',
              onUpdate: (_tween, target) => {
                target.y += Math.sin(_tween.totalProgress * Math.PI * 6) * 2.4;
              },
              onComplete: () => {
                emitCapture(move);
                const lock = scene.add.text(targetX, targetY, '🔒', { fontSize: '24px' }).setOrigin(0.5).setDepth(31);
                scene.tweens.add({
                  targets: lock,
                  alpha: 0,
                  scale: 1.3,
                  duration: 260,
                  ease: 'Quad.Out',
                  onComplete: () => lock.destroy(),
                });
                renderBoard();
              },
            });

            moonwalk.once(Phaser.Tweens.Events.TWEEN_STOP, () => renderBoard());
          };

          // Engine line in words: walk the PV from the resulting position and phrase each
          // half-move, so popups can quote the engine's script instead of generic filler.
          const buildEngineLine = (fenStart: string, ucis: string[] | undefined, max = 3): string[] => {
            if (!ucis || !ucis.length) return [];
            try {
              const board = new Chess(fenStart);
              const out: string[] = [];
              for (const uci of ucis.slice(0, max)) {
                const fenStep = board.fen();
                const applied = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || 'q' });
                if (!applied) break;
                out.push(describeMove(fenStep, applied.san));
              }
              return out;
            } catch {
              return [];
            }
          };

          // Sacrifice detection: the moved piece can simply be taken back, and what was won
          // for it does not cover it. Only meaningful alongside a good engine verdict.
          const detectSacrifice = (fenBeforeMove: string, move: any): string | null => {
            try {
              const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
              const names: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
              const gaveUp = values[move.piece] || 0;
              const gained = values[move.captured] || 0;
              if (gaveUp < 3 || gaveUp - gained < 2) return null;
              const board = new Chess(fenBeforeMove);
              board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
              const recapturable = board.moves({ verbose: true }).some((candidate: any) => candidate.to === move.to && Boolean(candidate.captured));
              return recapturable ? names[move.piece] || null : null;
            } catch {
              return null;
            }
          };

          const publishMove = (move: any, player: string, quality: { label: string; centipawnLoss: number } | null, engineTelemetry: any = null, phrases: { movePhrase?: string | null; bestMovePhrase?: string | null; engineLine?: string[] | null; sacrificePiece?: string | null; provisional?: boolean; principle?: OpeningPrinciple | null; exchange?: PlannedExchange | null } = {}, fenBeforeMove: string | null = null) => {
            // Commentary speaks only to human moves: in AI games the opponent (black) gets no banter or coaching line.
            const isAiMover = mode !== 'PVP_LOCAL' && mode !== 'PVP_REMOTE' && move.color === 'b';
            const grade = getLetterGrade(engineTelemetry?.evalDelta ?? quality?.centipawnLoss);
            gameRef.current.lastMove = { ...gameRef.current.lastMove, grade };
            const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
            if (!isAiMover) window.dispatchEvent(new CustomEvent('dojo-banter', {
              detail: {
                type: 'move', ply: gameRef.current.ply, player, move: move.san,
                from: move.from, to: move.to, piece: move.piece, captured: move.captured || null,
                fenBefore: fenBeforeMove || null,
                  royalCatMove: move.piece === 'q' || move.piece === 'k',
                  royalCatName: move.piece === 'q' ? 'Marley' : move.piece === 'k' ? 'Dilly' : null,
                fen: engineTelemetry?.fenAfter || gameRef.current.chess.fen(), matchup: isBrawl ? 'The Backroom Brawl' : AI_TAGS[mode]?.title, context: `${mode} matchup`,
                quality: quality?.label || null, grade, centipawnLoss: quality?.centipawnLoss ?? null,
                checklist: mode === 'COACH_OPENING' || mode === 'COACH_PRACTICE_OPENING' ? getOpeningChecklist(gameRef.current.chess) : null,
                openingAssessment: gameRef.current.openingAssessment,
                openingName: getOpeningName(gameRef.current.chess),
                principleStreak: gameRef.current.principleStreak,
                engineTelemetry,
                evaluationBefore: engineTelemetry?.evaluationBefore ?? null,
                evaluationAfter: engineTelemetry?.evaluationAfter ?? null,
                evalDelta: engineTelemetry?.evalDelta ?? quality?.centipawnLoss ?? null,
                principalVariation: engineTelemetry?.principalVariation ?? [],
                alternateWinningLines: engineTelemetry?.alternateWinningLines ?? [],
                continuation: engineTelemetry?.continuation ?? [],
                engineLine: phrases.engineLine ?? null,
                sacrificePiece: phrases.sacrificePiece ?? null,
                provisional: phrases.provisional === true,
                principleKey: phrases.principle?.key ?? null,
                principleFollowed: phrases.principle?.followed ?? null,
                exchangeLost: phrases.exchange?.lostPiece ?? null,
                exchangeWon: phrases.exchange?.wonPiece ?? null,
                exchangeNet: phrases.exchange?.net ?? null,
              },
            }));
            // Live-move commentary for the play-chester page (Chester games AND pass & play):
            // the page listens for chester-coaching-pause; nothing else dispatches it.
            if (!isAiMover) window.dispatchEvent(new CustomEvent('chester-coaching-pause', {
              detail: {
                kind: 'move',
                move: move.san,
                fen: engineTelemetry?.fenAfter || gameRef.current.chess.fen(),
                fenBefore: fenBeforeMove || null,
                bestMove: engineTelemetry?.bestMoveSan || engineTelemetry?.bestMove || null,
                classification: quality?.label || null,
                evalDelta: engineTelemetry?.evalDelta ?? quality?.centipawnLoss ?? null,
                evaluationBefore: engineTelemetry?.evaluationBefore ?? null,
                evaluationAfter: engineTelemetry?.evaluationAfter ?? null,
                captured: move.captured || null,
                check: move.san.includes('+'),
                mate: move.san.includes('#'),
                ply: gameRef.current.ply,
                player,
                movePhrase: phrases.movePhrase || null,
                bestMovePhrase: phrases.bestMovePhrase || null,
                continuation: engineTelemetry?.continuation ?? null,
                engineLine: phrases.engineLine ?? null,
                sacrificePiece: phrases.sacrificePiece ?? null,
                provisional: phrases.provisional === true,
                principleKey: phrases.principle?.key ?? null,
                principleFollowed: phrases.principle?.followed ?? null,
                exchangeLost: phrases.exchange?.lostPiece ?? null,
                exchangeWon: phrases.exchange?.wonPiece ?? null,
                exchangeNet: phrases.exchange?.net ?? null,
              },
            }));
            // Chester owns his howlers: rookie mode hangs pieces on purpose, so he admits them out loud.
            if (isAiMover && (quality?.label === 'MISTAKE' || quality?.label === 'BLUNDER')) window.dispatchEvent(new CustomEvent('chester-coaching-pause', {
              detail: {
                kind: 'howler',
                move: move.san,
                classification: quality.label,
                captured: move.captured || null,
                ply: gameRef.current.ply,
                player,
                movePhrase: phrases.movePhrase || (fenBeforeMove ? describeMove(fenBeforeMove, move.san) : null),
              },
            }));
          };

          const publishPositionEvaluation = (fen: string) => {
            void getStockfishClient().analyzeForDisplay(fen).then((analysis) => {
              const stm = fen.split(/\s+/)[1];
              const absScore = analysis.score === null ? null : stm === 'b' ? -analysis.score : analysis.score;
              const absMate = analysis.mate === null ? null : stm === 'b' ? -analysis.mate : analysis.mate;
              window.dispatchEvent(new CustomEvent('engine-evaluation', {
                detail: {
                  fen,
                  evalScore: absMate === null ? (absScore === null ? null : absScore / 100) : `M${absMate}`,
                  bestMove: { uci: analysis.bestMove, san: (() => { try { return new Chess(fen).move(analysis.bestMove, { sloppy: true } as any)?.san || null; } catch { return null; } })(), phrase: describeMove(fen, analysis.bestMove) },
                  evalDelta: null,
                  moveQuality: null,
                },
              }));
            }).catch(() => undefined);
          };

          const flashHouseAdvantage = () => scene.cameras.main.flash(650, 80, 255, 120);
          const chooseTrojanPawnSquare = (pieceColor: 'w' | 'b') => {
            const candidates: string[] = [];
            const board = gameRef.current.chess.board();
            for (let row = 0; row < 8; row++) {
              for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece?.color === pieceColor && (piece.type === 'n' || piece.type === 'b')) candidates.push(files[col] + ranks[row]);
              }
            }
            return candidates.sort()[0] || null;
          };

          const evaluateAndPublishMove = (move: any, player: string, fenBeforeMove: string, rawLocalQuality: { label: string; centipawnLoss: number } | null) => {
            const localQuality = rawLocalQuality ? { ...rawLocalQuality, label: applyMaterialReality(fenBeforeMove, move, rawLocalQuality.label) } : rawLocalQuality;
            // Capture the ply NOW: telemetry resolves after the opponent replies, and reading
            // gameRef.current.ply inside .then would relabel (or miss) the wrong move.
            const movePly = gameRef.current.ply;
            const fenAfterMove = gameRef.current.chess.fen();
            const uci = `${move.from}${move.to}${move.promotion || ''}`;
            // ROOKIE lens: name the opening principle this move served or broke. Local and
            // cheap, so it works even when the analyst engine times out on a slow phone.
            // Scoped by owner decision: the rookie teaching pass lives in the Play Chester
            // game mode only - other modes (arena, brawl, PvP) keep their existing grading.
            const openingPrinciple = rookieTeaching && move.color === 'w' ? detectOpeningPrinciple(fenBeforeMove, move, gameRef.current.chess.history({ verbose: true })) : null;
            void getStockfishClient().evaluateMove({
              fenBefore: fenBeforeMove,
              fenAfter: fenAfterMove,
              san: move.san,
              uci,
              playerColor: move.color,
              difficulty: getChesterDifficulty(difficulty),
            }).then((telemetry) => {
              const quality = { label: applyMaterialReality(fenBeforeMove, move, telemetry.classification || 'GOOD'), centipawnLoss: telemetry.evalDelta ?? localQuality?.centipawnLoss ?? 0 };
              // Delicate grading for genuine learner moves (ROOKIE only): a move that follows a
              // real opening principle and costs less than a pawn is taught, not scolded.
              if (openingPrinciple?.followed && quality.label === 'INACCURACY') quality.label = 'GOOD';
              // The BRILLIANT bell, chess.com style: a detected sound sacrifice that IS the
              // engine's own first choice and holds the eval (near-zero loss) claims the top
              // grade. Depth-12 re-evaluation noise lands these in the GREAT band, so escalate.
              const earlySacrifice = detectSacrifice(fenBeforeMove, move);
              if (earlySacrifice && telemetry.bestMove === uci && telemetry.evalDelta !== null && telemetry.evalDelta !== undefined && telemetry.evalDelta <= 30) {
                quality.label = 'BRILLIANT';
              }
              const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
              const triggeredChaos = isBrawl
                ? checkChaosTriggers(telemetry.fenAfter, telemetry.evalScore, telemetry.moveQuality, p1Difficulty, p2Difficulty)
                : null;
              const isUnderdogMulligan = mode === 'UNDERDOG' && move.color === 'w';
              const isRemoteBrawlMulligan = mode === 'PVP_REMOTE' && move.color === 'b';
              const chaosEvent = gameRef.current.pendingChaosEvent || (triggeredChaos === 'MULLIGAN' && (isUnderdogMulligan || isRemoteBrawlMulligan) ? 'MULLIGAN' : null);
              gameRef.current.pendingChaosEvent = null;

              if (triggeredChaos === 'TROJAN_PAWN' && !gameRef.current.trojanPawnArmed && !gameRef.current.trojanPawnSquare) gameRef.current.trojanPawnArmed = true;

              if (chaosEvent === 'MULLIGAN' && gameRef.current.chess.fen() === fenAfterMove) {
                const revertedMove = gameRef.current.chess.undo();
                if (revertedMove) {
                  gameRef.current.ply = Math.max(0, gameRef.current.ply - 1);
                  gameRef.current.timeline.pop();
                  gameRef.current.lastMove = gameRef.current.timeline.at(-1)?.lastMove || null;
                  if (revertedMove.captured) {
                    window.dispatchEvent(new CustomEvent('piece-restored', { detail: { color: revertedMove.color === 'w' ? 'b' : 'w', type: revertedMove.captured } }));
                  }
                  flashHouseAdvantage();
                  renderBoard();
                }
              }

              if (chaosEvent) setActiveChaosEvent(chaosEvent);
              if (isBrawl) {
                const syncedFen = gameRef.current.chess.fen();
                window.dispatchEvent(new CustomEvent('brawl-position-update', {
                  detail: {
                    fen: syncedFen,
                    turn: gameRef.current.chess.turn(),
                    activeChaosEvent: chaosEvent,
                    trojanPawnArmed: Boolean(gameRef.current.trojanPawnArmed),
                    trojanPawnSquare: gameRef.current.trojanPawnSquare || null,
                  },
                }));
              }
              const isAiMoverTelemetry = mode !== 'PVP_LOCAL' && mode !== 'PVP_REMOTE' && move.color === 'b';
              if (!isAiMoverTelemetry) window.dispatchEvent(new CustomEvent('dojo-engine-telemetry', { detail: telemetry }));
              window.dispatchEvent(new CustomEvent('engine-evaluation', {
                detail: {
                  fen: telemetry.fenAfter,
                  evalScore: telemetry.evalScore,
                  bestMove: { uci: telemetry.bestMove, san: telemetry.bestMoveSan },
                  evalDelta: telemetry.evalDelta,
                  moveQuality: telemetry.moveQuality,
                },
              }));
              const gradeEntry = gameRef.current.gradeHistory.find((entry: any) => entry.ply === movePly && entry.move === move.san);
              if (gradeEntry) {
                gradeEntry.grade = getLetterGrade(quality.centipawnLoss);
                gradeEntry.centipawnLoss = quality.centipawnLoss;
              }
              // The report card reads playerQualities, which was seeded with the fast local
              // (depth-1) label before the engine answered. Upgrade it to the real verdict so
              // the card grades moves the way the engine saw them, not the shallow guess.
              const playerEntry = gameRef.current.playerQualities.find((entry: any) => entry.ply === movePly && entry.move === move.san);
              if (playerEntry) playerEntry.label = quality.label;
              const movePhrase = describeMove(fenBeforeMove, move.san);
              const bestMovePhrase = telemetry?.bestMove ? describeMove(fenBeforeMove, telemetry.bestMove) : null;
              const topGrade = quality.label === 'BRILLIANT' || quality.label === 'BEST' || quality.label === 'GREAT';
              const sacrificePiece = topGrade ? detectSacrifice(fenBeforeMove, move) : null;
              const engineLine = buildEngineLine(fenAfterMove, telemetry?.continuation);
              // Plan recognition, two lenses: (a) a NEW poisoned bait created by this move
              // (his queen/rook trap - the honest engine never plays the bait line, so PV alone
              // misses it), (b) the engine's own script showing capture then bigger recapture.
              // The before-check needs the opponent to move in the same position: flip the
              // turn field. chess.js may reject an impossible flip (king in check) -> null,
              // which safely treats the trap as new.
              const fenBeforeOppTurn = fenBeforeMove.replace(/ (w|b) /, (match, turn) => (turn === 'w' ? ' b ' : ' w '));
              const trapsBefore = rookieTeaching && move.color === 'w' ? detectTraps(fenBeforeOppTurn) : [];
              const trapsAfter = rookieTeaching && move.color === 'w' ? detectTraps(fenAfterMove) : [];
              // A trap counts when this move created it or made it better: compare per
              // bait (attacker + square), because a pre-existing bigger trap elsewhere on
              // the board must not mask the new one (the batch-43 live miss).
              const trapCreated = trapsAfter.find((trap) => {
                const prev = trapsBefore.find((b) => b.baitSquare === trap.baitSquare && b.attackerFrom === trap.attackerFrom);
                return !prev || trap.net > prev.net;
              }) || null;
              const plannedExchange = rookieTeaching && move.color === 'w'
                ? trapCreated || detectPlannedExchange(fenAfterMove, telemetry?.continuation, move.color)
                : null;
              publishMove(move, player, quality, telemetry, { movePhrase, bestMovePhrase, engineLine, sacrificePiece, principle: openingPrinciple, exchange: plannedExchange }, fenBeforeMove);
              if (chaosEvent) {
                window.dispatchEvent(new CustomEvent('dojo-banter', {
                  detail: { type: 'move', move: move.san, player, fen: gameRef.current.chess.fen(), quality: quality.label, engineTelemetry: telemetry, activeChaosEvent: chaosEvent, matchup: 'The Backroom Brawl', instruction: chaosEvent === 'MULLIGAN' ? 'Reply exactly: Oops, slip of the finger. The house grants the underdog another go.' : 'Reply exactly: Chester was getting too comfortable. One of his pieces is now disguised as a pawn. Good luck, Expert.' },
                }));
              }
            }).catch(() => {
              // The analyst run failed or timed out (real on a slow phone). The depth-1 toy
              // label must never reach the user as an unmarked verdict: publish it flagged
              // provisional so the card says FIRST TAKE instead of a fake grade, and mark the
              // scorecard entries so the report card doesn't grade a guess.
              const playerEntry = gameRef.current.playerQualities.find((entry: any) => entry.ply === movePly && entry.move === move.san);
              if (playerEntry) playerEntry.provisional = true;
              const gradeEntry = gameRef.current.gradeHistory.find((entry: any) => entry.ply === movePly && entry.move === move.san);
              if (gradeEntry) gradeEntry.provisional = true;
              publishMove(move, player, localQuality, null, { movePhrase: describeMove(fenBeforeMove, move.san), provisional: true, principle: openingPrinciple }, fenBeforeMove);
            });
          };

          const finishGame = (message: string, result: 'checkmate' | 'draw' | 'resigned' = 'draw') => {
            gameRef.current.isGameOver = true;
            // chess.js never stamps the result token (pgn always ends "*"), which made
            // every /1-0$/ test downstream false: wins read as draws, no ladder unlocks,
            // no banked points. Stamp it here: checkmate/resign -> the side to move lost.
            const resultTag = result === 'draw' ? '1/2-1/2' : gameRef.current.chess.turn() === 'w' ? '0-1' : '1-0';
            const pgn = `${gameRef.current.chess.pgn().replace(/\s*\*?\s*$/, '')} ${resultTag}`;
            window.dispatchEvent(new CustomEvent('game-report', { detail: { ...getPostGameReport(gameRef.current.chess, gameRef.current.playerQualities), gradeHistory: gameRef.current.gradeHistory, pgn } }));
            window.dispatchEvent(new CustomEvent('dojo-banter', { detail: { type: 'summary', message, pgn } }));
            window.dispatchEvent(new CustomEvent('match-complete', { detail: { result, pgn } }));
          };

          const playAiTurn = (responseDelay = AI_RESPONSE_DELAY_MS) => {
            
            if (mode === 'PVP_LOCAL' || mode === 'PVP_REMOTE') return;
            setTimeout(async () => {

              if (gameRef.current.isGameOver) return;
              const moves = gameRef.current.chess.moves({ verbose: true });
              if (!moves.length) return;
              const fenBeforeMove = gameRef.current.chess.fen();
              const searchD = difficulty === 'PRO' ? 2 : 1;
              const engineMove = await getStockfishClient().selectMove(fenBeforeMove, getChesterDifficulty(difficulty)).catch(() => null);
              let aiMove = engineMove
                ? { from: engineMove.slice(0, 2), to: engineMove.slice(2, 4), promotion: engineMove.slice(4, 5) || undefined }
                : pickBestMove(gameRef.current.chess, searchD);
              if (difficulty === 'BEGINNER') {
                const casual = Math.random() < 0.85 ? pickCasualMove(gameRef.current.chess) || pickRookieMove(gameRef.current.chess) : null;
                if (casual) aiMove = { from: casual.from, to: casual.to, promotion: casual.promotion || undefined };
              }
              const result = gameRef.current.chess.move({ from: aiMove.from, to: aiMove.to, promotion: 'q' });
              const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
              if (isBrawl && result.color === 'b' && gameRef.current.trojanPawnArmed && !gameRef.current.trojanPawnSquare) {
                gameRef.current.trojanPawnSquare = chooseTrojanPawnSquare('b');
                gameRef.current.trojanPawnArmed = false;
                gameRef.current.pendingChaosEvent = 'TROJAN_PAWN';
              }
              const quality = classifyMove(fenBeforeMove, { from: result.from, to: result.to, promotion: result.promotion }, AI_SEARCH_DEPTH);
              gameRef.current.ply++;
              gameRef.current.lastMove = { from: result.from, to: result.to, grade: getLetterGrade(quality?.centipawnLoss) };
              gameRef.current.gradeHistory.push({ move: result.san, player: AI_TAGS[mode]?.rival || 'Chester', ply: gameRef.current.ply, grade: getLetterGrade(quality?.centipawnLoss), centipawnLoss: quality?.centipawnLoss ?? null });
              gameRef.current.timeline.push({ fen: gameRef.current.chess.fen(), lastMove: gameRef.current.lastMove, san: result.san });
              evaluateAndPublishMove(result, AI_TAGS[mode]?.rival || 'Brendan', fenBeforeMove, quality);

              if (gameRef.current.chess.isCheckmate() || gameRef.current.chess.isStalemate() || gameRef.current.chess.isDraw()) {
                const isCheckmate = gameRef.current.chess.isCheckmate();
                const status = isCheckmate ? 'CHECKMATE — The AI closes the book!' : gameRef.current.chess.isStalemate() ? 'STALEMATE — Equilibrium achieved.' : 'DRAW — Respect all around.';
                finishGame(`🏁 ${status} The ${AI_TAGS[mode]?.title} just defined an entire era.`, isCheckmate ? 'checkmate' : 'draw');
              }
              renderAfterCapture(result);
            }, responseDelay);
          };

          const playUserMove = (from: string, to: string, isRemote = false) => {
            const fenBeforeMove = gameRef.current.chess.fen();
            const moveResult = gameRef.current.chess.move({ from, to, promotion: 'q' });
            if (!moveResult) return;
            const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
            if (isBrawl && moveResult.color === 'w' && gameRef.current.trojanPawnArmed && !gameRef.current.trojanPawnSquare) {
              gameRef.current.trojanPawnSquare = chooseTrojanPawnSquare('w');
              gameRef.current.trojanPawnArmed = false;
              gameRef.current.pendingChaosEvent = 'TROJAN_PAWN';
            }
            const blindnessExpires = gameRef.current.neonBlindnessColor && moveResult.color !== gameRef.current.neonBlindnessColor;
            if (blindnessExpires) gameRef.current.neonBlindnessColor = null;
            gameRef.current.ply++;
            gameRef.current.lastMove = { from, to };
            gameRef.current.coachSuggestion = null;
            gameRef.current.timeline.push({ fen: gameRef.current.chess.fen(), lastMove: gameRef.current.lastMove, san: moveResult.san });
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            const playerName = mode === 'PVP_LOCAL' || mode === 'PVP_REMOTE'
              ? (moveResult.color === 'w' ? AI_TAGS[mode].player : AI_TAGS[mode].rival)
              : AI_TAGS[mode]?.player || 'Neill';
            const quality = classifyMove(fenBeforeMove, { from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion }, AI_SEARCH_DEPTH);
            gameRef.current.lastMove.grade = getLetterGrade(quality?.centipawnLoss);
            gameRef.current.gradeHistory.push({ move: moveResult.san, player: playerName, ply: gameRef.current.ply, grade: getLetterGrade(quality?.centipawnLoss), centipawnLoss: quality?.centipawnLoss ?? null });
            if (mode === 'PVP_REMOTE' && !isRemote) {
              window.dispatchEvent(new CustomEvent('local-chess-move', { detail: { from, to, fen: gameRef.current.chess.fen() } }));
            }

            requestAnimationFrame(() => {
              if (moveResult.color === 'w' && !isRemote) {
                gameRef.current.playerQualities.push({ label: quality?.label || 'GOOD', move: moveResult.san, ply: gameRef.current.ply });
                gameRef.current.principleStreak = ['BEST', 'GREAT', 'GOOD'].includes(quality?.label || '') ? gameRef.current.principleStreak + 1 : 0;
              }
              if (mode === 'COACH_PRACTICE_OPENING' && moveResult.color === 'w' && !gameRef.current.openingAssessment) {
                gameRef.current.openingAssessment = getOpeningAssessment(gameRef.current.chess);
                if (gameRef.current.openingAssessment) {
                  window.dispatchEvent(new CustomEvent('opening-assessment', { detail: gameRef.current.openingAssessment }));
                }
              }
              evaluateAndPublishMove(moveResult, playerName, fenBeforeMove, quality);
            });

            if (gameRef.current.chess.isCheckmate() || gameRef.current.chess.isStalemate() || gameRef.current.chess.isDraw()) {
              const isCheckmate = gameRef.current.chess.isCheckmate();
              const status = isCheckmate ? 'CHECKMATE — You bent the board to your will!' : gameRef.current.chess.isStalemate() ? 'STALEMATE — The board called a truce.' : 'DRAW — The league just locked in a peace treaty.';
              finishGame(`🏁 ${status} ${AI_TAGS[mode]?.title} just delivered a full season arc.`, isCheckmate ? 'checkmate' : 'draw');
              renderAfterCapture(moveResult);
              return;
            }
            renderAfterCapture(moveResult);
            if (blindnessExpires) renderBoard();
            if (!isRemote) playAiTurn(moveResult.captured ? 2600 : AI_RESPONSE_DELAY_MS);
          };

          const showLegalTargets = () => {
            legalTargetMarkers.forEach((marker) => marker.destroy());
            legalTargetMarkers = gameRef.current.legalTargets.map((target: string) => {
              const col = files.indexOf(target[0]);
              const row = ranks.indexOf(target[1]);
              return scene.add.circle(boardOffset + col * tileSize + tileSize / 2, boardOffset + row * tileSize + tileSize / 2, 14, 0x39ff14, 0.8);
            });
          };

          const canControlPiece = (pieceColor: string) => {
            if (gameRef.current.isGameOver || pieceColor !== gameRef.current.chess.turn()) return false;
            if (mode === 'PVP_REMOTE') return pieceColor === playerColor;
            if (mode === 'PVP_LOCAL') return true;
            return pieceColor === 'w';
          };

          const selectSquare = (squareName: string, pieceColor: string) => {
            if (!canControlPiece(pieceColor)) return false;
            gameRef.current.selectedSquare = squareName;
            gameRef.current.legalTargets = gameRef.current.chess.moves({ square: squareName, verbose: true }).map((move: any) => move.to);
            showLegalTargets();
            return true;
          };

          renderBoard = () => {
            updateSpotlights();
            graphics.clear();
            // Wipe every mark from the previous redraw (arrows, rings, spotlights) so
            // only the single last move + current hint get drawn - never a spiderweb.
            (gameRef.current.coachMarks || []).forEach((mark: any) => {
              scene.tweens.killTweensOf(mark);
              try { mark.destroy(); } catch { /* already destroyed */ }
            });
            gameRef.current.coachMarks = [];
            legalTargetMarkers.forEach((marker) => marker.destroy());
            legalTargetMarkers = [];
            squareZones.forEach((zone) => zone.destroy());
            squareZones = [];
            Object.values(pieceContainers).forEach((c) => c?.destroy());
            pieceContainers = {};

            // Draw board squares
            const lastMovePiece = gameRef.current.lastMove ? gameRef.current.chess.get(gameRef.current.lastMove.to) : null;
            const isLastMoveInvisible = mode === 'COACH_INVISIBLE' && lastMovePiece && lastMovePiece.color === 'b' && ['q', 'r', 'n'].includes(lastMovePiece.type);

            for (let row = 0; row < 8; row++) {
              for (let col = 0; col < 8; col++) {
                const squareName = files[col] + ranks[row];
                const isMoveSpotlight = !isLastMoveInvisible && gameRef.current.lastMove && (squareName === gameRef.current.lastMove.from || squareName === gameRef.current.lastMove.to);
                const [lightSquare, darkSquare] = BOARD_THEMES[gameRef.current.boardTheme as keyof typeof BOARD_THEMES] || BOARD_THEMES.NEON;
                const squareColor = (row + col) % 2 === 0 ? lightSquare : darkSquare;
                graphics.fillStyle(squareColor, 1);
                graphics.fillRect(
                  boardOffset + col * tileSize,
                  boardOffset + row * tileSize,
                  tileSize,
                  tileSize
                );
                graphics.lineStyle(1.2, 0x7a3047, 0.16);
                graphics.strokeRect(
                  boardOffset + col * tileSize,
                  boardOffset + row * tileSize,
                  tileSize,
                  tileSize
                );
                if (isMoveSpotlight) {
                  const isDestination = squareName === gameRef.current.lastMove.to;
                  const gradeColor = getGradeColor(gameRef.current.lastMove.grade);
                  const spotlight = scene.add.circle(
                    boardOffset + col * tileSize + tileSize / 2,
                    boardOffset + row * tileSize + tileSize / 2,
                    tileSize * 0.55,
                    gradeColor,
                    isDestination ? 0.38 : 0.1
                  ).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
                  (gameRef.current.coachMarks = gameRef.current.coachMarks || []).push(spotlight);
                  scene.tweens.add({ targets: spotlight, alpha: isDestination ? 0.14 : 0.04, scale: 1.18, duration: 620, ease: 'Sine.InOut', yoyo: true, repeat: 1, onComplete: () => { try { spotlight.destroy(); } catch { /* wiped by redraw */ } } });
                  graphics.lineStyle(isDestination ? 3 : 1, gradeColor, isDestination ? 0.9 : 0.22);
                  graphics.strokeRect(boardOffset + col * tileSize + 4, boardOffset + row * tileSize + 4, tileSize - 8, tileSize - 8);
                }

                const zone = scene.add.zone(
                  boardOffset + col * tileSize + tileSize / 2,
                  boardOffset + row * tileSize + tileSize / 2,
                  tileSize,
                  tileSize
                ).setInteractive();
                zone.on('pointerdown', () => {
                  if (gameRef.current.selectedSquare && gameRef.current.legalTargets.includes(squareName)) {
                    playUserMove(gameRef.current.selectedSquare, squareName);
                  }
                });
                squareZones.push(zone);
              }
            }

            // Chester's visual coaching: blue idea arrow (his preferred move) + rose danger arrows (concrete threats)
            const drawCoachArrow = (fromSquare: string, toSquare: string, color: number) => {
              const fromCol = files.indexOf(fromSquare[0]);
              const fromRow = ranks.indexOf(fromSquare[1]);
              const toCol = files.indexOf(toSquare[0]);
              const toRow = ranks.indexOf(toSquare[1]);
              if (fromCol < 0 || fromRow < 0 || toCol < 0 || toRow < 0) return;
              const x1 = boardOffset + fromCol * tileSize + tileSize / 2;
              const y1 = boardOffset + fromRow * tileSize + tileSize / 2;
              const x2 = boardOffset + toCol * tileSize + tileSize / 2;
              const y2 = boardOffset + toRow * tileSize + tileSize / 2;
              const arrow = scene.add.graphics().setDepth(16);
              arrow.lineStyle(7, color, 0.28);
              arrow.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
              arrow.lineStyle(3.5, color, 0.95);
              arrow.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
              const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
              const headLength = 15;
              arrow.fillStyle(color, 0.95);
              arrow.fillTriangle(
                x2, y2,
                x2 - headLength * Math.cos(angle - 0.45), y2 - headLength * Math.sin(angle - 0.45),
                x2 - headLength * Math.cos(angle + 0.45), y2 - headLength * Math.sin(angle + 0.45)
              );
              const ring = scene.add.circle(x2, y2, tileSize * 0.46, color, 0).setStrokeStyle(3, color, 0.55).setDepth(15);
              (gameRef.current.coachMarks = gameRef.current.coachMarks || []).push(arrow, ring);
              scene.tweens.add({ targets: ring, alpha: 0.25, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
            };
            // Arrow discipline: lines appear ONLY for (a) a lesson/hint suggestion,
            // (b) the move just made, (c) a tapped piece's options (the green dots above).
            // One of each, always replaced - never a spiderweb.
            if (!gameRef.current.isGameOver) {
              if (gameRef.current.lastMove) {
                drawCoachArrow(gameRef.current.lastMove.from, gameRef.current.lastMove.to, getGradeColor(gameRef.current.lastMove.grade));
                // Fun trail: a spark rides the path of the move that was just made (both sides).
                if (gameRef.current.trailPly !== gameRef.current.ply) {
                  gameRef.current.trailPly = gameRef.current.ply;
                  const fCol = files.indexOf(gameRef.current.lastMove.from[0]);
                  const fRow = ranks.indexOf(gameRef.current.lastMove.from[1]);
                  const tCol = files.indexOf(gameRef.current.lastMove.to[0]);
                  const tRow = ranks.indexOf(gameRef.current.lastMove.to[1]);
                  if (fCol >= 0 && fRow >= 0 && tCol >= 0 && tRow >= 0) {
                    const spark = scene.add.circle(boardOffset + fCol * tileSize + tileSize / 2, boardOffset + fRow * tileSize + tileSize / 2, tileSize * 0.16, getGradeColor(gameRef.current.lastMove?.grade), 0.95).setDepth(30);
                    scene.tweens.add({ targets: spark, x: boardOffset + tCol * tileSize + tileSize / 2, y: boardOffset + tRow * tileSize + tileSize / 2, duration: 420, ease: 'Cubic.Out', onComplete: () => scene.tweens.add({ targets: spark, alpha: 0, scale: 2.2, duration: 260, onComplete: () => spark.destroy() }) });
                  }
                }
              }
              if (gameRef.current.coachSuggestion) drawCoachArrow(gameRef.current.coachSuggestion.from, gameRef.current.coachSuggestion.to, 0x2563eb);
            }

            // Draw pieces
            const board = gameRef.current.chess.board();
            for (let row = 0; row < 8; row++) {
              for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                const squareName = files[col] + ranks[row];

                if (piece) {
                  const isInvisible = mode === 'COACH_INVISIBLE' && piece.color === 'b' && ['q', 'r', 'n'].includes(piece.type);
                  const posX = boardOffset + col * tileSize + tileSize / 2;
                  const posY = boardOffset + row * tileSize + tileSize / 2;
                  const container = scene.add.container(posX, posY);

                  // Highlight last move
                  if (!isInvisible && !isLastMoveInvisible && gameRef.current.lastMove && (squareName === gameRef.current.lastMove.from || squareName === gameRef.current.lastMove.to)) {
                    const isDestination = squareName === gameRef.current.lastMove.to;
                    const highlight = scene.add.circle(0, 0, tileSize * 0.45, getGradeColor(gameRef.current.lastMove.grade), isDestination ? 0.4 : 0.08);
                    container.add(highlight);
                  }

                  const isWhite = piece.color === 'w';
                  const isMovedPiece = !isLastMoveInvisible && gameRef.current.lastMove?.to === squareName;
                  const glowColor = isWhite ? '#0f5a3a' : '#6f1733';
                  const isNeonBlind = gameRef.current.neonBlindnessColor === piece.color;
                  const displayPieceType = gameRef.current.trojanPawnSquare === squareName ? 'p' : piece.type;
                  const royalTexture = displayPieceType === piece.type && (piece.type === 'q' || piece.type === 'k') ? royalCatTextures[piece.type] : undefined;
                  const pieceVisual = royalTexture
                    ? scene.add.image(0, 0, royalTexture).setDisplaySize(tileSize * 1.22, tileSize * 1.22).setOrigin(0.5)
                    : scene.add.image(0, 0, `piece-${piece.color}-${displayPieceType}`).setDisplaySize(tileSize * 0.98, tileSize * 0.98).setOrigin(0.5);

                  // No permanent discs, no dimming - the board stays clean. Only the
                  // last move, a hint suggestion, and tapped-piece targets get marks.
                  if (!isInvisible) {
                    container.add(isNeonBlind ? [] : [pieceVisual]);
                  }

                  if (!isInvisible && isMovedPiece) {
                    const spotlight = scene.add.circle(0, 0, tileSize * 0.52, getGradeColor(gameRef.current.lastMove?.grade), 0.28);
                    container.addAt(spotlight, 0);
                    container.setScale(0.35).setAlpha(1);
                    scene.tweens.add({
                      targets: container,
                      scaleX: 1.22,
                      scaleY: 1.22,
                      alpha: 1,
                      duration: 220,
                      ease: 'Back.Out',
                      yoyo: true,
                      hold: 120,
                      onComplete: () => container.setScale(1),
                    });
                    scene.tweens.add({ targets: spotlight, alpha: 0.05, scale: 1.35, duration: 720, yoyo: true, repeat: 1 });
                  }
                  container.setInteractive(
                    new Phaser.Geom.Rectangle(-tileSize / 2, -tileSize / 2, tileSize, tileSize),
                    Phaser.Geom.Rectangle.Contains
                  );

                  scene.input.setDraggable(container);

                  container.on('dragstart', () => {
                    selectSquare(squareName, piece.color);
                  });

                  container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                    if (gameRef.current.selectedSquare === squareName) container.setPosition(dragX, dragY).setScale(1.13);
                  });

                  container.on('dragend', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                    if (gameRef.current.selectedSquare !== squareName) return;
                    const col = Math.floor((dragX - boardOffset) / tileSize);
                    const row = Math.floor((dragY - boardOffset) / tileSize);
                    const target = col >= 0 && col < 8 && row >= 0 && row < 8 ? files[col] + ranks[row] : '';
                    if (gameRef.current.legalTargets.includes(target)) playUserMove(squareName, target);
                    else {
                      gameRef.current.selectedSquare = null;
                      gameRef.current.legalTargets = [];
                      renderBoard();
                    }
                  });

                  container.on('pointerdown', () => {
                    if (gameRef.current.selectedSquare && gameRef.current.legalTargets.includes(squareName)) {
                      playUserMove(gameRef.current.selectedSquare, squareName);
                      return;
                    }

                    if (selectSquare(squareName, piece.color)) return;

                    gameRef.current.selectedSquare = null;
                    gameRef.current.legalTargets = [];
                    renderBoard();
                  });

                  pieceContainers[squareName] = container;
                }
              }
            }

          };

          scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const travel = Math.hypot(pointer.x - pointer.downX, pointer.y - pointer.downY);
            if (travel > 14) return;
            const col = Math.floor((pointer.worldX - boardOffset) / tileSize);
            const row = Math.floor((pointer.worldY - boardOffset) / tileSize);
            if (col < 0 || col > 7 || row < 0 || row > 7) return;
            const target = files[col] + ranks[row];
            if (gameRef.current.selectedSquare && gameRef.current.legalTargets.includes(target)) {
              playUserMove(gameRef.current.selectedSquare, target);
              return;
            }
            const targetPiece = gameRef.current.chess.get(target);
            if (targetPiece && selectSquare(target, targetPiece.color)) return;
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            renderBoard();
          });

          // Event listeners
          const handleLoadPuzzle = (e: any) => {
            if (e.detail?.mode !== mode) return;
            const coachingPosition = COACHING_POSITIONS[mode];
            gameRef.current.chess.load(e.detail?.fen || coachingPosition?.fen || new Chess().fen());
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            gameRef.current.lastMove = null;
            gameRef.current.openingAssessment = null;
            gameRef.current.isGameOver = false;
            gameRef.current.ply = 0;
            gameRef.current.principleStreak = 0;
            gameRef.current.playerQualities = [];
            gameRef.current.gradeHistory = [];
            gameRef.current.timeline = [{ fen: gameRef.current.chess.fen(), lastMove: null, san: 'Start' }];
            gameRef.current.jailedCounts = { w: 0, b: 0 };
            Object.values(jailGlyphLayers).forEach((layer) => layer.removeAll(true));
            publishPositionEvaluation(gameRef.current.chess.fen());

            const isCoaching = mode.startsWith('COACH_');
            window.dispatchEvent(
              new CustomEvent('dojo-banter', {
                detail: isCoaching
                  ? {
                      type: 'scenario',
                      isCoaching: true,
                      mode,
                      title: AI_TAGS[mode]?.title,
                      objective: coachingPosition?.briefing,
                      fen: gameRef.current.chess.fen(),
                    }
                  : {
                      type: 'summary',
                      message: `⚡ Arena loaded: ${AI_TAGS[mode]?.title}. The board is ready. The tension is REAL.`,
                    },
              })
            );
            renderBoard();
          };

          const handleStartDemo = (e: any) => {
            // Prevent overlapping demo runs from mutating shared game state concurrently
            if (demoIntervalRef.current) {
              clearInterval(demoIntervalRef.current);
              demoIntervalRef.current = null;
            }

            gameRef.current.chess.reset();
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            gameRef.current.lastMove = null;
            gameRef.current.openingAssessment = null;
            gameRef.current.isGameOver = false;
            gameRef.current.ply = 0;
            gameRef.current.principleStreak = 0;
            gameRef.current.playerQualities = [];
            gameRef.current.gradeHistory = [];
            gameRef.current.timeline = [{ fen: gameRef.current.chess.fen(), lastMove: null, san: 'Start' }];
            gameRef.current.jailedCounts = { w: 0, b: 0 };
            Object.values(jailGlyphLayers).forEach((layer) => layer.removeAll(true));

            const sequence = DEMO_SEQUENCES[mode] || [];
            let step = 0;

            window.dispatchEvent(
              new CustomEvent('dojo-banter', {
                detail: {
                  type: 'summary',
                  message: `🎬 CHESTER: Systems locked. Prepare for LIVE chess theatre. ${AI_TAGS[mode]?.title} is LEGENDARY.`,
                },
              })
            );

            const demoInterval = setInterval(() => {
              if (!phaserRef.current) {
                clearInterval(demoInterval);
                demoIntervalRef.current = null;
                return;
              }

              if (step >= sequence.length) {
                clearInterval(demoInterval);
                demoIntervalRef.current = null;
                gameRef.current.isGameOver = true;
                window.dispatchEvent(
                  new CustomEvent('dojo-banter', {
                    detail: {
                      type: 'summary',
                      message: `🏆 FINAL WHISTLE. The board just delivered HISTORY. ${AI_TAGS[mode]?.title} will be remembered forever.`,
                    },
                  })
                );
                window.dispatchEvent(new CustomEvent('demo-complete'));
                return;
              }

              const moveStr = sequence[step];
              let moveResult;
              const fenBeforeMove = gameRef.current.chess.fen();
              try {
                moveResult = gameRef.current.chess.move(moveStr);
              } catch (err) {
                console.warn('[DojoEngine] Invalid demo move, stopping sequence:', moveStr, err);
                clearInterval(demoInterval);
                demoIntervalRef.current = null;
                return;
              }

              if (moveResult) {
                const quality = classifyMove(fenBeforeMove, { from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
                gameRef.current.ply++;
                gameRef.current.lastMove = { from: moveResult.from, to: moveResult.to, grade: getLetterGrade(quality?.centipawnLoss) };
                gameRef.current.gradeHistory.push({ move: moveResult.san, player: step % 2 === 0 ? AI_TAGS[mode]?.player : AI_TAGS[mode]?.rival, ply: gameRef.current.ply, grade: getLetterGrade(quality?.centipawnLoss), centipawnLoss: quality?.centipawnLoss ?? null });
                gameRef.current.timeline.push({ fen: gameRef.current.chess.fen(), lastMove: gameRef.current.lastMove, san: moveResult.san });
                const playerName = step % 2 === 0 ? AI_TAGS[mode]?.player : AI_TAGS[mode]?.rival;
                evaluateAndPublishMove(moveResult, playerName, fenBeforeMove, quality);
                renderAfterCapture(moveResult);
              }

              step++;
            }, 3000);

            demoIntervalRef.current = demoInterval;
          };

          window.addEventListener('load-puzzle', handleLoadPuzzle);
          window.addEventListener('start-demo', handleStartDemo);
          const handleBrawlPosition = (event: any) => {
            const fen = event.detail?.fen;
            if (mode !== 'PVP_REMOTE' || !fen) return;
            try {
              gameRef.current.trojanPawnArmed = Boolean(event.detail?.trojanPawnArmed);
              gameRef.current.trojanPawnSquare = event.detail?.trojanPawnSquare || null;
              if (event.detail?.activeChaosEvent === 'MULLIGAN' && gameRef.current.lastChaosEvent !== 'MULLIGAN') flashHouseAdvantage();
              gameRef.current.lastChaosEvent = event.detail?.activeChaosEvent || null;
              if (gameRef.current.chess.fen() === fen) {
                renderBoard();
                return;
              }
              gameRef.current.chess.load(fen);
              gameRef.current.lastMove = null;
              gameRef.current.selectedSquare = null;
              gameRef.current.legalTargets = [];
              gameRef.current.timeline.push({ fen, lastMove: null, san: 'Opponent move' });
              renderBoard();
              publishPositionEvaluation(fen);
            } catch (error) {
              console.warn('[DojoEngine] Ignoring invalid Brawl room position:', error);
            }
          };
          window.addEventListener('brawl-position', handleBrawlPosition);
          const handleRemoteMove = (event: any) => {
            if (mode !== 'PVP_REMOTE') return;
            const { from, to, fen } = event.detail || {};
            if (from && to && gameRef.current.chess.turn() !== playerColor) {
              playUserMove(from, to, true);
              if (fen && gameRef.current.chess.fen() !== fen) {
                gameRef.current.chess.load(fen);
                publishPositionEvaluation(gameRef.current.chess.fen());
                renderBoard();
              }
            }
          };
          window.addEventListener('remote-chess-move', handleRemoteMove);
          const handleReplayStep = (event: any) => {
            if (!gameRef.current.isGameOver || !gameRef.current.timeline.length) return;
            const index = Math.max(0, Math.min(gameRef.current.timeline.length - 1, Number(event.detail?.index || 0)));
            const snapshot = gameRef.current.timeline[index];
            gameRef.current.chess.load(snapshot.fen);
            publishPositionEvaluation(snapshot.fen);
            gameRef.current.lastMove = snapshot.lastMove;
            window.dispatchEvent(new CustomEvent('replay-status', { detail: { index, total: gameRef.current.timeline.length, move: snapshot.san } }));
            renderBoard();
          };
          window.addEventListener('replay-step', handleReplayStep);
          const handleRequestResign = () => {
            if (gameRef.current.isGameOver) return;
            finishGame('🏳️ RESIGNATION — The board is conceded before the final blow lands.', 'resigned');
          };
          const handleHelpRequest = () => {
            const fen = gameRef.current.chess.fen();
            void getStockfishClient().analyzeForDisplay(fen).then((analysis: any) => {
              if (!analysis?.bestMove) return;
              const uci: string = analysis.bestMove;
              const phrase = describeMove(fen, uci);
              if (!phrase) return; // never show a hint that is not legal in this position
              gameRef.current.coachSuggestion = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
              renderBoard?.();
              window.dispatchEvent(new CustomEvent('chester-help-response', { detail: { fen, bestMove: uci, bestMovePhrase: phrase, continuation: analysis.pv || [], evaluation: analysis.mate ?? analysis.score ?? null } }));
            }).catch(() => {
              window.dispatchEvent(new CustomEvent('chester-help-response', { detail: { fen, bestMove: null } }));
            });
          };
          window.addEventListener('chester-help-request', handleHelpRequest);
          window.addEventListener('request-resign', handleRequestResign);
          const handleToggleBoardTheme = () => {
            gameRef.current.boardTheme = gameRef.current.boardTheme === 'RETRO' ? 'NEON' : 'RETRO';
            renderBoard();
          };
          window.addEventListener('toggle-board-theme', handleToggleBoardTheme);

          scene.events.once('destroy', () => {
            window.removeEventListener('load-puzzle', handleLoadPuzzle);
            window.removeEventListener('start-demo', handleStartDemo);
            window.removeEventListener('brawl-position', handleBrawlPosition);
            window.removeEventListener('remote-chess-move', handleRemoteMove);
            window.removeEventListener('replay-step', handleReplayStep);
            window.removeEventListener('chester-help-request', handleHelpRequest);
            window.removeEventListener('request-resign', handleRequestResign);
            window.removeEventListener('toggle-board-theme', handleToggleBoardTheme);
            if (demoIntervalRef.current) {
              clearInterval(demoIntervalRef.current);
              demoIntervalRef.current = null;
            }
          });

          const initialCoachingPosition = COACHING_POSITIONS[mode];
          if (initialCoachingPosition) gameRef.current.chess.load(initialCoachingPosition.fen);
          gameRef.current.timeline = [{ fen: gameRef.current.chess.fen(), lastMove: null, san: 'Start' }];
          publishPositionEvaluation(gameRef.current.chess.fen());
          renderBoard();
          loadRoyalCatTextures();
          const refreshRoyalCats = () => {
            Object.keys(royalCatTextures).forEach((pieceType) => {
              const textureKey = royalCatTextures[pieceType as 'q' | 'k'];
              if (textureKey) scene.textures.remove(textureKey);
              delete royalCatTextures[pieceType as 'q' | 'k'];
            });
            loadRoyalCatTextures();
            renderBoard();
          };
          window.addEventListener('royal-cats-updated', refreshRoyalCats);
          scene.events.once('destroy', () => window.removeEventListener('royal-cats-updated', refreshRoyalCats));
        },
      },
    };

    phaserRef.current = new Phaser.Game(config);

    return () => {
      disposeStockfishClient();
      containerRef.current?.querySelector('.dojo-board__spotlights')?.remove();
      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
    };
  }, [mode, playerColor]);

  return <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} />;
}
