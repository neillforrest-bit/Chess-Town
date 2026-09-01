export type ChesterDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type EngineTelemetry = {
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
};

const PRESETS: Record<ChesterDifficulty, { skill: number; elo: number; depth: number }> = {
  BEGINNER: { skill: 3, elo: 900, depth: 8 },
  INTERMEDIATE: { skill: 8, elo: 1350, depth: 11 },
  ADVANCED: { skill: 14, elo: 1750, depth: 14 },
  EXPERT: { skill: 20, elo: 2200, depth: 17 },
};

type Analysis = { score: number | null; pv: string[]; bestMove: string | null };

function classify(loss: number | null, isBestMove: boolean): EngineTelemetry['classification'] {
  if (loss === null) return 'GREAT';
  if (loss <= 5) return isBestMove ? 'BRILLIANT' : 'BEST';
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

  private async analyze(fen: string, difficulty: ChesterDifficulty): Promise<Analysis> {
    return this.enqueue(async () => {
      await this.initialize();
      const worker = this.worker;
      if (!worker) throw new Error('Stockfish worker is unavailable');
      const preset = PRESETS[difficulty];
      return new Promise<Analysis>((resolve, reject) => {
        let latest: Analysis = { score: null, pv: [], bestMove: null };
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
            if (scoreMatch) latest.score = scoreMatch[1] === 'mate' ? Number(scoreMatch[2]) * 100000 : Number(scoreMatch[2]);
            if (pvMatch) latest.pv = pvMatch[1].split(' ');
          }
          if (line.startsWith('bestmove ')) {
            window.clearTimeout(timeout);
            worker.removeEventListener('message', onMessage);
            latest.bestMove = line.split(' ')[1] || null;
            resolve(latest);
          }
        };
        worker.addEventListener('message', onMessage);
        worker.postMessage(`setoption name Skill Level value ${preset.skill}`);
        worker.postMessage('setoption name UCI_LimitStrength value true');
        worker.postMessage(`setoption name UCI_Elo value ${preset.elo}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${preset.depth}`);
      });
    });
  }

  async evaluateMove(input: { fenBefore: string; fenAfter: string; san: string; uci: string; playerColor: 'w' | 'b'; difficulty: ChesterDifficulty }): Promise<EngineTelemetry> {
    const before = await this.analyze(input.fenBefore, input.difficulty);
    const after = await this.analyze(input.fenAfter, input.difficulty);
    const delta = before.score === null || after.score === null ? null : input.playerColor === 'w' ? before.score - after.score : after.score - before.score;
    const loss = delta === null ? null : Math.max(0, delta);
    return {
      fenBefore: input.fenBefore, fenAfter: input.fenAfter, san: input.san, uci: input.uci,
      evaluationBefore: before.score, evaluationAfter: after.score, evalDelta: loss,
      classification: classify(loss, before.bestMove === input.uci), bestMove: before.bestMove,
      principalVariation: before.pv, alternateWinningLines: before.pv.length ? [before.pv.join(' ')] : [], engine: 'stockfish-18',
    };
  }

  async selectMove(fen: string, difficulty: ChesterDifficulty) {
    return (await this.analyze(fen, difficulty)).bestMove;
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