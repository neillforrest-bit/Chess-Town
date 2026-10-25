const g = require('/tmp/mvout/lib/game.js');
const b8 = require('/tmp/mvout/lib/b8.js');
const IDS = Object.keys(g.BY_ID).map(Number).filter(id => !g.BY_ID[id].w).slice(0, 40);
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', name); } };

function mkState(code, wilds) {
  const s = g.newState(code);
  s.players = { A: { name: 'A', joined: true }, B: { name: 'B', joined: true } };
  s.phase = 'bracket';
  s.hr = { wilds, sealed: true };
  s.pool = IDS.slice(0, 10);
  return s;
}
function mkB8(s) {
  s.b8 = { matches: [], cur: 0, seed: {}, shield: {}, base: 0, conf: {}, purse: { A: 50, B: 50 }, buster: { A: true, B: true }, upsets: [], vetoLog: [], wilds: [], backed: { A: 0, B: 0 }, bonus: { A: 0, B: 0 }, show: null, wcard: { A: { pick: null, used: false }, B: { pick: null, used: false } }, ack: { A: true, B: true }, calls: { champ: {}, pick: { A: {}, B: {} }, score: { A: 0, B: 0 }, streak: { A: 0, B: 0 } } };
  return s.b8;
}
function mkMatch(i, a, b) {
  return { id: 'q' + i, round: 2, slot: i, a, b, seedA: 1, seedB: 2, status: 'PENDING', wg: {}, winner: null, via: null, wild: false, trivia: null, busting: null, nextAt: null };
}

// 1+2: wildcard rolls across many seeds, strict vs opt-in
const strictKinds = new Set(), optKinds = new Set();
for (let t = 0; t < 400; t++) {
  for (const mode of [false, true]) {
    const s = mkState('PROBE' + t, mode); const b = mkB8(s);
    // a resolved match so Resurrection has a body to drag back
    const done = mkMatch(99, IDS[20], IDS[21]); done.status = 'RESOLVED'; done.winner = IDS[20];
    b.matches = [mkMatch(0, IDS[0], IDS[1]), done]; b.seed = { [IDS[0]]: 1, [IDS[1]]: 2, [IDS[20]]: 3, [IDS[21]]: 4 };
    const m = b.matches[0];
    const fired = b8.rollWildcard(s, b, m);
    if (fired) (mode ? optKinds : strictKinds).add(m.wc);
  }
}
ok(!strictKinds.has('swap') && !strictKinds.has('res'), 'strict: no swap/res entrants, got ' + [...strictKinds].join(','));
ok(optKinds.has('swap'), 'opt-in: GENRE SWAP can fire, got ' + [...optKinds].join(','));
ok(optKinds.has('res'), 'opt-in: Resurrection can fire, got ' + [...optKinds].join(','));
ok(strictKinds.size === 0 || [...strictKinds].every(k => k === 'blind'), 'strict: only blind or nothing');

// 3: swap origin - entrants are announced and logged, seeds/conf consistent
{
  let saw = null;
  for (let t = 0; t < 400 && !saw; t++) {
    const s = mkState('PROBE' + t, true); const b = mkB8(s);
    b.matches = [mkMatch(0, IDS[0], IDS[1])]; b.seed = { [IDS[0]]: 1, [IDS[1]]: 2 };
    if (b8.rollWildcard(s, b, s.b8.matches[0]) && s.b8.matches[0].wc === 'swap') saw = s;
  }
  ok(!!saw, 'opt-in: found a swap instance');
  if (saw) {
    const m = saw.b8.matches[0];
    ok(m.was && m.was.a === IDS[0] && m.was.b === IDS[1], 'swap: original matchup preserved in was');
    ok(saw.log.some(l => l.includes('Wildcard: GENRE SWAP')), 'swap: announced in log');
  }
}

// 4: bustDone strict - no replacement storms in
{
  const s = mkState('BUST1', false); const b = mkB8(s);
  const m = mkMatch(0, IDS[2], IDS[3]); m.busting = { by: 'A', id: IDS[2], at: 0 };
  b.matches = [m]; b.seed = { [IDS[2]]: 1, [IDS[3]]: 2 };
  const poolBefore = [...s.pool];
  b8.bustDone(s, 'roast', 1000);
  ok(m.a !== null && m.b !== null, 'bust strict: matchup still has both slots');
  ok(m.a === IDS[2] && m.b === IDS[3], 'bust strict: matchup unchanged, no unchosen replacement');
  ok(!m.wild, 'bust strict: no wildcard entrant flagged');
  ok(JSON.stringify(s.pool) === JSON.stringify(poolBefore), 'bust strict: pool unchanged');
}
// 5: bustDone opt-in - replacement comes from catalogue with ceremony
{
  const s = mkState('BUST2', true); const b = mkB8(s);
  const m = mkMatch(0, IDS[2], IDS[3]); m.busting = { by: 'A', id: IDS[2], at: 0 };
  b.matches = [m]; b.seed = { [IDS[2]]: 1, [IDS[3]]: 2 };
  b8.bustDone(s, 'roast', 1000);
  const cur = [m.a, m.b];
  ok(m.wild === true && !cur.includes(IDS[2]), 'bust opt-in: replacement entered as flagged wildcard');
  ok(sawLog(s, 'Bracket Buster'), 'bust opt-in: announced in log');
}
function sawLog(s, sub) { return s.log.some(l => l.includes(sub)); }

// 6: bracket construction - every entrant comes from the hit grid (player picks)
{
  const s = mkState('BR1', false);
  const picks = { A: IDS.slice(0, 5), B: IDS.slice(5, 10) };
  s.draft.picks = picks; s.now = 1000;
  b8.startHit(s, 1000);
  s.hit.weap.A.done = true; s.hit.weap.B.done = true;
  b8.resolveHit(s, 2000);
  b8.buildBracket(s, 3000);
  const grid = new Set(s.hit.grid);
  const entrants = s.b8.matches.flatMap(m => [m.a, m.b]).filter(x => x !== null);
  ok(entrants.length > 0 && entrants.every(id => grid.has(id)), 'bracket: all entrants from player-picked grid, got ' + entrants.length);
  // 6b: edge - 1v1 straight final when overlap/veto leaves one each
  const s2 = mkState('BR2', false);
  s2.draft.picks = { A: IDS.slice(0, 5), B: IDS.slice(0, 5) }; s2.now = 1000; // full overlap
  b8.startHit(s2, 1000);
  s2.hit.weap.A.veto = IDS[1]; s2.hit.weap.B.veto = IDS[2];
  s2.hit.weap.A.done = true; s2.hit.weap.B.done = true;
  b8.resolveHit(s2, 2000);
  b8.buildBracket(s2, 3000);
  const grid2 = new Set(s2.hit.grid);
  const ents2 = s2.b8.matches.flatMap(m => [m.a, m.b]).filter(x => x !== null);
  ok(ents2.every(id => grid2.has(id)), 'bracket edge: veto-trimmed bracket still all player-picked, got ' + ents2.length);
}
console.log(`PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
