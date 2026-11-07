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
import { analyzeGame, saveReview, loadReviews, turningPoints, clockReport, classCounts, type ReviewedGame, type ReviewedPly } from '@/lib/game-review';
import { getStockfishClient } from '@/lib/stockfish';
import { recordMillMistake } from '@/lib/puzzle-mill';

type Stage = 'pick' | 'analyzing' | 'report';

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
/** evalDelta is a positive loss magnitude (cp) - bigger means the move was worse. */
function fmtLoss(cp: number | null): string {
  if (cp == null) return '';
  return `-${(cp / 100).toFixed(1)}`;
}
function gradeChip(p: ReviewedPly): { label: string; bad: boolean } {
  const bad = p.classification === 'MISTAKE' || p.classification === 'BLUNDER';
  return { label: p.classification === 'INACCURACY' ? 'SLIP' : p.classification, bad };
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
  const [walkIdx, setWalkIdx] = useState(0);   // index into plies: which move is shown
  const [retryMode, setRetryMode] = useState<null | 'ask' | 'miss' | 'shown'>(null);
  const [retryFen, setRetryFen] = useState<string | null>(null); // board override while retrying
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
    setBusy(true); setError(''); setPickedMonth(url); setOpponentFilter(null);
    try { setGames(await fetchMonth(url, username)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load that month.'); }
    setBusy(false);
  };

  const startAnalysis = async (game: CcGame) => {
    setError('');
    const cached = loadReviews().find((r) => r.gameUrl === game.url);
    if (cached) { setReview(cached); setWalkIdx(cached.plies.length - 1); setStage('report'); return; }
    const moves: ParsedMove[] = parseGamePgn(game.pgn);
    if (moves.length < 4) { setError('That game was too short to review.'); return; }
    setStage('analyzing'); setProgress({ done: 0, total: moves.length });
    try {
      const engine = getStockfishClient();
      const done = await analyzeGame(engine, game, moves, (d, t) => { if (mounted.current) setProgress({ done: d, total: t }); });
      saveReview(done);
      // Bank the player's own slips into the Puzzle Mill (existing retry feature).
      for (const p of done.plies) {
        if (!p.isUser || p.provisional) continue;
        if (p.classification === 'MISTAKE' || p.classification === 'BLUNDER') {
          try {
            recordMillMistake({ fenBefore: p.fenBefore, bestMove: p.bestMoveSan, move: p.san, classification: p.classification, evalDelta: p.evalDelta, provisional: p.provisional });
          } catch { /* mill full */ }
        }
      }
      if (mounted.current) { setReview(done); setWalkIdx(done.plies.length - 1); setStage('report'); }
    } catch {
      if (mounted.current) { setError('The engine stalled on that game - try another one.'); setStage('pick'); }
    }
  };

  const opponents = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of games) m.set(g.opponent, (m.get(g.opponent) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [games]);
  const shownGames = opponentFilter ? games.filter((g) => g.opponent === opponentFilter) : games;

  const tps = useMemo(() => (review ? turningPoints(review) : []), [review]);
  const clock = useMemo(() => (review ? clockReport(review) : null), [review]);
  const counts = useMemo(() => (review ? classCounts(review) : []), [review]);

  const ply: ReviewedPly | null = review && review.plies.length ? review.plies[Math.min(walkIdx, review.plies.length - 1)] : null;
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

  return <main className="lab-shell review-shell">
    <header className="review-head">
      <Link href="/learn" className="review-back">← Lessons</Link>
      <h1>Game Review</h1>
      <p className="review-sub">Your real Chess.com games, walked move by move. Public archive only - no login, nothing leaves your phone.</p>
    </header>

    {error ? <p className="review-error">{error}</p> : null}

    {stage === 'pick' && <>
      <div className="review-row">
        <input className="review-input" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Chess.com username" placeholder="Chess.com username" />
        <button className="lab-btn lab-btn--go" onClick={loadArchives} disabled={busy || !username.trim()}>Find games</button>
      </div>
      {archives.length > 0 && <section>
        <h2 className="review-h2">Pick a month</h2>
        <div className="review-months">
          {archives.slice(0, 12).map((u) => {
            const label = u.split('/').slice(-2).reverse().join('/');
            return <button key={u} className={`lab-btn${pickedMonth === u ? ' lab-btn--go' : ''}`} onClick={() => loadMonth(u)} disabled={busy}>{label}</button>;
          })}
        </div>
      </section>}
      {games.length > 0 && <section>
        <h2 className="review-h2">Pick a game {pickedMonth ? `- ${games.length} found` : ''}</h2>
        {opponents.length > 1 && <div className="review-months">
          <button className={`lab-btn${!opponentFilter ? ' lab-btn--go' : ''}`} onClick={() => setOpponentFilter(null)}>Everyone</button>
          {opponents.map(([name, n]) => <button key={name} className={`lab-btn${opponentFilter === name ? ' lab-btn--go' : ''}`} onClick={() => setOpponentFilter(name)}>{name} ({n})</button>)}
        </div>}
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
        <TapBoard fen={retryFen ?? (retryMode ? ply.fenBefore : ply.fenAfter)} orientation={review.meta.userColor} locked={retryMode === null} lastMove={retryMode ? null : lastFromTo} label="Game position" onMove={retryMode ? tryRetry : undefined} />
        <div className="review-walkbar">
          <button className="lab-btn" onClick={() => { setWalkIdx((i) => Math.max(0, i - 1)); setRetryMode(null); setRetryFen(null); }} disabled={walkIdx <= 0}>◀ Back</button>
          <span className="review-walkpos">{Math.ceil(ply.ply / 2)}. {ply.mover === 'w' ? '' : '…'}{ply.san}</span>
          <button className="lab-btn" onClick={() => { setWalkIdx((i) => Math.min(review.plies.length - 1, i + 1)); setRetryMode(null); setRetryFen(null); }} disabled={walkIdx >= review.plies.length - 1}>Next ▶</button>
        </div>
        <div className={`review-chip review-chip--${gradeChip(ply).bad ? 'bad' : 'ok'}`}>
          {ply.isUser ? 'Your move' : 'Their move'} · {gradeChip(ply).label}{ply.provisional ? ' (unconfirmed)' : ''}
          {ply.evalDelta != null && ply.evalDelta > 30 ? ` · engine read ${fmtLoss(ply.evalDelta)}` : ''}
          {ply.bestMoveSan && (ply.classification === 'MISTAKE' || ply.classification === 'BLUNDER' || ply.classification === 'INACCURACY') ? ` · better: ${ply.bestMoveSan}` : ''}
        </div>
        {ply.provisional && <p className="review-sub review-sub--fine">This grade came from the quick pass - the deeper double-check was inconclusive, so treat it as a maybe, and it has not been banked as a puzzle.</p>}
        {ply.isUser && (ply.classification === 'MISTAKE' || ply.classification === 'BLUNDER') && retryMode === null &&
          <button className="lab-btn lab-btn--go" onClick={() => { setRetryMode('ask'); setRetryFen(null); }}>Try the position yourself</button>}
        {retryMode === 'ask' && <p className="review-sub">From the position just before your move: find the better one. Tap a piece, then where it goes.</p>}
        {retryMode === 'miss' && <p className="review-sub">Not that one - have another go, or press “Show me”.</p>}
        {retryMode === 'miss' && <button className="lab-btn" onClick={showBest}>Show me</button>}
        {retryMode === 'shown' && <p className="review-sub review-sub--good">The engine liked <b>{ply.bestMoveSan}</b> here.{ply.continuation.length ? ` If play continues ${ply.continuation.slice(0, 4).join(' ')}.` : ''} That is one engine's line at capped depth - a strong suggestion, not the only answer.</p>}
        <div className="review-traj" aria-hidden="true">
          {review.plies.map((p, i) => {
            const cp = p.whiteCpAfter == null ? (p.mateInAfter != null ? (p.mateInAfter > 0 === (p.mover === 'w') ? 1200 : -1200) : 0) : Math.max(-1200, Math.min(1200, p.whiteCpAfter));
            return <button key={i} className={`review-traj__bar${i === walkIdx ? ' review-traj__bar--on' : ''}${p.isUser && (p.classification === 'MISTAKE' || p.classification === 'BLUNDER') ? ' review-traj__bar--bad' : ''}`} style={{ height: `${4 + Math.abs(cp) / 24}px`, background: i === walkIdx ? '#ffd84d' : cp >= 0 ? '#7ef29a' : '#ff7b7b' }} onClick={() => { setWalkIdx(i); setRetryMode(null); setRetryFen(null); }} aria-label={`Move ${Math.ceil(p.ply / 2)}`} />;
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
        {tps.map((tp) => <button key={tp.ply.ply} className="lab-card" onClick={() => { setWalkIdx(tp.ply.ply - 1); setRetryMode(null); setRetryFen(null); }}>
          <small>{tp.kind === 'missed' ? 'YOUR SLIP' : 'THEIR GIFT'} · move {Math.ceil(tp.ply.ply / 2)}{tp.ply.mover === 'b' ? '…' : ''}</small>
          <b>{tp.ply.san}{tp.ply.evalDelta != null ? ` (${fmtLoss(tp.ply.evalDelta)})` : ''}{tp.ply.provisional ? ' - unconfirmed' : ''}</b>
          <span>{tp.kind === 'missed'
            ? `The engine preferred ${tp.ply.bestMoveSan || 'another move'}. Tap to stand at that moment and try it yourself.`
            : `${review.meta.opponent} slipped here${tp.ply.bestMoveSan ? ` - ${tp.ply.bestMoveSan} was the way to punish it` : ''}.`}</span>
        </button>)}
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
