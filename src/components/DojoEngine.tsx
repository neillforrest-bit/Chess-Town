// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Chess } from 'chess.js';
import { disposeStockfishClient, getStockfishClient } from '@/lib/stockfish';
import { checkChaosTriggers } from '@/lib/ChaosEngine';
import { useBrawlState } from '@/components/EngineEvaluationProvider';

const PIECE_GLYPHS: Record<string, Record<string, string>> = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
};

const DEMO_SEQUENCES: Record<string, string[]> = {
  SIMULATION: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
  '2V2': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6'],
};

const BOARD_THEMES = {
  NEON: [0xf2f7f8, 0x07090a],
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

function getPostGameReport(chess: any, qualities: { label: string; move: string; ply: number }[]) {
  const qualityScores: Record<string, number> = { BEST: 100, GREAT: 90, GOOD: 78, INACCURACY: 58, MISTAKE: 35, BLUNDER: 10 };
  const accuracy = qualities.length
    ? Math.round(qualities.reduce((total, quality) => total + (qualityScores[quality.label] || 50), 0) / qualities.length)
    : 50;
  const checklist = getOpeningChecklist(chess);
  const development = Math.min(100, checklist.minorsDeveloped * 18 + (checklist.centerClaimed ? 28 : 0));
  const kingSafety = checklist.castled ? 95 : 48;
  const tactics = Math.min(100, 45 + chess.history({ verbose: true }).filter((move: any) => move.color === 'w' && move.captured).length * 18);
  const score = Math.round(accuracy * 0.45 + development * 0.25 + kingSafety * 0.15 + tactics * 0.15);
  const grade = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  const turningPoint = [...qualities].sort((left, right) => (qualityScores[left.label] || 50) - (qualityScores[right.label] || 50))[0];
  return { grade, score, accuracy, development, kingSafety, tactics, openingName: getOpeningName(chess), moves: chess.history().length, turningPoint: turningPoint ? `${turningPoint.move} (${turningPoint.label})` : 'No decisive turning point' };
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
const AI_RESPONSE_DELAY_MS = 300;

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
  if (centipawnLoss <= 5) label = 'BEST';
  else if (centipawnLoss <= 25) label = 'GREAT';
  else if (centipawnLoss <= 60) label = 'GOOD';
  else if (centipawnLoss <= 120) label = 'INACCURACY';
  else if (centipawnLoss <= 300) label = 'MISTAKE';
  else label = 'BLUNDER';

  return { label, centipawnLoss };
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

export default function DojoEngine({ mode = 'STANDBY', playerColor = null, difficulty = 'INTERMEDIATE' }: { mode?: string; playerColor?: 'w' | 'b' | null; difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'CASUAL' | 'PRO' }) {
  const { p1Difficulty, p2Difficulty, setActiveChaosEvent } = useBrawlState();
  const containerRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRef = useRef<any>({
    chess: new Chess(),
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    openingAssessment: null,
    principleStreak: 0,
    playerQualities: [],
    timeline: [],
    isGameOver: false,
    ply: 0,
    boardTheme: 'NEON',
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

          const jailX = 716;
          const jailY = 16;
          const jailPanel = scene.add.rectangle(jailX, jailY, 136, 24, 0x240019, 0.95)
            .setStrokeStyle(2, 0xff007f, 0.9)
            .setDepth(20);
          const jailLabel = scene.add.text(jailX, jailY, 'PIECE JAIL', {
            fontFamily: 'sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffb6dc',
          }).setOrigin(0.5).setDepth(21);
          const greenJailX = 84;
          scene.add.rectangle(greenJailX, jailY, 136, 24, 0x08200d, 0.95).setStrokeStyle(2, 0x39ff14, 0.9).setDepth(20);
          scene.add.text(greenJailX, jailY, 'GREEN JAIL', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#dfffda' }).setOrigin(0.5).setDepth(21);

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
            const targetColor = capturedIsWhite ? 0x39ff14 : 0xff007f;
            const targetY = jailY + 28;
            const impact = scene.add.circle(capturedPiece.x, capturedPiece.y, tileSize * 0.42, targetColor, 0.45).setDepth(29);
            scene.tweens.add({ targets: impact, scale: 1.8, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => impact.destroy() });

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

          const publishMove = (move: any, player: string, quality: { label: string; centipawnLoss: number } | null, engineTelemetry: any = null) => {
            const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
            window.dispatchEvent(new CustomEvent('dojo-banter', {
              detail: {
                type: 'move', ply: gameRef.current.ply, player, move: move.san,
                from: move.from, to: move.to, piece: move.piece, captured: move.captured || null,
                  royalCatMove: move.piece === 'q' || move.piece === 'k',
                  royalCatName: move.piece === 'q' ? 'Marley' : move.piece === 'k' ? 'Dilly' : null,
                fen: engineTelemetry?.fenAfter || gameRef.current.chess.fen(), matchup: isBrawl ? 'The Backroom Brawl' : AI_TAGS[mode]?.title, context: `${mode} matchup`,
                quality: quality?.label || null, centipawnLoss: quality?.centipawnLoss ?? null,
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
              },
            }));
          };

          const publishPositionEvaluation = (fen: string) => {
            void getStockfishClient().analyzePosition(fen, getChesterDifficulty(difficulty)).then((analysis) => {
              window.dispatchEvent(new CustomEvent('engine-evaluation', {
                detail: {
                  fen,
                  evalScore: analysis.mate === null ? (analysis.score === null ? null : analysis.score / 100) : `M${analysis.mate}`,
                  bestMove: { uci: analysis.bestMove, san: analysis.pv[0] || null },
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

          const evaluateAndPublishMove = (move: any, player: string, fenBeforeMove: string, localQuality: { label: string; centipawnLoss: number } | null) => {
            const fenAfterMove = gameRef.current.chess.fen();
            const uci = `${move.from}${move.to}${move.promotion || ''}`;
            void getStockfishClient().evaluateMove({
              fenBefore: fenBeforeMove,
              fenAfter: fenAfterMove,
              san: move.san,
              uci,
              playerColor: move.color,
              difficulty: getChesterDifficulty(difficulty),
            }).then((telemetry) => {
              const quality = { label: telemetry.classification === 'BRILLIANT' ? 'BEST' : telemetry.classification, centipawnLoss: telemetry.evalDelta ?? localQuality?.centipawnLoss ?? 0 };
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
              window.dispatchEvent(new CustomEvent('dojo-engine-telemetry', { detail: telemetry }));
              window.dispatchEvent(new CustomEvent('engine-evaluation', {
                detail: {
                  fen: telemetry.fenAfter,
                  evalScore: telemetry.evalScore,
                  bestMove: { uci: telemetry.bestMove, san: telemetry.bestMoveSan },
                  evalDelta: telemetry.evalDelta,
                  moveQuality: telemetry.moveQuality,
                },
              }));
              publishMove(move, player, quality, telemetry);
              if (chaosEvent) {
                window.dispatchEvent(new CustomEvent('dojo-banter', {
                  detail: { type: 'move', move: move.san, player, fen: gameRef.current.chess.fen(), quality: quality.label, engineTelemetry: telemetry, activeChaosEvent: chaosEvent, matchup: 'The Backroom Brawl', instruction: chaosEvent === 'MULLIGAN' ? 'Reply exactly: Oops, slip of the finger. The house grants the underdog another go.' : 'Reply exactly: Chester was getting too comfortable. One of his pieces is now disguised as a pawn. Good luck, Expert.' },
                }));
              }
            }).catch(() => {
              publishMove(move, player, localQuality);
            });
          };

          const finishGame = (message: string, result: 'checkmate' | 'draw' | 'resigned' = 'draw') => {
            gameRef.current.isGameOver = true;
            const pgn = gameRef.current.chess.pgn();
            window.dispatchEvent(new CustomEvent('game-report', { detail: getPostGameReport(gameRef.current.chess, gameRef.current.playerQualities) }));
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
              const aiMove = engineMove
                ? { from: engineMove.slice(0, 2), to: engineMove.slice(2, 4), promotion: engineMove.slice(4, 5) || undefined }
                : pickBestMove(gameRef.current.chess, searchD);
              const result = gameRef.current.chess.move({ from: aiMove.from, to: aiMove.to, promotion: 'q' });
              const isBrawl = mode === 'UNDERDOG' || (mode === 'PVP_REMOTE' && new URLSearchParams(window.location.search).get('brawl') === '1');
              if (isBrawl && result.color === 'b' && gameRef.current.trojanPawnArmed && !gameRef.current.trojanPawnSquare) {
                gameRef.current.trojanPawnSquare = chooseTrojanPawnSquare('b');
                gameRef.current.trojanPawnArmed = false;
                gameRef.current.pendingChaosEvent = 'TROJAN_PAWN';
              }
              const quality = classifyMove(fenBeforeMove, { from: result.from, to: result.to, promotion: result.promotion }, AI_SEARCH_DEPTH);
              emitCapture(result);
              gameRef.current.ply++;
              gameRef.current.lastMove = { from: result.from, to: result.to };
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
            emitCapture(moveResult);
            gameRef.current.ply++;
            gameRef.current.lastMove = { from, to };
            gameRef.current.timeline.push({ fen: gameRef.current.chess.fen(), lastMove: gameRef.current.lastMove, san: moveResult.san });
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            const playerName = mode === 'PVP_LOCAL' || mode === 'PVP_REMOTE'
              ? (moveResult.color === 'w' ? AI_TAGS[mode].player : AI_TAGS[mode].rival)
              : AI_TAGS[mode]?.player || 'Neill';
            if (mode === 'PVP_REMOTE' && !isRemote) {
              window.dispatchEvent(new CustomEvent('local-chess-move', { detail: { from, to, fen: gameRef.current.chess.fen() } }));
            }

            requestAnimationFrame(() => {
              const quality = classifyMove(fenBeforeMove, { from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion }, AI_SEARCH_DEPTH);
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
            if (!isRemote) playAiTurn(moveResult.captured ? 850 : AI_RESPONSE_DELAY_MS);
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
                graphics.fillStyle(squareColor, gameRef.current.lastMove && !isMoveSpotlight ? 0.52 : 1);
                graphics.fillRect(
                  boardOffset + col * tileSize,
                  boardOffset + row * tileSize,
                  tileSize,
                  tileSize
                );
                graphics.lineStyle(1.5, 0x00ffff, 0.2);
                graphics.strokeRect(
                  boardOffset + col * tileSize,
                  boardOffset + row * tileSize,
                  tileSize,
                  tileSize
                );
                if (isMoveSpotlight) {
                  const spotlight = scene.add.circle(
                    boardOffset + col * tileSize + tileSize / 2,
                    boardOffset + row * tileSize + tileSize / 2,
                    tileSize * 0.55,
                    squareName === gameRef.current.lastMove.to ? 0xffea00 : 0x00ffff,
                    0.38
                  ).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
                  scene.tweens.add({ targets: spotlight, alpha: 0.14, scale: 1.18, duration: 620, ease: 'Sine.InOut', yoyo: true, repeat: 1, onComplete: () => spotlight.destroy() });
                  graphics.lineStyle(3, squareName === gameRef.current.lastMove.to ? 0xffea00 : 0x00ffff, 0.9);
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
                    const highlight = scene.add.circle(0, 0, tileSize * 0.45, 0xffea00, 0.4);
                    container.add(highlight);
                  }

                  const isWhite = piece.color === 'w';
                  const isMovedPiece = !isLastMoveInvisible && gameRef.current.lastMove?.to === squareName;
                  const glowColor = isWhite ? '#39ff14' : '#ff007f';
                  const isNeonBlind = gameRef.current.neonBlindnessColor === piece.color;
                  const displayPieceType = gameRef.current.trojanPawnSquare === squareName ? 'p' : piece.type;
                  const royalTexture = displayPieceType === piece.type && (piece.type === 'q' || piece.type === 'k') ? royalCatTextures[piece.type] : undefined;
                  const pieceVisual = royalTexture
                    ? scene.add.image(0, 0, royalTexture).setDisplaySize(tileSize * 1.22, tileSize * 1.22).setOrigin(0.5)
                    : scene.add.text(0, 0, PIECE_GLYPHS[piece.color][displayPieceType], {
                      fontFamily: 'Georgia, Times New Roman, serif',
                      fontSize: '88px',
                      fontStyle: 'bold',
                      color: isWhite ? '#dfffda' : '#ff4eb1',
                      stroke: '#050008',
                      strokeThickness: 7,
                      shadow: { blur: 34, color: glowColor, fill: true, offsetX: 0, offsetY: 0 },
                    }).setOrigin(0.5);

                  const glowColorNumber = isWhite ? 0x39ff14 : 0xff007f;
                  const glow = scene.add.circle(0, 0, tileSize * 0.44, glowColorNumber, 0.28);
                  
                  if (!isInvisible) {
                    container.add(isNeonBlind ? [glow] : [glow, pieceVisual]);
                    if (gameRef.current.lastMove && !isMovedPiece) container.setAlpha(0.42);
                  }

                  if (!isInvisible && isMovedPiece) {
                    const spotlight = scene.add.circle(0, 0, tileSize * 0.52, 0xffea00, 0.28);
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
            gameRef.current.chess.load(coachingPosition?.fen || new Chess().fen());
            gameRef.current.selectedSquare = null;
            gameRef.current.legalTargets = [];
            gameRef.current.lastMove = null;
            gameRef.current.openingAssessment = null;
            gameRef.current.isGameOver = false;
            gameRef.current.ply = 0;
            gameRef.current.principleStreak = 0;
            gameRef.current.playerQualities = [];
            gameRef.current.timeline = [{ fen: gameRef.current.chess.fen(), lastMove: null, san: 'Start' }];
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
            gameRef.current.timeline = [{ fen: gameRef.current.chess.fen(), lastMove: null, san: 'Start' }];

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
                emitCapture(moveResult);
                gameRef.current.ply++;
                gameRef.current.lastMove = { from: moveResult.from, to: moveResult.to };
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
