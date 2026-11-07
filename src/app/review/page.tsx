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
import { buildOpponentRows, userRapidTrajectory, type OpponentRow } from '@/lib/opponent-stats';
import { reviewHighlights } from '@/lib/review-highlights';
import OpponentTable from '@/components/OpponentTable';
import { publishReviewChatContext, clearReviewChatContext } from '@/lib/review-chat';
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
  const [oppRows, setOppRows] = useState<OpponentRow[] | null>(null);
  const [oppTraj, setOppTraj] = useState<Array<{ t: number; rating: number }> | null>(null);
  const [oppBusy, setOppBusy] = useState(false);
  const [oppCoverage, setOppCoverage] = useState('');
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
  const loadOpponents = async () => {
    setOppBusy(true); setError('');
    try {
      const available = archives.length ? archives : (await fetchArchives(username));
      const now = new Date();
      const floor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1);
      const urls = available.filter((u) => { const [y, m] = u.split('/').slice(-2).map(Number); return Date.UTC(y, m - 1, 1) >= floor; }).sort().reverse();
      const all: CcGame[] = [];
      for (const u of urls) {
        const g = await fetchMonth(u, username);
        if (!mounted.current) return;
        all.push(...g);
      }
      const labels = urls.slice().reverse().map((u) => u.split('/').slice(-2).join('/'));
      setOppCoverage(`${all.length} games from ${labels.join(', ')} (${urls.length} published monthly archives loaded)`);
      setOppRows(buildOpponentRows(all));
      setOppTraj(userRapidTrajectory(all));
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (mounted.current) setOppBusy(false); }
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

  const show = useMemo(() => review ? reviewHighlights(review) : null, [review]);

  const startFix = (targetPly: number) => {
    goTo(targetPly - 1);
    setRetryMode('ask'); setRetryFen(null); setCwhd(false); setPlaying(false);
    requestAnimationFrame(() => { document.querySelector('.review-walk')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  };

  const ply: ReviewedPly | null = review && review.plies.length ? review.plies[Math.max(0, Math.min(walkIdx, review.plies.length - 1))] : null;
  const startFen = review && review.plies.length ? review.plies[0].fenBefore : null;

  // Publish the position being viewed so Chester chat can answer bounded move-help
  // questions offline (no paid call). Cleared when leaving the review.
  useEffect(() => {
    if (stage !== 'report' || !review || !review.plies.length) { clearReviewChatContext(); return; }
    const p = walkIdx >= 0 ? review.plies[walkIdx] : null;
    const unstable = walkIdx >= 0 ? !!sc[walkIdx]?.unstable : false;
    publishReviewChatContext({
      fen: retryMode && p ? (retryFen ?? p.fenBefore) : p ? p.fenAfter : review.plies[0].fenBefore,
      practice: !!retryMode,
      plyNumber: walkIdx + 1,
      totalPlies: review.plies.length,
      san: p?.san ?? null,
      isUserMove: !!p?.isUser,
      suppressed: unstable,
      gradeLabel: p && !unstable && !retryMode ? measuredLabel(p) : null,
      bestMoveSan: p && !unstable && !retryMode ? p.bestMoveSan : null,
      why: p && !retryMode && (p.classification === 'MISTAKE' || p.classification === 'BLUNDER') ? whyFor(p) : null,
      opponent: review.meta.opponent ?? 'your opponent',
      atEnd: walkIdx >= review.plies.length - 1,
    });
    return () => clearReviewChatContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkIdx, review, sc, stage, retryMode, retryFen]);

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
  /** A legal capture threat is a board fact, not proof of a lost exchange. */
  const whyFor = (p: ReviewedPly): string | null => {
    try {
      const c = new ChessFacts(p.fenBefore);
      const played = c.move(p.san);
      if (!played) return null;
      const legal = c.moves({ verbose: true }).filter((m) => m.captured && m.captured !== 'k')
        .sort((a, b) => (PIECE_VAL[b.captured!] ?? 0) - (PIECE_VAL[a.captured!] ?? 0));
      const capture = legal[0];
      if (!capture || (PIECE_VAL[capture.captured!] ?? 0) < 3) return null;
      const owner = p.isUser ? 'Your' : `${review?.meta.opponent ?? 'The opponent'}'s`;
      const enemy = p.isUser ? 'their' : 'your';
      return `${owner} ${PIECE_NAME[capture.captured!]} is under attack: ${enemy} ${PIECE_NAME[capture.piece]} can legally capture it with ${capture.san}. That alone does not prove the exchange is bad.`;
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
          : `${p.bestMoveSan} captures their ${PIECE_NAME[mv.captured]}.`;
      }
      // quiet move: was the moved piece under attack before?
      const before = new ChessFacts(p.fenBefore);
      const attackers = (before as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(mv.from, enemy);
      if (attackers.length && mv.piece !== 'k' && !(c as unknown as { attackers(s: string, col: 'w' | 'b'): string[] }).attackers(mv.to, enemy).length) return `${p.bestMoveSan} gets your ${PIECE_NAME[mv.piece]} out of danger.`;
      return null;
    } catch { return null; }
  };

  return <main className={`lab-shell review-shell${stage === 'pick' && oppRows ? ' review-shell--table' : ''}`}>
    <header className="review-head">
      <Link href="/learn" className="review-back">← Lessons</Link>
      <h1>Game Review</h1>
    </header>

    {error ? <p className="review-error">{error}</p> : null}

    {stage === 'pick' && <>
      <p className="review-sub">Your real Chess.com games, walked move by move. Pulled from Chess.com's public archive (no login); the analysis runs in this browser and reviews are saved on this device only.</p>
      <div className="review-row">
        <input className="review-input" value={username} disabled={busy || oppBusy} onChange={(e) => { setUsername(e.target.value); setArchives([]); setGames([]); setPickedMonth(null); setOppRows(null); setOppTraj(null); }} aria-label="Chess.com username" placeholder="Chess.com username" />
        <button className="lab-btn lab-btn--go" onClick={loadArchives} disabled={busy || !username.trim()}>Find games</button>
        <button className="lab-btn" onClick={loadOpponents} disabled={oppBusy || busy || !username.trim()}>{oppBusy ? 'Loading 6 months…' : 'Opponent table'}</button>
      </div>
      {oppRows && <OpponentTable rows={oppRows} trajectory={oppTraj ?? []} coverage={oppCoverage} />}
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

      <section className="review-show">
        <h2 className="review-h2">📺 Chester's Highlight Show</h2>
        <p className="review-sub"><b>FINAL: {review.meta.result === 'win' ? 'You take it' : review.meta.result === 'loss' ? `${review.meta.opponent} takes it` : 'Honors even'}{endPhrase(review.meta.termination) ? ` ${endPhrase(review.meta.termination)}` : ''} after {Math.ceil(review.plies.length / 2)} move{Math.ceil(review.plies.length / 2) === 1 ? '' : 's'}.</b></p>
        {measures && measures.user.graded >= 6
          ? <p className="review-sub">Report card - You: “{verdictFor(measures.user)}” · {review.meta.opponent}: “{verdictFor(measures.opp)}”</p>
          : <p className="review-sub">Too short a game for report cards - only {measures?.user.graded ?? 0} of your moves got graded.</p>}
        {show && !show.anyStable
          ? <p className="review-sub">The engine's reads in this game swung too hard at capped depth to name moments with a straight face - no show tonight, just the facts below.</p>
          : <>
            <p className="review-sub">⭐ Top play: {show?.top ? <button className="review-jump" onClick={() => goTo(show.top!.ply - 1)}>Move {Math.ceil(show.top.ply / 2)}{show.top.ply % 2 === 0 ? '…' : '.'} {show.top.san}</button> : 'no standout'} {show?.top ? `- ${show.top.reason} The engine liked the move, and the next two reads held up.` : '- nothing stable stood out enough to call.'}</p>
            <p className="review-sub">🙈 Wish-you-had-it-back: {show?.back ? <button className="review-jump" onClick={() => goTo(show.back!.ply - 1)}>Move {Math.ceil(show.back.ply / 2)}{show.back.ply % 2 === 0 ? '…' : '.'} {show.back.san}</button> : 'nothing with a stable number'} {show?.back ? `- engine read ${fmtLoss(show.back.loss)}${show.back.best ? `; Chester's pick there was ${show.back.best}` : ''}.` : show?.fixables.length ? '- your misses here sit on unstable engine reads at capped depth, so no numbers on them; they are in Fix your mistakes below if you fancy the practice.' : '- no big mistakes from you in this one.'}</p>
          </>}
        <p className="review-sub review-sub--fine">For fun, not to be taken seriously - the measured numbers are below.</p>
      </section>

      <section className="review-walk">
        <TapBoard fen={retryFen ?? (retryMode ? ply.fenBefore : walkIdx < 0 && startFen ? startFen : ply.fenAfter)} orientation={review.meta.userColor} locked={retryMode === null} lastMove={retryMode || walkIdx < 0 ? null : lastFromTo} label="Game position" onMove={retryMode ? tryRetry : undefined} />
        <p className="review-walkpos review-walkpos--solo">{walkIdx < 0 ? 'Start' : `${Math.ceil(ply.ply / 2)}. ${ply.mover === 'w' ? '' : '…'}${ply.san}`}</p>
        <div className="review-walkbar">
          <button className="lab-btn" aria-label="Back to the start" onClick={() => goTo(-1)} disabled={walkIdx <= -1}>⏮</button>
          <button className="lab-btn" aria-label="Rewind one move" onClick={() => goTo(Math.max(-1, walkIdx - 1))} disabled={walkIdx <= -1}>⏪</button>
          <button className="lab-btn lab-btn--go" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? '⏸' : walkIdx >= review.plies.length - 1 ? '▶ Replay' : '▶'}</button>
          <button className="lab-btn" aria-label="Fast forward one move" onClick={() => goTo(Math.min(review.plies.length - 1, walkIdx + 1))} disabled={walkIdx >= review.plies.length - 1}>⏩</button>
        </div>
        {walkIdx < 0
          ? <p className="review-sub">At the starting position. Press ▶ for the highlight show, or step through with ⏪ ⏩ - pause any time to study a position with Chester.</p>
          : <div>
              <p className="review-sub"><b>{playing ? 'Now playing' : 'Paused at'} move {Math.ceil(ply.ply / 2)}{ply.mover === 'b' ? '…' : ''}.</b>{' '}
                {ply.terminal === 'mate'
                  ? `${ply.isUser ? 'You' : review.meta.opponent} played ${ply.san} - checkmate on the board, game over. That is a fact, not an engine grade.`
                  : ply.terminal === 'draw'
                    ? `${ply.isUser ? 'You' : review.meta.opponent} played ${ply.san} and the game is drawn here. That is a fact, not an engine grade.`
                  : ply.terminal === 'settled'
                    ? `${ply.isUser ? 'You' : review.meta.opponent} played ${ply.san} and the game ends here: ${review.meta.termination || 'game over'}. A proven result, not an engine grade - the position itself was not played out.`
                    : `${ply.isUser ? 'Your' : `${review.meta.opponent}'s`} ${ply.san} graded ${gradeChip(ply).label}${ply.provisional ? ' (unconfirmed)' : ''}${!sc[walkIdx]?.unstable && ply.evalDelta != null && ply.evalDelta > 30 ? ` - engine read ${fmtLoss(ply.evalDelta)}` : ''}.${whyFor(ply) ? ` ${whyFor(ply)}` : ''}`}</p>
              {(() => {
                const e = sc[walkIdx];
                if (!e) return null;
                if (ply.terminal === 'mate') return <p className="review-sub">Scorecard: settled - {ply.mover === review.meta.userColor ? 'you win' : `${review.meta.opponent} wins`}. 100/0, proven by the board.</p>;
                if (ply.terminal === 'draw') return <p className="review-sub">Scorecard: DRAW - the game finished level; no winning chances remain.</p>;
                if (ply.terminal === 'settled') return <p className="review-sub">Scorecard: settled - {review.meta.result === 'win' ? 'you win' : `${review.meta.opponent} wins`}{endPhrase(review.meta.termination) ? ` ${endPhrase(review.meta.termination)}` : ''}. The result is proven; the position itself was not played out.</p>;
                if (e.unstable) return <p className="review-sub">Scorecard: unavailable here - the engine's reads around this move are unstable at capped depth, so no number is shown.</p>;
                if (ply.mateInAfter != null) return <p className="review-sub">Scorecard: the engine reads mate in {Math.abs(ply.mateInAfter)} for {(ply.mateInAfter > 0) === (ply.mover === review.meta.userColor) ? 'you' : review.meta.opponent} - an engine read, not yet on the board, so no number is shown.</p>;
                if (e.userPct == null) return null;
                return <p className="review-sub">Scorecard: {e.userPct}/100 leaning your way{e.delta != null && e.delta !== 0 ? ` (${e.delta > 0 ? '+' : ''}${e.delta} points after that move)` : ''}.</p>;
              })()}
              {!playing && !ply.terminal && ply.bestMoveSan && ply.bestMoveSan !== ply.san && <>
                <button className="lab-btn" onClick={() => setCwhd((v) => !v)}>{cwhd ? 'Hide it again' : 'Chester would have done (CWHD)'}</button>
                {cwhd && <p className="review-sub review-sub--good">{bestMovePoint(ply) ? `Chester would have played ${ply.bestMoveSan}. ${bestMovePoint(ply)}` : `Chester's engine pick is ${ply.bestMoveSan}. I don't yet have a checked explanation of why.`}</p>}
              </>}
            </div>}
        <p className="review-sub review-sub--fine">Scorecard is a rough advantage gauge, not a win probability: the engine's evaluation is mapped onto a 0-100 scale (50 = balanced, draws included) via the published Lichess formula. Only a result on the board is proven. Positions whose reads are unstable at capped depth show no number.</p>
        {walkIdx >= 0 && <div className={`review-chip review-chip--${gradeChip(ply).bad ? 'bad' : 'ok'}`}>
          {ply.isUser ? 'Your move' : 'Their move'} · {gradeChip(ply).label}{ply.provisional && !ply.terminal ? ' (unconfirmed)' : ''}
          {!sc[walkIdx]?.unstable && ply.evalDelta != null && ply.evalDelta > 30 ? ` · engine read ${fmtLoss(ply.evalDelta)}` : ''}
          {ply.bestMoveSan && (ply.classification === 'MISTAKE' || ply.classification === 'BLUNDER' || ply.classification === 'INACCURACY') ? ` · better: ${ply.bestMoveSan}` : ''}
        </div>}
        {walkIdx >= 0 && ply.provisional && <p className="review-sub review-sub--fine">This grade came from the quick pass - the deeper double-check was inconclusive, so treat it as a maybe, and it has not been banked as a puzzle.</p>}
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
          <b>{tp.ply.san}{!sc[tp.ply.ply - 1]?.unstable && tp.ply.evalDelta != null ? ` (${fmtLoss(tp.ply.evalDelta)})` : ''}{tp.ply.provisional ? ' - unconfirmed' : ''}</b>
          <span>{tp.kind === 'missed'
            ? [whyFor(tp.ply), bestMovePoint(tp.ply) || (!whyFor(tp.ply) ? `The engine preferred ${tp.ply.bestMoveSan || 'another move'} here.` : null)].filter(Boolean).join(' ') + ' Tap to stand at that moment.'
            : `${review.meta.opponent} slipped here${tp.ply.bestMoveSan ? ` - ${tp.ply.bestMoveSan} was the way to punish it` : ''}.`}</span>
        </button>)}
      </section>}

      {measures && measures.user.graded > 0 && <section>
        <h2 className="review-h2">Chester's verdict</h2>
        {measures.user.graded >= 6
          ? <p className="review-sub">You: “{verdictFor(measures.user)}” · {review.meta.opponent}: “{verdictFor(measures.opp)}”</p>
          : <p className="review-sub">Only {measures.user.graded} of your moves got graded here - too short a game for a verdict.</p>}
        <p className="review-sub review-sub--fine">Behind the cheek, the measured numbers: your moves lost {measures.user.avgLossCp != null ? `${(measures.user.avgLossCp / 100).toFixed(1)} pawns` : 'an unmeasurable amount'} on average over {measures.user.graded} graded moves ({measures.user.blunders} blunder{measures.user.blunders === 1 ? '' : 's'}, {measures.user.mistakes} mistake{measures.user.mistakes === 1 ? '' : 's'}); theirs lost {measures.opp.avgLossCp != null ? `${(measures.opp.avgLossCp / 100).toFixed(1)} pawns` : 'an unmeasurable amount'} over {measures.opp.graded}. One game, one engine, capped depth - a snapshot of this game, not a rating.</p>
      </section>}

      {clock && clock.avgSecPerMove != null && <section>
        <h2 className="review-h2">Your clock</h2>
        <p className="review-sub">About {clock.avgSecPerMove}s a move on average{clock.avgOpening != null ? `, ${clock.avgOpening}s in the opening` : ''}{clock.avgMiddle != null ? `, ${clock.avgMiddle}s later on` : ''}.
          {clock.rushedCount > 0 ? ` You played ${clock.rushedCount} move${clock.rushedCount === 1 ? '' : 's'} in under 10 seconds${clock.rushedMistakes > 0 ? ` - ${clock.rushedMistakes} of them graded as slips in this one game` : ' and none of them hurt you here'}.` : ''}
          {clock.rushedMistakes > 0 ? ' One game is a tiny sample - but it is worth checking whether slowing down at the tense moments helps.' : ''}</p>
      </section>}

      {show && walkIdx >= review.plies.length - 1 && <section>
        <h2 className="review-h2">Fix your mistakes</h2>
        {show.fixables.length > 0 ? <>
        <p className="review-sub">Only here at the end: stand in the position just before your move and find the better one. Tap a card, then tap a piece and where it goes.</p>
        {show.fixables.map((f) => <button key={f.ply.ply} className="lab-card" onClick={() => startFix(f.ply.ply)}>
          <b>Move {Math.ceil(f.ply.ply / 2)}{f.ply.mover === 'b' ? '…' : ''} · {f.ply.san}</b>
          <span>{f.ply.classification === 'BLUNDER' ? 'Blunder' : 'Mistake'}{f.stable && f.ply.evalDelta != null && f.ply.evalDelta > 30 ? ` · engine read ${fmtLoss(f.ply.evalDelta)}` : ''} - try the position yourself</span>
        </button>)}
        </> : <p className="review-sub">Nothing to fix from this one - no confirmed big mistakes on your side of the scoresheet.</p>}
      </section>}

      <section className="review-row">
        <button className="lab-btn" onClick={() => { setStage('pick'); setReview(null); }}>Another game</button>
        <Link href="/puzzle-mill" className="lab-btn lab-btn--go">Fix slips in the Puzzle Mill</Link>
      </section>
      <p className="review-sub review-sub--fine">Prototype notes: reviews are stored only on this device (last 8). Grades are one engine's measurements at capped depth; “why” comments are pattern reading, not proof. Archive data can lag up to ~12h and is what Chess.com publishes - recent games may be missing.</p>
    </>}
  </main>;
}
