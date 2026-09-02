import type { BrawlDifficulty, ChaosEvent } from '@/components/EngineEvaluationProvider';

type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | null;

export function checkChaosTriggers(
  fen: string,
  evalScore: number | string | null,
  lastMoveQuality: MoveQuality,
  p1Difficulty: BrawlDifficulty,
  p2Difficulty: BrawlDifficulty,
): ChaosEvent {
  if (!fen) return null;
  const numericScore = typeof evalScore === 'number' ? evalScore : null;
  if (p2Difficulty === 'EXPERT' && numericScore !== null && numericScore < -3) return 'TROJAN_PAWN';
  if (p1Difficulty === 'BEGINNER' && lastMoveQuality === 'blunder') return 'MULLIGAN';
  return null;
}