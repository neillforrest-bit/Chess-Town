'use client';

// GAME REVIEW (prototype, stage A) - import a real Chess.com game and walk it with the
// engine: where it turned, what was better, and a retry from the exact slip.
// Numbers come from one engine at capped depth - the page says so next to them. Why a
// human went wrong is interpretation; the engine only measures lines.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { fetchArchives, fetchMonth, parseGamePgn, endPhrase, type CcGame, type ParsedMove } from '@/lib/chesscom';
import { analyzeGame, saveReview, loadReviews, turningPoints, clockReport, classCounts, scorecard as scorecardFor, playerMeasure, verdictFor, type ReviewedGame, type ReviewedPly } from '@/lib/game-review';
import { getStockfishClient } from '@/lib/stockfish';
import { recordMillMistake } from '@/lib/puzzle-mill';
import { Chess as ChessFacts } from 'chess.js';

type Stage = 'pick' | 'analyzing' | 'report';

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
/** evalDelta is a positive loss magnitude (cp) - bigger means the move was worse. */
function fmtLoss(cp: number | null): string {
  if (cp == null) return '';
  return `-${(cp / 100).toFixed(1)}`;
}
/** Measured labels, not praise: what the capped engine actually observed. */
export function measuredLabel(p: ReviewedPly): string {
  if (p.terminal === 'mate') return 'CHECKMATE';
  if (p.terminal === 'draw') return 'GAME DRAWN';
  switch (p.classification) {
    case 'BRILLIANT':
    case 'BEST': return 'BEST';
    case 'GREAT': return 'GOOD';
    case 'INACCURACY': return 'SLIP';
    case 'MISTAKE': return 'MISTAKE';
    case 'BLUNDER': return 'BLUNDER';
  }
}
function gradeChip(p: ReviewedPly): { label: string; bad: boolean } {
  const bad = p.classification === 'MISTAKE' || p.classification === 'BLUNDER';
  return { label: measuredLabel(p), bad };
}

export default function ReviewPage() {
  const [stage, setStage] = useState<Stage>('pick');
  const [username, setUsername] = useState('Neillio0428');
  const [archives, setArchives] = useState<string[]>([]);
  const [games, setGames] = useState<CcGame[]>([]);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [opponentFilter, setOpponentFilter] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [review, setReview] = useState<ReviewedGame | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzed, setAnalyzed] = useState<string[]>([]);
  // Game walker state (report)
  const [walkIdx, setWalkIdx] = useState(-1);  // index into plies; -1 = starting position
  const [retryMode, setRetryMode] = useState<null | 'ask' | 'miss' | 'shown'>(null);
  const [retryFen, setRetryFen] = useState<string | null>(null); // board override while retrying
  const [playing, setPlaying] = useState(false);                 // highlight playback
  const [cwhd, setCwhd] = useState(false);                       // 'Chester would have done' reveal
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    try { setAnalyzed(loadReviews().map((r) => r.gameUrl)); } catch { /* private mode */ }
  }, [stage]);

  const loadArchives = async () => {
    setBusy(true); setError('');
    try {
      const list = await fetchArchives(username);
      setArchives(list.slice().reverse());
      setGames([]); setPickedMonth(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reach Chess.com.'); }
    setBusy(false);
  };
  const loadMonth = async (url: string) => {
    setBusy(true); setError(''); setPickedMonth(url); setOpponentFilter(null); setResultFilter('all');
    try { setGames(await fetchMonth(url, username)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load that month.'); }
    setBusy(false);
  };

  const startAnalysis = async (game: CcGame) => {
    setError('');
    const cached = loadReviews().find((r) => r.gameUrl === game.url);
    if (cached) { setReview(cached); setWalkIdx(-1); setStage('report'); return; }
    const moves: ParsedMove[] = parseGamePgn(game.pgn);
    if (moves.length < 4) { setError('That game was too short to review.'); return; }
    setStage('analyzing'); setProgress({ done: 0, total: moves.length });
    try {
      const engine = getStockfishClient();
      const done = await analyzeGame(engine, game, moves, (d, t) => { if (mounted.current) setProgress({ done: d, total: t }); });
      saveReview(done);
      // Bank the player's own slips into the Puzzle Mill (existing retry feature).
      for (const p of done.plies) {
        // Confidence gate: bank only stable, comparable losses. Mate-adjacent and terminal
        // positions read wildly at capped depth; unconfirmed grades never become puzzles.
        if (!p.isUser || p.provisional || p.terminal || p.mateInAfter != null) continue;
        if (p.evalDelta == null || p.evalDelta < 150) continue;
        if (p.classification !== 'MISTAKE' && p.classification !== 'BLUNDER') continue;
        // Confirming analysis: time-capped grading drifts run to run, so a position becomes
        // a teaching puzzle only when a second independent read still calls it a mistake and
        // the loss agrees within 100cp. Drifting grades are dropped, not banked.
        try {
          const again = await engine.evaluateMove({ fenBefore: p.fenBefore, fenAfter: p.fenAfter, san: p.san, uci: p.uci, playerColor: p.mover, difficulty: 'EXPERT' });
          const stable = (again.classification === 'MISTAKE' || again.classification === 'BLUNDER')
            && again.evalDelta != null && Math.abs(again.evalDelta - p.evalDelta) <= 100;
          if (!stable || again.provisional) continue;
          recordMillMistake({ fenBefore: p.fenBefore, bestMove: p.bestMoveSan, move: p.san, classification: p.classification, evalDelta: p.evalDelta, provisional: false, src: 'review' });
        } catch { /* second read failed: skip, do not bank */ }
      }
      if (mounted.current) { setReview(done); setWalkIdx(-1); setStage('report'); }
    } catch {
      if (mounted.current) { setError('The engine stalled on that game - try another one.'); setStage('pick'); }
    }
  };

  const opponents = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of games) m.set(g.opponent, (m.get(g.opponent) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [games]);
  const shownGames = games.filter((g) =>
    (opponentFilter ? g.opponent === opponentFilter : true) &&
    (resultFilter === 'all' ? true : g.result === resultFilter));

  const tps = useMemo(() => (review ? turningPoints(review) : []), [review]);
  const clock = useMemo(() => (review ? clockReport(review) : null), [review]);
  const counts = useMemo(() => (review ? classCounts(review) : []), [review]);
  const sc = useMemo(() => (review ? scorecardFor(review) : []), [review]);
  const measures = useMemo(() => (review ? { user: playerMeasure(review, true), opp: playerMeasure(review, false) } : null), [review]);

  const ply: ReviewedPly | null = review && review.plies.length ? review.plies[Math.max(0, Math.min(walkIdx, review.plies.length - 1))] : null;
  const startFen = review && review.plies.length ? review.plies[0].fenBefore : null;

  // Highlight playback: advance about 1.2s per move until the final position, then stop.
  useEffect(() => {
    if (!playing || !review) return;
    if (walkIdx >= review.plies.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => { setWalkIdx((i) => Math.min(review.plies.length - 1, i + 1)); setRetryMode(null); setRetryFen(null); setCwhd(false); }, 1200);
    return () => clearTimeout(t);
  }, [playing, walkIdx, review]);
  /** Manual navigation always pauses playback and clears any retry state. */
  const goTo = (i: number) => { setWalkIdx(i); setRetryMode(null); setRetryFen(null); setCwhd(false); setPlaying(false); };
  const togglePlay = () => {
    if (!review) return;
    if (playing) { setPlaying(false); return; }
    if (walkIdx >= review.plies.length - 1) { setWalkIdx(-1); setRetryMode(null); setRetryFen(null); setCwhd(false); }
    setPlaying(true);
  };
  const walkChess = useMemo(() => (ply ? new Chess(ply.fenAfter) : null), [ply]);
  const lastFromTo = useMemo(() => {
    if (!walkChess || !ply) return null;
    try {
      const hist = new Chess(ply.fenBefore);
      const mv = hist.move(ply.san);
      return mv ? { from: mv.from, to: mv.to } : null;
    } catch { return null; }
  }, [ply, walkChess]);

  const tryRetry = (from: string, to: string, promotion?: string) => {
    if (!ply || !ply.bestMoveSan || (retryMode !== 'ask' && retryMode !== 'miss')) return;
    try {
      const before = new Chess(retryFen ?? ply.fenBefore);
      before.move({ from, to, promotion });
      const played = before.history({ verbose: true }).pop();
      const bestHist = new Chess(ply.fenBefore);
      bestHist.move(ply.bestMoveSan);
      const best = bestHist.history({ verbose: true }).pop();
      if (played && best && played.from === best.from && played.to === best.to) { setRetryFen(before.fen()); setRetryMode('shown'); }
      else setRetryMode('miss');
    } catch { /* illegal tap */ }
  };
  const showBest = () => {
    if (!ply?.bestMoveSan) return;
    try {
      const c = new Chess(ply.fenBefore);
      c.move(ply.bestMoveSan);
      setRetryFen(c.fen());
    } catch { /* keep position */ }
    setRetryMode('shown');
  };

  const resultWord = review ? (review.meta.result === 'win' ? 'You won' : review.meta.result === 'loss' ? 'You lost' : 'Draw') : '';

  const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  /** One board-factual reason for a slip, verified move-by-move with chess.js: a claim only
   *  ships when the capture it names is LEGAL for the side to move right now (check
   *  responses included) and recapture really is absent. Null = fall back to engine framing
   *  rather than tell a geometrically-plausible but tactically wrong story. */
  const whyFor = (p: ReviewedPly): string | null => {
    try {
      const c = new ChessFacts(p.fenBefore);
      const played = c.move(p.san);
      if (!played) return null;
      const mover = played.color;
      const enemy = mover === 'w' ? 'b' : 'w';
      const legal = c.moves({ verbose: true });
      const canCapture = (sq: string) => legal.some((m) => m.to === sq && m.captured);
      const capturerType = (sq: string): string => {
        const mv = legal.find((m) => m.to === sq && m.captured);
        return mv ? mv.piece : 'p';
      };
      const defendersOf = (sq: string) => (c as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(sq, mover);
      const attackersOf = (sq: string) => (c as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(sq, enemy);
      // 1. A hanging NON-moved piece worth more than the moved one (the real cost when a
      //    move ignores an existing threat, e.g. Bxa5 while the queen is en prise).
      let hang: { type: string; attacker: string; value: number } | null = null;
      for (const row of (c as unknown as { board(): ({ square: string; type: string; color: string } | null)[][] }).board()) {
        for (const cell of row) {
          if (!cell || cell.color !== mover || cell.type === 'k' || cell.square === played.to) continue;
          const attackers = attackersOf(cell.square);
          if (!attackers.length || !canCapture(cell.square)) continue;
          const defenders = defendersOf(cell.square);
          const cheap = Math.min(...attackers.map((sq) => PIECE_VAL[((c as unknown as { get(s: string): { type: string } | null }).get(sq)?.type) || 'p'] || 1));
          if (defenders.length > 0 && cheap >= (PIECE_VAL[cell.type] || 0)) continue; // adequately defended
          const v = PIECE_VAL[cell.type] || 0;
          if (!hang || v > hang.value) hang = { type: cell.type, attacker: capturerType(cell.square), value: v };
        }
      }
      if (hang && hang.value >= 3) return `Your ${PIECE_NAME[hang.type]} is under attack - their ${PIECE_NAME[hang.attacker]} can take it and nothing of yours takes back.`;
      // 2. The moved piece itself can legally be taken back (e.g. a checking piece that is
      //    simply capturable as the check answer).
      if (played.piece !== 'k' && canCapture(played.to)) {
        const defenders = defendersOf(played.to);
        const attackers = attackersOf(played.to);
        const cheap = Math.min(...attackers.map((sq) => PIECE_VAL[((c as unknown as { get(s: string): { type: string } | null }).get(sq)?.type) || 'p'] || 1));
        if (defenders.length === 0 || cheap < (PIECE_VAL[played.piece] || 0)) {
          return `Your ${PIECE_NAME[played.piece]} could just be taken by their ${PIECE_NAME[capturerType(played.to)]}.`;
        }
      }
      return null;
    } catch { return null; }
  };
  /** What the engine's pick accomplishes, stated only when mechanically true: a capture names
   *  the taken piece (and whether it ends an attack on one of yours); a quiet move that steps
   *  an attacked piece out of danger says so. Anything subtler stays unsaid. */
  const bestMovePoint = (p: ReviewedPly): string | null => {
    if (!p.bestMoveSan || p.bestMoveSan === p.san) return null;
    try {
      const c = new ChessFacts(p.fenBefore);
      const mover = c.turn();
      const enemy = mover === 'w' ? 'b' : 'w';
      const mv = c.move(p.bestMoveSan);
      if (!mv) return null;
      if (mv.captured) {
        // did the captured piece attack something of ours before the move?
        const before = new ChessFacts(p.fenBefore);
        const victims: { type: string; value: number }[] = [];
        for (const row of (before as unknown as { board(): ({ square: string; type: string; color: string } | null)[][] }).board()) {
          for (const cell of row) {
            if (!cell || cell.color !== mover || cell.type === 'k') continue;
            const attackers = (before as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(cell.square, enemy);
            if (attackers.includes(mv.to)) victims.push({ type: cell.type, value: PIECE_VAL[cell.type] || 0 });
          }
        }
        const biggest = victims.sort((a, b) => b.value - a.value)[0];
        return biggest
          ? `${p.bestMoveSan} takes their ${PIECE_NAME[mv.captured]} and ends the attack on your ${PIECE_NAME[biggest.type]}.`
          : `${p.bestMoveSan} wins their ${PIECE_NAME[mv.captured]}.`;
      }
      // quiet move: was the moved piece under attack before?
      const before = new ChessFacts(p.fenBefore);
      const attackers = (before as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(mv.from, enemy);
      if (attackers.length && mv.piece !== 'k') return `${p.bestMoveSan} gets your ${PIECE_NAME[mv.piece]} out of danger.`;
      return null;
    } catch { return null; }
  };

  return <main className="lab-shell review-shell">
    <header className="review-head">
      <Link href="/learn" className="review-back">← Lessons</Link>
      <h1>Game Review</h1>
    </header>

    {error ? <p className="review-error">{error}</p> : null}

    {stage === 'pick' && <>
      <p className="review-sub">Your real Chess.com games, walked move by move. Pulled from Chess.com's public archive (no login); the analysis runs in this browser and reviews are saved on this device only.</p>
      <div className="review-row">
        <input className="review-input" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Chess.com username" placeholder="Chess.com username" />
        <button className="lab-btn lab-btn--go" onClick={loadArchives} disabled={busy || !username.trim()}>Find games</button>
      </div>
      {archives.length > 0 && <section>
        <h2 className="review-h2">Pick a month</h2>
        <select className="review-select" value={pickedMonth ?? ''} onChange={(e) => { if (e.target.value) loadMonth(e.target.value); }} disabled={busy} aria-label="Month">
          <option value="" disabled>Choose a month…</option>
          {archives.map((u) => {
            const label = u.split('/').slice(-2).reverse().join('/');
            return <option key={u} value={u}>{label}</option>;
          })}
        </select>
      </section>}
      {games.length > 0 && <section>
        <h2 className="review-h2">Pick a game {pickedMonth ? `- ${shownGames.length === games.length ? `${games.length} found` : `${shownGames.length} shown`}` : ''}</h2>
        <div className="review-filters">
          {opponents.length > 1 && <select className="review-select" value={opponentFilter ?? ''} onChange={(e) => setOpponentFilter(e.target.value || null)} aria-label="Opponent">
            <option value="">Everyone ({games.length})</option>
            {opponents.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
          </select>}
          <select className="review-select" value={resultFilter} onChange={(e) => setResultFilter(e.target.value as 'all' | 'win' | 'loss' | 'draw')} aria-label="Result">
            <option value="all">All results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="draw">Draws</option>
          </select>
        </div>
        {shownGames.length === 0 && <p className="review-sub">No games match those filters.</p>}
        {shownGames.map((g) => <button key={g.url} className="lab-card" onClick={() => startAnalysis(g)}>
          <small>{fmtDate(g.endTime)} · {g.timeClass} {g.timeControl} · {g.ecoName || 'Unknown opening'}</small>
          <b>{g.userColor === 'w' ? 'White' : 'Black'} vs {g.opponent}{g.opponentRating ? ` (${g.opponentRating})` : ''}</b>
          <span>{g.result === 'win' ? 'You won' : g.result === 'loss' ? 'You lost' : 'Draw'} {endPhrase(g.termination)}</span>
          {analyzed.includes(g.url) ? <span className="lab-meta">ANALYZED - tap to open</span> : null}
        </button>)}
      </section>}
    </>}

    {stage === 'analyzing' && <section className="review-center">
      <h2 className="review-h2">Reading your game…</h2>
      <div className="review-progress"><div className="review-progress__bar" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
      <p className="review-sub">Move {progress.done} of {progress.total}. Both sides get graded - that takes a minute or two on your phone. Grading engine: Stockfish 18 at capped depth, same analyst Chester uses.</p>
    </section>}

    {stage === 'report' && review && ply && <>
      <section>
        <h2 className="review-h2">{resultWord} vs {review.meta.opponent}</h2>
        <p className="review-sub">{fmtDate(review.meta.endTime)} · {review.meta.timeClass} {review.meta.timeControl} · {review.meta.ecoName || 'Unknown opening'} · graded by {review.engineLabel}.</p>
      </section>

      <section className="review-walk">
        <TapBoard fen={retryFen ?? (retryMode ? ply.fenBefore : walkIdx < 0 && startFen ? startFen : ply.fenAfter)} orientation={review.meta.userColor} locked={retryMode === null} lastMove={retryMode || walkIdx < 0 ? null : lastFromTo} label="Game position" onMove={retryMode ? tryRetry : undefined} />
        <div className="review-walkbar">
          <button className="lab-btn" onClick={() => goTo(Math.max(-1, walkIdx - 1))} disabled={walkIdx <= -1}>◀ Back</button>
          <span className="review-walkpos">{walkIdx < 0 ? 'Start' : `${Math.ceil(ply.ply / 2)}. ${ply.mover === 'w' ? '' : '…'}${ply.san}`}</span>
          <button className="lab-btn" onClick={() => goTo(Math.min(review.plies.length - 1, walkIdx + 1))} disabled={walkIdx >= review.plies.length - 1}>Next ▶</button>
        </div>
        <div className="review-walkbar">
          <button className="lab-btn lab-btn--go" onClick={togglePlay}>{playing ? '⏸ Pause' : walkIdx >= review.plies.length - 1 ? '▶ Replay' : '▶ Play'}</button>
          <button className="lab-btn" onClick={() => goTo(-1)} disabled={walkIdx <= -1}>⟲ Start</button>
        </div>
        {walkIdx < 0
          ? <p className="review-sub">At the starting position. Press Play for the highlight, or step through with Next - pause any time to study a position with Chester.</p>
          : playing
            ? <p className="review-sub">Playing the highlight… hit Pause to stop on a position and study it.</p>
            : <div>
              <p className="review-sub"><b>Paused at move {Math.ceil(ply.ply / 2)}{ply.mover === 'b' ? '…' : ''}.</b>{' '}
                {ply.terminal === 'mate'
                  ? `${ply.isUser ? 'You' : review.meta.opponent} played ${ply.san} - checkmate on the board, game over. That is a fact, not an engine grade.`
                  : ply.terminal === 'draw'
                    ? `${ply.isUser ? 'You' : review.meta.opponent} played ${ply.san} and the game is drawn here. That is a fact, not an engine grade.`
                    : `${ply.isUser ? 'Your' : `${review.meta.opponent}'s`} ${ply.san} graded ${gradeChip(ply).label}${ply.provisional ? ' (unconfirmed)' : ''}${ply.evalDelta != null && ply.evalDelta > 30 ? ` - engine read ${fmtLoss(ply.evalDelta)}` : ''}.${whyFor(ply) ? ` ${whyFor(ply)}` : ''}`}</p>
              {(() => {
                const e = sc[walkIdx];
                if (!e) return null;
                if (ply.terminal === 'mate') return <p className="review-sub">Scorecard: settled - {ply.mover === review.meta.userColor ? 'you win' : `${review.meta.opponent} wins`}. 100/0, proven by the board.</p>;
                if (ply.terminal === 'draw') return <p className="review-sub">Scorecard: DRAW - the game finished level; no winning chances remain.</p>;
                if (e.unstable) return <p className="review-sub">Scorecard: unavailable here - the engine's reads around this move are unstable at capped depth, so no number is shown.</p>;
                if (ply.mateInAfter != null) return <p className="review-sub">Scorecard: the engine reads mate in {Math.abs(ply.mateInAfter)} for {(ply.mateInAfter > 0) === (ply.mover === review.meta.userColor) ? 'you' : review.meta.opponent} - an engine read, not yet on the board, so no percentage.</p>;
                if (e.userPct == null) return null;
                return <p className="review-sub">Scorecard: leans {e.userPct}% your way{e.delta != null && e.delta !== 0 ? ` (${e.delta > 0 ? '+' : ''}${e.delta} after that move)` : ''}.</p>;
              })()}
              {!ply.terminal && ply.bestMoveSan && ply.bestMoveSan !== ply.san && <>
                <button className="lab-btn" onClick={() => setCwhd((v) => !v)}>{cwhd ? 'Hide it again' : 'Chester would have done (CWHD)'}</button>
                {cwhd && <p className="review-sub review-sub--good">Chester would have played {ply.bestMoveSan}. {bestMovePoint(ply) || 'What that move accomplishes is not established from the position alone - it is the engine\'s preference at capped depth, not a proven plan.'}</p>}
              </>}
            </div>}
        <p className="review-sub review-sub--fine">Scorecard is a rough advantage gauge, not a win probability: the engine's evaluation is mapped onto a 0-100 scale (50 = balanced, draws included) via the published Lichess formula. Only a result on the board is proven. Positions whose reads are unstable at capped depth show no number.</p>
        {walkIdx >= 0 && <div className={`review-chip review-chip--${gradeChip(ply).bad ? 'bad' : 'ok'}`}>
          {ply.isUser ? 'Your move' : 'Their move'} · {gradeChip(ply).label}{ply.provisional && !ply.terminal ? ' (unconfirmed)' : ''}
          {ply.evalDelta != null && ply.evalDelta > 30 ? ` · engine read ${fmtLoss(ply.evalDelta)}` : ''}
          {ply.bestMoveSan && (ply.classification === 'MISTAKE' || ply.classification === 'BLUNDER' || ply.classification === 'INACCURACY') ? ` · better: ${ply.bestMoveSan}` : ''}
        </div>}
        {walkIdx >= 0 && ply.provisional && <p className="review-sub review-sub--fine">This grade came from the quick pass - the deeper double-check was inconclusive, so treat it as a maybe, and it has not been banked as a puzzle.</p>}
        {walkIdx >= 0 && !playing && ply.isUser && (ply.classification === 'MISTAKE' || ply.classification === 'BLUNDER') && retryMode === null &&
          <button className="lab-btn lab-btn--go" onClick={() => { setRetryMode('ask'); setRetryFen(null); }}>Try the position yourself</button>}
        {retryMode === 'ask' && <p className="review-sub">From the position just before your move: find the better one. Tap a piece, then where it goes.</p>}
        {retryMode === 'miss' && <p className="review-sub">Not that one - have another go, or press “Show me”.</p>}
        {retryMode === 'miss' && <button className="lab-btn" onClick={showBest}>Show me</button>}
        {retryMode === 'shown' && <p className="review-sub review-sub--good">{whyFor(ply) ? `${whyFor(ply)} ` : ''}{bestMovePoint(ply) || `The engine's pick: ${ply.bestMoveSan}.`} One engine's read at capped depth - a strong suggestion, not the only answer.</p>}
        <div className="review-traj" aria-hidden="true">
          {review.plies.map((p, i) => {
            const cp = p.whiteCpAfter == null ? (p.mateInAfter != null ? (p.mateInAfter > 0 === (p.mover === 'w') ? 1200 : -1200) : 0) : Math.max(-1200, Math.min(1200, p.whiteCpAfter));
            return <button key={i} className={`review-traj__bar${i === walkIdx ? ' review-traj__bar--on' : ''}${p.isUser && (p.classification === 'MISTAKE' || p.classification === 'BLUNDER') ? ' review-traj__bar--bad' : ''}`} style={{ height: `${4 + Math.abs(cp) / 24}px`, background: i === walkIdx ? '#ffd84d' : cp >= 0 ? '#7ef29a' : '#ff7b7b' }} onClick={() => goTo(i)} aria-label={`Move ${Math.ceil(p.ply / 2)}`} />;
          })}
        </div>
      </section>

      <section>
        <h2 className="review-h2">How your moves graded</h2>
        <div className="review-counts">{counts.map((c) => <span key={c.label} className={`review-chip review-chip--${c.label === 'MISTAKE' || c.label === 'BLUNDER' ? 'bad' : 'ok'}`}>{c.label} ×{c.n}</span>)}</div>
        {review.plies.filter((p) => p.isUser && p.provisional).length > 0 && <p className="review-sub review-sub--fine">{review.plies.filter((p) => p.isUser && p.provisional).length} of your grade{review.plies.filter((p) => p.isUser && p.provisional).length === 1 ? ' is' : 's are'} unconfirmed (quick-pass only) and not counted as banked mistakes.</p>}
      </section>

      {tps.length > 0 && <section>
        <h2 className="review-h2">Where the game turned</h2>
        {tps.map((tp) => <button key={tp.ply.ply} className="lab-card" onClick={() => goTo(tp.ply.ply - 1)}>
          <small>{tp.kind === 'missed' ? 'YOUR SLIP' : 'THEIR GIFT'} · move {Math.ceil(tp.ply.ply / 2)}{tp.ply.mover === 'b' ? '…' : ''}</small>
          <b>{tp.ply.san}{tp.ply.evalDelta != null ? ` (${fmtLoss(tp.ply.evalDelta)})` : ''}{tp.ply.provisional ? ' - unconfirmed' : ''}</b>
          <span>{tp.kind === 'missed'
            ? [whyFor(tp.ply), bestMovePoint(tp.ply) || (!whyFor(tp.ply) ? `The engine preferred ${tp.ply.bestMoveSan || 'another move'} here.` : null)].filter(Boolean).join(' ') + ' Tap to stand at that moment and try it yourself.'
            : `${review.meta.opponent} slipped here${tp.ply.bestMoveSan ? ` - ${tp.ply.bestMoveSan} was the way to punish it` : ''}.`}</span>
        </button>)}
      </section>}

      {measures && measures.user.graded > 0 && <section>
        <h2 className="review-h2">Chester's verdict</h2>
        <p className="review-sub">You: “{verdictFor(measures.user)}” · {review.meta.opponent}: “{verdictFor(measures.opp)}”</p>
        <p className="review-sub review-sub--fine">Behind the cheek, the measured numbers: your moves lost {measures.user.avgLossCp != null ? `${(measures.user.avgLossCp / 100).toFixed(1)} pawns` : 'an unmeasurable amount'} on average over {measures.user.graded} graded moves ({measures.user.blunders} blunder{measures.user.blunders === 1 ? '' : 's'}, {measures.user.mistakes} mistake{measures.user.mistakes === 1 ? '' : 's'}); theirs lost {measures.opp.avgLossCp != null ? `${(measures.opp.avgLossCp / 100).toFixed(1)} pawns` : 'an unmeasurable amount'} over {measures.opp.graded}. One game, one engine, capped depth - a snapshot of this game, not a rating.</p>
      </section>}

      {clock && clock.avgSecPerMove != null && <section>
        <h2 className="review-h2">Your clock</h2>
        <p className="review-sub">About {clock.avgSecPerMove}s a move on average{clock.avgOpening != null ? `, ${clock.avgOpening}s in the opening` : ''}{clock.avgMiddle != null ? `, ${clock.avgMiddle}s later on` : ''}.
          {clock.rushedCount > 0 ? ` You played ${clock.rushedCount} move${clock.rushedCount === 1 ? '' : 's'} in under 10 seconds${clock.rushedMistakes > 0 ? ` - ${clock.rushedMistakes} of them graded as slips in this one game` : ' and none of them hurt you here'}.` : ''}
          {clock.rushedMistakes > 0 ? ' One game is a tiny sample - but it is worth checking whether slowing down at the tense moments helps.' : ''}</p>
      </section>}

      <section className="review-row">
        <button className="lab-btn" onClick={() => { setStage('pick'); setReview(null); }}>Another game</button>
        <Link href="/puzzle-mill" className="lab-btn lab-btn--go">Fix slips in the Puzzle Mill</Link>
      </section>
      <p className="review-sub review-sub--fine">Prototype notes: reviews are stored only on this device (last 8). Grades are one engine's measurements at capped depth; “why” comments are pattern reading, not proof. Archive data can lag up to ~12h and is what Chess.com publishes - recent games may be missing.</p>
    </>}
  </main>;
}
