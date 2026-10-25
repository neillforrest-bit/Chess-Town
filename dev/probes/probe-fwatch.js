// Viewing-confirmation ruling: the bracket crowns a champion (s.winner), but tonight's
// actual viewing (s.tonight) is only ever set when BOTH players explicitly pick the same film.
const g = require('/tmp/mvout/lib/game.js');
const b8 = require('/tmp/mvout/lib/b8.js');
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL:', n); } };
const IDS = Object.keys(g.BY_ID).map(Number).filter(id => !g.BY_ID[id].w).slice(0, 4);

function mkDone() {
  const s = g.newState('FW1');
  s.players = { A: { name: 'Ann', joined: true }, B: { name: 'Bob', joined: true } };
  s.phase = 'done'; s.hr = { wilds: false, sealed: true };
  s.fin.a = IDS[0]; s.fin.b = IDS[1];
  s.fin.verdict = { winner: IDS[0], reason: 'bids decide: the final bout stands' };
  s.winner = IDS[0];
  return s;
}
const R = (s, it) => g.reduce(s, it);

// 1. non-finalist pick rejected
{
  let s = mkDone();
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[2] });
  ok(s.fin.watch.A === undefined && s.tonight === null, 'fwatch: non-finalist rejected');
}
// 2. agreement sets tonight; champion-accepted log
{
  let s = mkDone();
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[0] });
  ok(s.tonight === null, 'fwatch: one pick does not confirm');
  s = R(s, { t: 'fwatch', pid: 'B', id: IDS[0] });
  ok(s.tonight === IDS[0], 'fwatch: both agree -> tonight set');
  ok(s.log.some(l => l.includes('champion is accepted')), 'fwatch: champion-accepted logged');
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[1] });
  ok(s.tonight === IDS[0], 'fwatch: locked once confirmed');
}
// 3. split stays visibly unresolved; re-pick resolves
{
  let s = mkDone();
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[0] });
  s = R(s, { t: 'fwatch', pid: 'B', id: IDS[1] });
  ok(s.tonight === null, 'fwatch: split leaves tonight unset');
  ok(s.orson.line.includes('Sort it out'), 'fwatch: split Orson line visible');
  ok(s.winner === IDS[0], 'fwatch: split does not touch the champion');
  s = R(s, { t: 'fwatch', pid: 'B', id: IDS[0] });
  ok(s.tonight === IDS[0], 'fwatch: re-pick resolves the split');
}
// 4. overruling the champion keeps the crown but changes the sofa
{
  let s = mkDone();
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[1] });
  s = R(s, { t: 'fwatch', pid: 'B', id: IDS[1] });
  ok(s.tonight === IDS[1] && s.winner === IDS[0], 'fwatch: overrule sets tonight, keeps champion');
  ok(s.log.some(l => l.includes('overruled the bracket')), 'fwatch: overrule logged with crown kept');
}
// 5. no confirmation without a verdict
{
  let s = mkDone(); s.fin.verdict = null;
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[0] });
  ok(s.fin.watch.A === undefined, 'fwatch: blocked before verdict');
}
// 6. nuclear veto double-agree IS the confirmation; defuse keeps things unresolved
{
  let s = mkDone();
  s.reroll = { stage: 'pick', votes: { A: true, B: true }, tropes: [], pk: { A: [], B: [] }, uv: { A: 'titan' }, ult: { rant: 'x', titan: { id: IDS[2], why: 'y' }, gem: { id: IDS[3], why: 'z' } }, at: Date.now() };
  b8.nukePick(s, { pid: 'B', which: 'titan' });
  ok(s.winner === IDS[2] && s.tonight === IDS[2], 'nukepick: double-agree crowns AND confirms');
  let s2 = mkDone();
  s2.reroll = { stage: 'pick', votes: { A: true, B: true }, tropes: [], pk: { A: [], B: [] }, uv: { A: 'titan' }, ult: { rant: 'x', titan: { id: IDS[2], why: 'y' }, gem: { id: IDS[3], why: 'z' } }, at: Date.now() };
  b8.nukePick(s2, { pid: 'B', which: 'gem' });
  ok(s2.winner === IDS[0] && s2.tonight === null, 'nukepick: defused veto keeps champion, viewing still unconfirmed');
}
// 7. rematch resets tonight and watch picks
{
  let s = mkDone();
  s.fin.loser = 'B';
  s = R(s, { t: 'fwatch', pid: 'A', id: IDS[0] });
  s = R(s, { t: 'rematch', pid: 'B' });
  ok(s.tonight === null && !s.fin.watch.A && s.phase === 'final', 'rematch: tonight and picks reset');
}
console.log(`probe-fwatch: PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
