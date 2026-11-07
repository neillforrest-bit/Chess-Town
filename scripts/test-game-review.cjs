// No network or model calls. Run: node scripts/test-game-review.cjs [--engine]
const fs = require('fs'), path = require('path'), ts = require('typescript'), assert = require('node:assert/strict');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8').replace("'@/lib/road'", "'./road'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const { Chess } = require('chess.js');
const { analyzeGame, scorecard, loadReviews } = require('../src/lib/game-review.ts');
const { buildOpponentRows, durationMinutesFromPgn } = require('../src/lib/opponent-stats.ts');
const movesFor = (sans) => { const c = new Chess(); return sans.map((san, i) => { const fenBefore = c.fen(), m = c.move(san); return { ply: i + 1, san: m.san, uci: m.from + m.to + (m.promotion || ''), mover: m.color, fenBefore, fenAfter: c.fen(), clkSec: null }; }); };
const game = { url: 'test', userColor: 'w', result: 'win', termination: '' };
const base = { classification: 'BEST', evalDelta: 0, bestMoveSan: null, continuation: [], centipawns: 9999, mateIn: 99 };
(async () => {
  let i = 0;
  const mock = { evaluateMove: async () => ({ ...base, evaluationAfter: i++ ? -600 : 500, evaluationMateAfter: null }) };
  const r = await analyzeGame(mock, game, movesFor(['e4', 'e5']), () => {});
  assert.deepEqual(r.plies.map(p => p.whiteCpAfter), [500, -600]);
  assert.deepEqual(r.plies.map(p => p.mateInAfter), [null, null]);
  i = 0; mock.evaluateMove = async () => ({ ...base, evaluationAfter: null, evaluationMateAfter: i++ ? -3 : 4 });
  const mates = await analyzeGame(mock, game, movesFor(['e4', 'e5']), () => {});
  assert.deepEqual(mates.plies.map(p => p.mateInAfter), [4, 3]);
  const seq = movesFor(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5']);
  const synthetic = { meta: game, plies: seq.map((p, n) => ({ ...p, isUser: p.mover === 'w', whiteCpAfter: n < 2 ? 0 : 300, evalDelta: n === 2 ? 100 : 0, mateInAfter: null, classification: 'BEST' })) };
  assert.equal(scorecard(synthetic).filter(e => e.unstable).length, 3, 'flags spread only one ply from original seeds');
  global.localStorage = { getItem: (key) => key === 'ct-game-review-v1' ? JSON.stringify([r]) : null };
  assert.deepEqual(loadReviews(), [], 'legacy mixed-perspective reviews must not be returned');
  const pgn = (sd, ed, start, end) => `[UTCDate "${sd}"]\n[EndDate "${ed}"]\n[StartTime "${start}"]\n[EndTime "${end}"]`;
  assert.equal(durationMinutesFromPgn(pgn('2026.01.31', '2026.02.01', '23:58:00', '00:03:00')), 5);
  assert.equal(durationMinutesFromPgn(pgn('2026.01.31', '2026.02.02', '23:58:00', '00:03:00')), null);
  assert.equal(durationMinutesFromPgn(''), null);
  const g = { opponent: 'test', endTime: 1, result: 'win', opponentRating: 1000, timeClass: 'rapid', pgn: pgn('2026.01.31', '2026.01.31', '14:00:00', '14:01:30') };
  const row = buildOpponentRows([g, { ...g, timeClass: 'blitz', opponentRating: 200, endTime: 2 }, { ...g, timeClass: 'daily', endTime: 3 }])[0];
  assert.equal(row.timedGames, 2); assert.equal(row.totalMinutes, 3); assert.equal(row.rapidRating, 1000);
  console.log('PASS adapter perspective, mate perspective, bounded suppression, v1 cache exclusion, duration coverage, rapid-only encounter rating');
  if (!process.argv.includes('--engine')) return;
  const { spawn } = require('node:child_process'), { createInterface } = require('node:readline');
  global.window = global;
  class EngineWorker {
    constructor() { this.listeners = new Set(); this.child = spawn(process.execPath, [path.resolve(__dirname, '../public/stockfish/stockfish.js')]); createInterface({ input: this.child.stdout }).on('line', data => { this.onmessage?.({ data }); for (const f of this.listeners) f({ data }); }); this.child.stderr.on('data', d => process.stderr.write(d)); }
    postMessage(s) { this.child.stdin.write(s + '\n'); }
    addEventListener(_, f) { this.listeners.add(f); } removeEventListener(_, f) { this.listeners.delete(f); } terminate() { this.child.kill(); }
  }
  global.Worker = EngineWorker;
  const { StockfishClient } = require('../src/lib/stockfish.ts');
  async function run(sans) { const engine = new StockfishClient(); try { let t; for (const m of movesFor(sans)) t = await engine.evaluateMove({ ...m, playerColor: m.mover, difficulty: 'EXPERT' }); return t; } finally { engine.dispose(); } }
  const blackCapture = await run(['e4', 'e5', 'Qh5', 'Nc6', 'Qxe5+', 'Nxe5']); assert(blackCapture.evaluationAfter < -400);
  const whiteCapture = await run(['e4', 'e5', 'Nc3', 'Qh4', 'Nf3', 'Qxe4+', 'Nxe4']); assert(whiteCapture.evaluationAfter > 400);
  assert((await run(['f3', 'e5', 'g4', 'Qh4#'])).evaluationMateAfter < 0);
  assert((await run(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'])).evaluationMateAfter > 0);
  const c = new Chess(); c.clear(); c.put({ type: 'k', color: 'b' }, 'a8'); c.put({ type: 'k', color: 'w' }, 'c6'); c.put({ type: 'q', color: 'w' }, 'c7'); const fenBefore = c.fen(), m = c.move('Qb6'); assert(c.isStalemate());
  const engine = new StockfishClient(); try { const d = await engine.evaluateMove({ fenBefore, fenAfter: c.fen(), san: m.san, uci: m.from + m.to, playerColor: 'w', difficulty: 'EXPERT' }); assert(d.evaluationAfter === 0); assert.equal(d.evaluationMateAfter, null); } finally { engine.dispose(); }
  console.log('PASS actual bundled engine: both queen-capture perspectives, both mate signs, board-verified stalemate');
})().catch(e => { console.error(e); process.exitCode = 1; });
