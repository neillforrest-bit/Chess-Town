const g = require('/tmp/mvout/lib/game.js');
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL:', n); } };
const IDS = Object.keys(g.BY_ID).map(Number).filter(id => !g.BY_ID[id].w).slice(0, 4);

function mkFinal(sealed) {
  const s = g.newState('REV1');
  s.players = { A: { name: 'Ann', joined: true }, B: { name: 'Bob', joined: true } };
  s.phase = 'final'; s.hr = { wilds: false, sealed };
  s.fin.a = IDS[0]; s.fin.b = IDS[1];
  s.purse = { A: 50, B: 50 };
  return s;
}
const R = (s, it) => g.reduce(s, it);

// 1. fcall validation: wrong ids rejected, double-call rejected
{
  let s = mkFinal(true);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[2], au: IDS[0] }); // cr not a finalist
  ok(!s.fin.calls.A, 'fcall: non-finalist critics pick rejected');
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[1] });
  ok(!!s.fin.calls.A, 'fcall: valid call accepted');
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[1], au: IDS[0] });
  ok(s.fin.calls.A.cr === IDS[0], 'fcall: second call ignored');
}
// 2. fchoice gated before reveal when sealed; open when unsealed; open after skip
{
  let s = mkFinal(true);
  s = R(s, { t: 'fchoice', pid: 'A', id: IDS[0] });
  ok(s.fin.choice.A === undefined, 'sealed: pick blocked before reveal');
  s = R(s, { t: 'fskip', pid: 'B' });
  ok(s.fin.revealed && s.fin.skipped, 'fskip: reveal marked skipped');
  s = R(s, { t: 'fchoice', pid: 'A', id: IDS[0] });
  ok(s.fin.choice.A === IDS[0], 'sealed: pick allowed after skip');
  let s2 = mkFinal(false);
  s2 = R(s2, { t: 'fchoice', pid: 'A', id: IDS[0] });
  ok(s2.fin.choice.A === IDS[0], 'unsealed: pick allowed immediately');
}
// 3. settlement: both scores present -> winner takes stake, loser pays
{
  let s = mkFinal(true);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[0] });
  s = R(s, { t: 'fcall', pid: 'B', cr: IDS[1], au: IDS[1] });
  s = R(s, { t: 'fsettle', a: { rt: 80, imdb: 7.5 }, b: { rt: 60, imdb: 7.5 } });
  ok(s.fin.revealed && !s.fin.skipped, 'settle: revealed');
  ok(s.purse.A === 60 && s.purse.B === 40, `settle: winner +10/loser -10 on critics, got A=${s.purse.A} B=${s.purse.B}`);
  ok(s.fin.callLog.some(l => l.includes('push')), 'settle: equal imdb = push, nobody wins by tie');
}
// 4. missing score -> void call, no chips move
{
  let s = mkFinal(true);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[0] });
  s = R(s, { t: 'fcall', pid: 'B', cr: IDS[1], au: IDS[1] });
  s = R(s, { t: 'fsettle', a: { rt: null, imdb: 7.0 }, b: { rt: 60, imdb: 6.0 } });
  ok(s.purse.A === 50 && s.purse.B === 40 + 10 - 10 + 10 || true, 'noop'); // placeholder replaced below
  ok(s.fin.callLog.some(l => l.includes('void')), 'settle: missing rt = void call');
  // imdb present both: A backed a(7.0), B backed b(6.0); a wins -> A +10, B -10 from 50s
  ok(s.purse.A === 60 && s.purse.B === 40, `settle: valid audience call settled, got A=${s.purse.A} B=${s.purse.B}`);
}
// 5. invalid scores rejected (out of range -> treated missing -> void)
{
  let s = mkFinal(true);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[0] });
  s = R(s, { t: 'fcall', pid: 'B', cr: IDS[1], au: IDS[1] });
  s = R(s, { t: 'fsettle', a: { rt: 140, imdb: 12 }, b: { rt: -5, imdb: 6.0 } });
  ok(s.purse.A === 50 && s.purse.B === 50, `settle: out-of-range scores (rt 140/-5, imdb 12) -> all void, zero chips move, got A=${s.purse.A} B=${s.purse.B}`);
  ok(s.fin.callLog.filter(l => l.includes('void')).length === 2, 'settle: both calls logged void');
}
// 6. fsettle requires both calls in
{
  let s = mkFinal(true);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[0] });
  s = R(s, { t: 'fsettle', a: { rt: 80, imdb: 7.5 }, b: { rt: 60, imdb: 6.0 } });
  ok(!s.fin.revealed, 'settle: cannot settle before both players call');
}
// 7. unsealed house rule: fcall/fsettle inert
{
  let s = mkFinal(false);
  s = R(s, { t: 'fcall', pid: 'A', cr: IDS[0], au: IDS[0] });
  ok(!s.fin.calls.A, 'unsealed: fcall inert');
}
console.log(`PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
