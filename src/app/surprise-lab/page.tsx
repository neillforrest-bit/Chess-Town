'use client';
// SURPRISE LAB (BUILD 196) - fully guided, move-by-move lessons in unusual openings
// (his 7 Nov 01:53 ask). Correction-with-rewind that names the actual mistake,
// engine-best scripted replies, honest machine reads on every card, INTERACTIVE
// strong-reply branches (the alternative is played on the board and the user must
// find the engine-verified answer), prompt-free rehearsal vs bundled Stockfish at
// club-plus strength. Zero AI spend: hand-authored Chester copy + local engine.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { ChesterAvatar } from '@/components/ChesterUI';
import { LAB_OPENINGS, loadLabProgress, saveLabProgress, type LabOpening } from '@/lib/surprise-lab';
import { getStockfishClient } from '@/lib/stockfish';

type Phase = 'shelf' | 'intro' | 'lesson' | 'handoff' | 'rehearsal';

export default function SurpriseLab() {
  const [phase, setPhase] = useState<Phase>('shelf');
  const [opening, setOpening] = useState<LabOpening | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [awaiting, setAwaiting] = useState<'user' | 'opp'>('user');
  const [line, setLine] = useState('');
  const [correction, setCorrection] = useState<string | null>(null);
  const [hintOn, setHintOn] = useState(true);
  const [progress, setProgress] = useState(loadLabProgress);
  const [engineBusy, setEngineBusy] = useState(false);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [detour, setDetour] = useState<{ savedFen: string; savedLast: { from: string; to: string } | null; replyWhy: string; answerSan: string; answerWhy: string; answerHint: string; stage: 'anim' | 'answer' | 'done' } | null>(null);
  const chessRef = useRef(new Chess());
  const timers = useRef<number[]>([]);
  const genRef = useRef(0); // cancels stale engine replies after reset/rematch

  useEffect(() => () => { timers.current.forEach(clearTimeout); genRef.current++; }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const mark = (id: string, patch: { lessonDone?: boolean; rehearsed?: boolean }) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      saveLabProgress(next);
      return next;
    });
  };

  const startLesson = useCallback((o: LabOpening) => {
    genRef.current++;
    const c = new Chess();
    for (const san of o.setupSan || []) c.move(san);
    chessRef.current = c;
    setOpening(o); setFen(c.fen()); setLastMove(null);
    setStepIdx(0); setAwaiting('user'); setCorrection(null); setGameOver(null); setHintOn(true); setDetour(null);
    const firstWhy = o.steps[0].why;
    setLine(o.setupWhy ? `${o.setupWhy} ${firstWhy}` : firstWhy);
    setPhase('lesson');
  }, []);

  const hintFor = (o: LabOpening, idx: number): { from: string; to: string } | null => {
    if (idx >= o.steps.length) return null;
    try { const t = new Chess(chessRef.current.fen()); const m = t.move(o.steps[idx].san); return m ? { from: m.from, to: m.to } : null; } catch { return null; }
  };

  const finishLesson = useCallback((o: LabOpening) => {
    mark(o.id, { lessonDone: true });
    setLine(o.handoff);
    setPhase('handoff');
  }, []);

  const onLessonMove = useCallback((from: string, to: string) => {
    if (!opening || awaiting !== 'user') return;
    const c = chessRef.current;
    const step = opening.steps[stepIdx];
    if (detour) {
      if (detour.stage !== 'answer') return;
      let ans = null as ReturnType<Chess['move']> | null;
      try { ans = c.move({ from, to, promotion: 'q' }); } catch { return; }
      if (!ans) return;
      if (ans.san !== detour.answerSan) {
        c.undo();
        setFen(c.fen());
        setCorrection(`Not that one - ${detour.answerHint}`);
        return;
      }
      setCorrection(null);
      setFen(c.fen()); setLastMove({ from, to });
      setLine(detour.answerWhy);
      setDetour({ ...detour, stage: 'done' });
      return;
    }
    let played = null as ReturnType<Chess['move']> | null;
    try { played = c.move({ from, to, promotion: 'q' }); } catch { return; }
    if (!played) return;
    if (played.san !== step.san) {
      c.undo();
      setFen(c.fen()); // snap the board back - correction, never abort
      setCorrection(`That is a different plan. This plan: ${step.mistake || step.why}`);
      return;
    }
    setCorrection(null);
    setFen(c.fen()); setLastMove({ from, to });
    if (!step.replySan) { finishLesson(opening); return; } // lesson ends on the user's move
    setAwaiting('opp');
    setLine(step.replyWhy || '');
    const gen = genRef.current;
    later(() => {
      if (gen !== genRef.current) return;
      try { const rm = c.move(step.replySan!); setFen(c.fen()); setLastMove({ from: rm.from, to: rm.to }); } catch { /* resync */ }
      const next = stepIdx + 1;
      if (next >= opening.steps.length) { finishLesson(opening); return; }
      setStepIdx(next);
      setLine(opening.steps[next].why);
      setAwaiting('user');
    }, 1400);
  }, [opening, awaiting, stepIdx, finishLesson, detour]);

  const startDetour = useCallback(() => {
    if (!opening || awaiting !== 'user' || detour) return;
    const bl = opening.steps[stepIdx].branchLine;
    if (!bl) return;
    const c = chessRef.current;
    const savedFen = c.fen();
    const savedLast = lastMove;
    setCorrection(null);
    try { const m1 = c.move(opening.steps[stepIdx].san); setFen(c.fen()); setLastMove({ from: m1.from, to: m1.to }); } catch { return; }
    setDetour({ savedFen, savedLast, replyWhy: bl.replyWhy, answerSan: bl.answerSan, answerWhy: bl.answerWhy, answerHint: bl.answerHint, stage: 'anim' });
    setLine('Watch - ' + bl.replyWhy);
    const gen = genRef.current;
    later(() => {
      if (gen !== genRef.current) return;
      try { const m2 = c.move(bl.replySan); setFen(c.fen()); setLastMove({ from: m2.from, to: m2.to }); } catch { /* resync */ }
      setDetour((d) => (d ? { ...d, stage: 'answer' } : d));
      setLine(bl.replyWhy + ' Your answer?');
    }, 1400);
  }, [opening, awaiting, stepIdx, detour, lastMove]);

  const endDetour = useCallback(() => {
    if (!detour || !opening) return;
    const c = chessRef.current;
    try { c.load(detour.savedFen); } catch { /* resync */ }
    setFen(c.fen()); setLastMove(detour.savedLast);
    setDetour(null); setCorrection(null);
    setLine(opening.steps[stepIdx].why);
  }, [detour, opening, stepIdx]);

  const startRehearsal = useCallback(() => {
    if (!opening) return;
    genRef.current++;
    setPhase('rehearsal'); setGameOver(null); setCorrection(null);
    if (opening.rehearsalPlies != null) {
      // Replay only the honest starting point (e.g. Englund: the moment BEFORE White's trap-losing move).
      const c = new Chess();
      const seq: string[] = [...(opening.setupSan || [])];
      opening.steps.forEach((st) => { seq.push(st.san); if (st.replySan) seq.push(st.replySan); });
      for (const san of seq.slice(0, opening.rehearsalPlies)) { try { c.move(san); } catch { /* keep last good */ } }
      chessRef.current = c;
      setLastMove(null);
    }
    const c = chessRef.current;
    setFen(c.fen());
    if (c.turn() !== opening.side) {
      setEngineBusy(true); setLine('My move...');
      const gen = genRef.current;
      getStockfishClient().selectMove(c.fen(), 'ADVANCED').then((uci) => {
        if (gen !== genRef.current || !uci) { setEngineBusy(false); return; }
        try { const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); setFen(c.fen()); setLastMove({ from: m.from, to: m.to }); } catch { /* resync */ }
        setEngineBusy(false); setLine('Your move. No hints now - play the plan. I am not going easy.');
      }).catch(() => { setEngineBusy(false); setLine('Your move. No hints now - play the plan. I am not going easy.'); });
    } else {
      setLine('Your move. No hints now - play the plan.');
    }
  }, [opening]);

  const onRehearsalMove = useCallback((from: string, to: string) => {
    if (!opening || engineBusy || gameOver) return;
    const c = chessRef.current;
    let played = null as ReturnType<Chess['move']> | null;
    try { played = c.move({ from, to, promotion: 'q' }); } catch { return; }
    if (!played) return;
    setFen(c.fen()); setLastMove({ from, to });
    if (c.isGameOver()) {
      const userMated = c.isCheckmate() && c.turn() !== opening.side;
      const drawn = c.isDraw() || c.isStalemate() || c.isThreefoldRepetition() || c.isInsufficientMaterial();
      const text = userMated ? 'Checkmate - you converted it. That opening is yours now.' : drawn ? "Drawn. You took them out of the books and held your own - that's the opening doing its job." : 'Checkmate... I got you this time. Run the rehearsal back - the plan was sound.';
      setGameOver(text); mark(opening.id, { rehearsed: true }); setLine(text);
      return;
    }
    setEngineBusy(true); setLine('...');
    const gen = genRef.current;
    getStockfishClient().selectMove(c.fen(), 'ADVANCED').then((uci) => {
      if (gen !== genRef.current) return;
      if (!uci) { setEngineBusy(false); return; }
      try { const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); setFen(c.fen()); setLastMove({ from: m.from, to: m.to }); } catch { /* resync */ }
      setEngineBusy(false); setLine('Your move.');
      if (c.isGameOver()) {
        const oppMated = c.isCheckmate();
        const text = oppMated ? 'Checkmate... I got you this time. Run the rehearsal back - the plan was sound.' : "Drawn. You took them out of the books and held your own - that's the opening doing its job.";
        setGameOver(text); mark(opening.id, { rehearsed: true }); setLine(text);
      }
    }).catch(() => setEngineBusy(false));
  }, [opening, engineBusy, gameOver]);

  // ----- SHELF -----
  if (phase === 'shelf') {
    const tiers: LabOpening['tier'][] = ['SOUND SURPRISE', 'AMBUSH'];
    return <main className="lab-shell">
      <div className="lab-head"><h1>⚡ SURPRISE LAB</h1><Link href="/play-chester">← PLAY CHESTER</Link></div>
      <div className="lab-panel"><div className="lab-speaker"><ChesterAvatar isThinking={false} size="small" /><p>
        Welcome to the lab, Forrest. Rare openings with real points - positions that pull a game off the memorised highways. I'll walk you through every move, show you the strongest replies, then hand you the board with no hints. Pick your weapon.
      </p></div></div>
      {tiers.map((tier) => <div key={tier}>
        <p className="lab-tier">{tier === 'AMBUSH' ? '⚠ THE AMBUSH SHELF - fun, not sound, card says so' : 'THE SOUND SHELF - playable even when they know it'}</p>
        {LAB_OPENINGS.filter((o) => o.tier === tier).map((o) => {
          const p = progress[o.id];
          return <button key={o.id} className="lab-card" style={{ '--lc': o.color } as React.CSSProperties} onClick={() => { setOpening(o); setPhase('intro'); }}>
            <small>{o.side === 'w' ? 'PLAYING WHITE' : 'PLAYING BLACK'} · {o.steps.length} GUIDED MOVES</small>
            <b>{o.name}</b>
            <span>{o.blurb}</span>
            <span className="lab-read">{o.engineRead}</span>
            {p?.lessonDone && <span className="lab-meta">✓ LESSON DONE{p?.rehearsed ? ' · ✓ REHEARSED' : ''}</span>}
          </button>;
        })}
      </div>)}
    </main>;
  }

  if (!opening) return null;
  const step = opening.steps[Math.min(stepIdx, opening.steps.length - 1)];

  // ----- INTRO -----
  if (phase === 'intro') {
    return <main className="lab-shell">
      <div className="lab-head"><h1 style={{ color: opening.color }}>{opening.name.toUpperCase()}</h1><button className="lab-btn lab-btn--ghost" style={{ flex: '0 0 auto', minWidth: 0 }} onClick={() => setPhase('shelf')}>← LAB</button></div>
      <div className="lab-panel"><div className="lab-speaker"><ChesterAvatar isThinking={false} size="small" /><p>{opening.intro}</p></div></div>
      <div className="lab-branch">Honest card: {opening.engineRead}</div>
      <p className="lab-step-label">{opening.side === 'w' ? 'YOU PLAY WHITE' : 'YOU PLAY BLACK'} · {opening.steps.length} GUIDED MOVES · SLIP AND WE REWIND, NEVER RESTART</p>
      <div className="lab-controls"><button className="lab-btn lab-btn--go" onClick={() => startLesson(opening)}>START THE LESSON →</button></div>
    </main>;
  }

  // ----- LESSON / HANDOFF / REHEARSAL -----
  const inLesson = phase === 'lesson';
  const inRehearsal = phase === 'rehearsal';
  const hint = inLesson && hintOn && awaiting === 'user' && !detour ? hintFor(opening, stepIdx) : null;
  return <main className="lab-shell">
    <div className="lab-head"><h1 style={{ color: opening.color }}>{opening.name.toUpperCase()}</h1><button className="lab-btn lab-btn--ghost" style={{ flex: '0 0 auto', minWidth: 0 }} onClick={() => setPhase('shelf')}>← LAB</button></div>
    {inLesson && <div className="lab-progress">{opening.steps.map((_, i) => <i key={i} className={i < stepIdx ? 'is-done' : i === stepIdx ? 'is-now' : ''} />)}</div>}
    <p className="lab-step-label">{detour ? (detour.stage === 'answer' ? 'THEIR STRONGEST OPTION · FIND YOUR ANSWER' : detour.stage === 'done' ? 'THAT IS THE ANSWER' : 'THEIR STRONGEST OPTION...') : inLesson ? `MOVE ${stepIdx + 1} OF ${opening.steps.length} · ${awaiting === 'user' ? 'YOUR MOVE' : 'CHESTER REPLIES...'}` : inRehearsal ? `REHEARSAL · ${gameOver ? 'GAME OVER' : engineBusy ? 'CHESTER IS THINKING...' : 'NO HINTS'}` : 'LESSON COMPLETE'}</p>
    <TapBoard fen={fen} orientation={opening.side} locked={(inLesson && awaiting !== 'user' && !detour) || engineBusy || !!gameOver || Boolean(detour && detour.stage !== 'answer')} lastMove={lastMove} hintMove={hint} onMove={inLesson ? onLessonMove : inRehearsal ? onRehearsalMove : undefined} label={`Surprise Lab - ${opening.name}`} motion={false} />
    {correction && <div className="lab-correction">{correction}</div>}
    <div className="lab-panel"><div className="lab-speaker"><ChesterAvatar isThinking={engineBusy || (inLesson && awaiting === 'opp')} size="small" /><p>{line}</p></div></div>
    {inLesson && !detour && step.branch && <div className="lab-branch"><b>If they're good:</b> {step.branch}{step.branchLine && awaiting === 'user' && <> <button className="lab-branchgo" onClick={startDetour}>TRY IT ON THE BOARD →</button></>}</div>}
    <div className="lab-controls">
      {detour && <button className="lab-btn lab-btn--go" onClick={endDetour}>← BACK TO THE MAIN LINE</button>}
      {inLesson && !detour && <button className="lab-btn lab-btn--ghost" onClick={() => setHintOn((v) => !v)}>{hintOn ? 'HIDE THE GUIDE' : 'SHOW THE GUIDE'}</button>}
      {inLesson && <button className="lab-btn lab-btn--ghost" onClick={() => startLesson(opening)}>RESTART LESSON</button>}
      {phase === 'handoff' && <button className="lab-btn lab-btn--go" onClick={startRehearsal}>REHEARSE VS CHESTER - NO HINTS →</button>}
      {phase === 'handoff' && <button className="lab-btn lab-btn--ghost" onClick={() => startLesson(opening)}>RUN IT AGAIN</button>}
      {inRehearsal && !gameOver && <button className="lab-btn lab-btn--ghost" onClick={startRehearsal}>START OVER</button>}
      {inRehearsal && gameOver && <button className="lab-btn lab-btn--go" onClick={startRehearsal}>REMATCH</button>}
      {inRehearsal && gameOver && <button className="lab-btn lab-btn--ghost" onClick={() => startLesson(opening)}>BACK TO THE LESSON</button>}
      {phase === 'handoff' && <button className="lab-btn lab-btn--ghost" onClick={() => setPhase('shelf')}>NEXT OPENING →</button>}
    </div>
  </main>;
}
