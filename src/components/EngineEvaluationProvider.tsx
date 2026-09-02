'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type BrawlDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
export type ChaosEvent = 'NEON_BLINDNESS' | 'MULLIGAN' | 'TROJAN_PAWN' | null;

export type EngineEvaluation = {
  fen: string;
  evalScore: number | string | null;
  bestMove: { uci: string | null; san: string | null };
  evalDelta: number | null;
  moveQuality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | null;
};

const EngineEvaluationContext = createContext<EngineEvaluation | null>(null);

type BrawlState = {
  p1Difficulty: BrawlDifficulty;
  p2Difficulty: BrawlDifficulty;
  activeChaosEvent: ChaosEvent;
  setP1Difficulty: (difficulty: BrawlDifficulty) => void;
  setP2Difficulty: (difficulty: BrawlDifficulty) => void;
  setActiveChaosEvent: (event: ChaosEvent) => void;
};

const BrawlContext = createContext<BrawlState | null>(null);

export function EngineEvaluationProvider({ children }: { children: React.ReactNode }) {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [p1Difficulty, setP1Difficulty] = useState<BrawlDifficulty>('INTERMEDIATE');
  const [p2Difficulty, setP2Difficulty] = useState<BrawlDifficulty>('INTERMEDIATE');
  const [activeChaosEvent, setActiveChaosEvent] = useState<ChaosEvent>(null);

  useEffect(() => {
    const updateEvaluation = (event: Event) => setEvaluation((event as CustomEvent<EngineEvaluation>).detail);
    window.addEventListener('engine-evaluation', updateEvaluation);
    return () => window.removeEventListener('engine-evaluation', updateEvaluation);
  }, []);

  return (
    <EngineEvaluationContext.Provider value={evaluation}>
      <BrawlContext.Provider value={{ p1Difficulty, p2Difficulty, activeChaosEvent, setP1Difficulty, setP2Difficulty, setActiveChaosEvent }}>
        {children}
      </BrawlContext.Provider>
    </EngineEvaluationContext.Provider>
  );
}

export function useEngineEvaluation() {
  return useContext(EngineEvaluationContext);
}

export function useBrawlState() {
  const state = useContext(BrawlContext);
  if (!state) throw new Error('useBrawlState must be used inside EngineEvaluationProvider');
  return state;
}