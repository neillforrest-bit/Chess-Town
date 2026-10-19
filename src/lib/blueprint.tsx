'use client';
// BlueprintManager (his PRD: React Context Provider - JSON sequence, state
// tracking, Audible abort logic). Listens to the engine's move events, matches
// SANs, drives ghost/pulse marks + the amber abort flash via window events.
// Authoritative state lives in refs (StrictMode-safe); useState mirrors for render.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ARMORY, type ArmoryOpening } from './armory';

export type BPStatus = 'idle' | 'guiding' | 'aborted' | 'complete';
export type BPLine = { text: string; kind: 'why' | 'handoff' | 'abort'; step: number; total: number } | null;
type Ctx = {
  opening: ArmoryOpening | null; status: BPStatus; step: number; line: BPLine;
  arm: (id: string) => void; disarm: () => void; onPosition: (fen: string) => void;
};
const BlueprintCtx = createContext<Ctx>({ opening: null, status: 'idle', step: 0, line: null, arm: () => {}, disarm: () => {}, onPosition: () => {} });
export const useBlueprint = () => useContext(BlueprintCtx);

function markFor(opening: ArmoryOpening, stepIdx: number, fen: string) {
  const step = opening.steps[stepIdx]; if (!step) return;
  try {
    const c = new Chess(fen); const m = c.move(step.san); if (!m) return;
    window.dispatchEvent(new CustomEvent('blueprint-mark', { detail: { from: m.from, to: m.to, piece: m.color + m.piece, colorNum: opening.colorNum } }));
  } catch { /* not legal right now - the foe-abort path handles it */ }
}
const clearMarks = () => window.dispatchEvent(new CustomEvent('blueprint-clear'));

export function BlueprintProvider({ children }: { children: React.ReactNode }) {
  const [opening, setOpening] = useState<ArmoryOpening | null>(null);
  const [status, setStatus] = useState<BPStatus>('idle');
  const [step, setStep] = useState(0);
  const [line, setLine] = useState<BPLine>(null);
  const g = useRef({ chess: new Chess(), lastFen: null as string | null });
  const s = useRef({ opening: null as ArmoryOpening | null, status: 'idle' as BPStatus, step: 0 });

  const publish = useCallback((line: BPLine) => {
    setOpening(s.current.opening); setStatus(s.current.status); setStep(s.current.step); setLine(line);
  }, []);
  const abort = useCallback((byUser: boolean) => {
    const op = s.current.opening; if (!op) return;
    s.current = { ...s.current, status: 'aborted' };
    clearMarks(); window.dispatchEvent(new CustomEvent('blueprint-flash'));
    publish({ text: byUser ? op.abortUser : op.abortFoe, kind: 'abort', step: s.current.step, total: op.steps.length });
  }, [publish]);
  const arm = useCallback((id: string) => {
    const o = ARMORY.find((x) => x.id === id); if (!o) return;
    g.current = { chess: new Chess(), lastFen: null };
    s.current = { opening: o, status: 'guiding', step: 0 };
    publish({ text: o.steps[0].why, kind: 'why', step: 0, total: o.steps.length });
    markFor(o, 0, g.current.chess.fen());
  }, [publish]);
  const disarm = useCallback(() => {
    s.current = { opening: null, status: 'idle', step: 0 };
    clearMarks(); publish(null);
  }, [publish]);
  const onPosition = useCallback((fen: string) => {
    if (fen === g.current.lastFen) return; const prevFen = g.current.lastFen; g.current.lastFen = fen;
    const op = s.current.opening;
    const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (op && s.current.status !== 'guiding' && fen === START && prevFen !== START) { // a fresh game began: re-arm automatically
      g.current.chess = new Chess(); s.current = { opening: op, status: 'guiding', step: 0 };
      publish({ text: op.steps[0].why, kind: 'why', step: 0, total: op.steps.length }); markFor(op, 0, fen); return;
    }
    if (!op || s.current.status !== 'guiding') { try { g.current.chess = new Chess(fen); } catch { /* resync */ } return; }
    const sp = s.current.step;
    let played: string | null = null; const mover = g.current.chess.turn();
    try { for (const cand of g.current.chess.moves()) { const t = new Chess(g.current.chess.fen()); t.move(cand); if (t.fen() === fen) { played = cand; break; } } } catch { /* ignore */ }
    if (played === null) { try { g.current.chess = new Chess(fen); } catch { /* resync (rewind/load): keep guiding */ } markFor(op, sp, fen); return; }
    g.current.chess = new Chess(fen);
    if (mover === 'w') {
      if (played !== op.steps[sp].san) { abort(true); return; }
      const next = sp + 1;
      if (next >= op.steps.length) {
        s.current = { ...s.current, status: 'complete' };
        clearMarks(); publish({ text: op.handoff, kind: 'handoff', step: next, total: op.steps.length });
        return;
      }
      s.current = { ...s.current, step: next };
      publish({ text: op.steps[next].why, kind: 'why', step: next, total: op.steps.length });
      return; // mark for the next step is dispatched after the opponent replies (position may make it illegal)
    }
    const exp = op.steps[sp].expectedOpponentSAN;
    if (exp !== 'any' && played !== exp) { abort(false); return; }
    try { const t = new Chess(fen); t.move(op.steps[sp].san); } catch { abort(false); return; } // blueprint move no longer legal
    markFor(op, sp, fen); // still on script: point at the next guided move
  }, [abort, publish]);
  return <BlueprintCtx.Provider value={{ opening, status, step, line, arm, disarm, onPosition }}>{children}</BlueprintCtx.Provider>;
}
