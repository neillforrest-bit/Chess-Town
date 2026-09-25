export type ChesterDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type EngineEvaluation = {
  evalScore: number | string | null;
  bestMove: { uci: string | null; san: string | null };
  evalDelta: number | null;
  moveQuality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
};

export type EngineTelemetry = {
  evalScore: number | string | null;
  bestMoveSan: string | null;
  moveQuality: EngineEvaluation['moveQuality'];
  fenBefore: string;
  fenAfter: string;
  san: string;
  uci: string;
  evaluationBefore: number | null;
  evaluationAfter: number | null;
  evalDelta: number | null;
  classification: 'BRILLIANT' | 'BEST' | 'GREAT' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';
  bestMove: string | null;
  principalVariation: string[];
  alternateWinningLines: string[];
  engine: 'stockfish-18' | 'local-fallback';
  /** Exact centipawn score of the resulting position; null when a forced mate is found. */
  centipawns: number | null;
  /** Mate-in-X for the resulting position, from the side to move's perspective; null when no forced mate exists. */
  mateIn: number | null;
  /** Top recommended continuation line from the resulting position. */
  continuation: string[];
};

const PRESETS: Record<ChesterDifficulty, { skill: number; elo: number; depth: number }> = {
  // Play strength (how Chester moves). BEGINNER is deliberately soft - see the rookie
  // move picker in DojoEngine, which adds human mistakes on top.
  BEGINNER: { skill: 0, elo: 1320, depth: 4 },
  INTERMEDIATE: { skill: 5, elo: 1350, depth: 8 },
  ADVANCED: { skill: 12, elo: 1750, depth: 12 },
  EXPERT: { skill: 20, elo: 2400, depth: 15 },
};

// Grading strength (how moves are judged, hinted and scored). Always full power so the
// hint, the verdict and the eval bar are three reads of the SAME position by the SAME
// strong analyst - a hint can never come back graded as a bad move.
export const ANALYST_PRESET: ChesterDifficulty = 'EXPERT';
export const ANALYST_DEPTH = 12;

type AnalysisLine = { score: number | null; mate: number | null; pv: string[] };
type Analysis = { score: number | null; mate: number | null; pv: string[]; bestMove: string | null; lines: Record<number, AnalysisLine> };

function classify(loss: number | null, isBestMove: boolean, firstChoiceGap: number | null, foundForcedMate: boolean): EngineTelemetry['classification'] {
  if (loss === null) return 'GREAT';
  // TOP DOG stays rare (owner calibration, batch 43): the engine's first choice earns the
  // crown only when it was a genuine find - a forced mate, or the only strong move with the
  // second-best line clearly worse. An obvious best move in a wide-open position (or one
  // among several mates) reads BEST ("SPOT ON") instead. Genuine sound sacrifices keep their
  // own BRILLIANT bell in DojoEngine.
  if (loss <= 5) {
    if (isBestMove && (foundForcedMate || (firstChoiceGap !== null && firstChoiceGap >= 150))) return 'BRILLIANT';
    return 'BEST';
  }
  if (loss <= 30) return 'GREAT';
  if (loss <= 100) return 'INACCURACY';
  if (loss <= 250) return 'MISTAKE';
  return 'BLUNDER';
}

export class StockfishClient {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  private async initialize() {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker('/stockfish/stockfish.js');
      const timeout = window.setTimeout(() => reject(new Error('Stockfish initialization timed out')), 8000);
      worker.onmessage = (event: MessageEvent<string>) => {
        if (event.data === 'uciok') {
          worker.postMessage('isready');
        }
        if (event.data === 'readyok') {
          window.clearTimeout(timeout);
          this.worker = worker;
          resolve();
        }
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Stockfish worker failed to load'));
      };
      worker.postMessage('uci');
    });
    try {
      await this.ready;
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  private enqueue<T>(task: () => Promise<T>) {
    const result = this.queue.then(task, task);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async analyze(fen: string, difficulty: ChesterDifficulty, depthOverride?: number, limitStrength = true, multiPv = 1): Promise<Analysis> {
    return this.enqueue(async () => {
      await this.initialize();
      const worker = this.worker;
      if (!worker) throw new Error('Stockfish worker is unavailable');
      const preset = PRESETS[difficulty];
      return new Promise<Analysis>((resolve, reject) => {
        const latest: Analysis = { score: null, mate: null, pv: [], bestMove: null, lines: {} };
        const timeout = window.setTimeout(() => {
          worker.removeEventListener('message', onMessage);
          worker.postMessage('stop');
          reject(new Error('Stockfish analysis timed out'));
        }, 9000);
        const onMessage = (event: MessageEvent<string>) => {
          const line = event.data;
          if (line.startsWith('info ') && line.includes(' pv ')) {
            const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
            const pvMatch = line.match(/\bpv (.+)$/);
            const mpvMatch = line.match(/\bmultipv (\d+)/);
            const slot = mpvMatch ? Number(mpvMatch[1]) : 1;
            const entry: AnalysisLine = latest.lines[slot] || { score: null, mate: null, pv: [] };
            if (scoreMatch) {
              if (scoreMatch[1] === 'mate') { entry.mate = Number(scoreMatch[2]); entry.score = null; }
              else { entry.score = Number(scoreMatch[2]); entry.mate = null; }
            }
            if (pvMatch) entry.pv = pvMatch[1].split(' ');
            latest.lines[slot] = entry;
            if (slot === 1) { latest.score = entry.score; latest.mate = entry.mate; latest.pv = entry.pv; }
          }
          if (line.startsWith('bestmove ')) {
            window.clearTimeout(timeout);
            worker.removeEventListener('message', onMessage);
            latest.bestMove = line.split(' ')[1] || null;
            resolve(latest);
          }
        };
        worker.addEventListener('message', onMessage);
        if (limitStrength) {
          worker.postMessage(`setoption name Skill Level value ${preset.skill}`);
          worker.postMessage('setoption name UCI_LimitStrength value true');
          worker.postMessage(`setoption name UCI_Elo value ${preset.elo}`);
        } else {
          worker.postMessage('setoption name UCI_LimitStrength value false');
          // Worker options persist across calls, and Skill Level applies independently of
          // UCI_LimitStrength: a prior play-strength selectMove (e.g. ROOKIE skill 0) would
          // otherwise leave the "full strength" analyst run shuffling root moves, returning a
          // random bestmove and fictional PVs. Restore full skill for every analyst call.
          worker.postMessage('setoption name Skill Level value 20');
        }
        // Worker options persist across calls (the skill-level lesson): MultiPV must be
        // reset explicitly on every run, or a grading call's MultiPV 2 leaks into play strength.
        worker.postMessage(`setoption name MultiPV value ${multiPv}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depthOverride ?? preset.depth}`);
      });
    });
  }

  async evaluateMove(input: { fenBefore: string; fenAfter: string; san: string; uci: string; playerColor: 'w' | 'b'; difficulty: ChesterDifficulty }): Promise<EngineTelemetry> {
    void input.difficulty; // grading always runs at analyst strength for verdict integrity
    const before = await this.analyze(input.fenBefore, ANALYST_PRESET, ANALYST_DEPTH, false, 2);
    // Loss is computed inside ONE search whenever possible, so two independent searches can
    // never disagree a good move into a bad grade (cross-search noise lesson). The played
    // move equal to the engine's first choice is loss 0 by definition; when it is the
    // MultiPV-2 line, the loss is the same-search gap to the first choice; only moves outside
    // the top 2 fall back to the before/after two-search delta.
    const isBestMove = before.bestMove === input.uci;
    const second = before.lines[2];
    const playedLine: AnalysisLine | null = isBestMove
      ? { score: before.score, mate: before.mate, pv: before.pv }
      : second && second.pv[0] === input.uci
        ? second
        : null;
    let loss: number | null;
    let continuation: string[];
    let afterScore: number | null;
    let afterMate: number | null;
    if (isBestMove) {
      loss = 0;
      continuation = before.pv.slice(1);
      afterScore = before.score;
      afterMate = before.mate;
    } else if (playedLine) {
      loss = before.score === null || playedLine.score === null
        ? null
        : Math.max(0, before.score - playedLine.score);
      continuation = playedLine.pv.slice(1);
      afterScore = playedLine.score;
      afterMate = playedLine.mate;
    } else {
      const after = await this.analyze(input.fenAfter, ANALYST_PRESET, ANALYST_DEPTH, false);
      // Stockfish reports scores relative to the SIDE TO MOVE. Before a move and after it the
      // side to move flips, so the centipawn loss of the played move is before + after
      // (same formula for both colours).
      const delta = before.score === null || after.score === null ? null : before.score + after.score;
      loss = delta === null ? null : Math.max(0, delta);
      continuation = after.pv;
      afterScore = after.score;
      afterMate = after.mate;
    }
    // Rarity inputs for the crown: the same-search gap to the second line (only meaningful
    // when the played move IS the first choice), and whether a forced mate was found and the
    // second line is not an equally fast mate.
    const secondLine = before.lines[2];
    const firstChoiceGap = isBestMove && before.score !== null && secondLine?.score !== null && secondLine?.score !== undefined
      ? Math.max(0, before.score - secondLine.score)
      : null;
    const foundForcedMate = isBestMove && before.mate !== null
      && !(secondLine && secondLine.mate !== null && secondLine.mate <= before.mate + 1);
    const classification = classify(loss, isBestMove, firstChoiceGap, foundForcedMate);
    const stmAfter = input.fenAfter.split(/\s+/)[1];
    const absAfter = afterScore === null ? null : stmAfter === 'b' ? -afterScore : afterScore;
    const absMateAfter = afterMate === null ? null : stmAfter === 'b' ? -afterMate : afterMate;
    return {
      evalScore: absMateAfter === null ? (absAfter === null ? null : absAfter / 100) : `M${absMateAfter}`,
      bestMoveSan: before.pv[0] || null,
      moveQuality: classification === 'BRILLIANT' || classification === 'BEST'
        ? 'best'
        : classification === 'GREAT'
          ? 'good'
          : classification.toLowerCase() as 'inaccuracy' | 'mistake' | 'blunder',
      fenBefore: input.fenBefore, fenAfter: input.fenAfter, san: input.san, uci: input.uci,
      evaluationBefore: before.score, evaluationAfter: afterScore, evalDelta: loss,
      classification, bestMove: before.bestMove,
      principalVariation: before.pv, alternateWinningLines: before.pv.length ? [before.pv.join(' ')] : [], engine: 'stockfish-18',
      centipawns: afterScore, mateIn: afterMate, continuation,
    };
  }

  async selectMove(fen: string, difficulty: ChesterDifficulty) {
    return (await this.analyze(fen, difficulty)).bestMove;
  }

  async analyzePosition(fen: string, difficulty: ChesterDifficulty) {
    return this.analyze(fen, difficulty);
  }

  async analyzeForDisplay(fen: string) {
    return this.analyze(fen, ANALYST_PRESET, ANALYST_DEPTH, false);
  }

  async diagnose() {
    const analysis = await this.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'BEGINNER');
    if (!analysis.bestMove) throw new Error('Stockfish did not return a UCI bestmove');
    return { initialized: true, uci: true, ready: true, fenEvaluation: analysis.score, bestMove: analysis.bestMove };
  }

  dispose() {
    this.worker?.postMessage('quit');
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}

let sharedClient: StockfishClient | null = null;
export function getStockfishClient() {
  sharedClient ??= new StockfishClient();
  return sharedClient;
}

export function disposeStockfishClient() {
  sharedClient?.dispose();
  sharedClient = null;
}