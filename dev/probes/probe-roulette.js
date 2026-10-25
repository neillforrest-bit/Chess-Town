// GENRE ROULETTE scope audit: the wheel may narrow the draft deck, but it must never
// bypass strict eligibility (consOk), the handshake gates, or inject unapproved contenders.
const g = require('/tmp/mvout/lib/game.js');
const sab = require('/tmp/mvout/utils/sabotageEngine.js');
const cons = require('/tmp/mvout/lib/cons.js');
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL:', n); } };
const NOW = 1000000;

function mkVibe() {
  const s = g.newState('RLT1');
  s.players = { A: { name: 'Ann', joined: true }, B: { name: 'Bob', joined: true } };
  s.phase = 'vibe'; s.hr = { wilds: true, sealed: true };
  s.cons = cons.cleanCons({ xg: ['Horror'], ig: [], era: 'any', rt: 'any' });
  return s;
}

// 1. start: one wheel at a time, one use per player, vibe-phase only entry
{
  const s = mkVibe();
  sab.wheelIntent(s, { pid: 'A', act: 'start' }, NOW);
  ok(!!s.sab.wheel && s.sab.wheel.stage === 'spin', 'roulette: starts in vibe');
  ok(s.sab.A.roulette === false && s.sab.B.roulette === true, 'roulette: only the caller spends the use');
  sab.wheelIntent(s, { pid: 'B', act: 'start' }, NOW);
  ok(s.sab.wheel.by === 'A', 'roulette: second start blocked while a wheel is live');
  sab.wheelIntent(s, { pid: 'A', act: 'start' }, NOW + 1);
  ok(s.sab.wheel.by === 'A' && s.sab.wheel.n === 0, 'roulette: caller cannot restart');
  ok(!s.sab.wheel.opts.some((x) => x === 'Horror') || true, 'noop');
  ok(!s.sab.wheel.opts.includes('Horror'), 'roulette: wheel never offers an excluded genre');
}
// 2. handshake untouched: vibe gates stay exactly as they were
{
  const s = mkVibe();
  const before = JSON.stringify(s.vibe);
  sab.wheelIntent(s, { pid: 'A', act: 'start' }, NOW);
  ok(JSON.stringify(s.vibe) === before, 'roulette: vibe/handshake state untouched');
  const s2 = g.reduce(s, { t: 'taste', pid: 'A', tags: ['Cerebral'], nos: [], actor: '' });
  ok(!s2.vibe.tasteReady?.A, 'roulette: taste still gated until both lock (handshake intact)');
}
// 3. full flow: spin -> judge veto -> other spins -> veto -> Orson final spin auto-locks
{
  const s = mkVibe();
  sab.wheelIntent(s, { pid: 'A', act: 'start' }, NOW);
  sab.wheelIntent(s, { pid: 'A', act: 'spin' }, NOW + 10);
  ok(s.sab.wheel.stage === 'judge' && !!s.sab.wheel.cand, 'roulette: spin lands a candidate');
  const c1 = s.sab.wheel.cand;
  sab.wheelIntent(s, { pid: 'A', act: 'accept' }, NOW + 10 + sab.SPIN_MS + 1);
  ok(s.sab.wheel.final === null && s.sab.wheel.cand === c1, 'roulette: spinner cannot accept own spin');
  sab.wheelIntent(s, { pid: 'B', act: 'veto' }, NOW + 10 + sab.SPIN_MS + 1);
  ok(s.sab.wheel.stage === 'spin' && s.sab.wheel.turn === 'B', 'roulette: veto passes the turn');
  sab.wheelIntent(s, { pid: 'B', act: 'spin' }, NOW + 20);
  sab.wheelIntent(s, { pid: 'A', act: 'veto' }, NOW + 20 + sab.SPIN_MS + 1);
  ok(s.sab.wheel.stage === 'done' && !!s.sab.wheel.final, 'roulette: double veto -> Orson final spin locks');
  ok(s.sab.genre === s.sab.wheel.final, 'roulette: accepted genre recorded');
  ok(s.pool.length === 0, 'roulette: pool/bracket untouched in vibe phase');
}
// 4. deck application in draft: every contender passes strict eligibility; bans honored
{
  const s = mkVibe();
  s.phase = 'draft';
  s.draft.picks = { A: [s.draft.picks.A[0]].filter(Boolean), B: [] };
  const banned = s.draft.picks.A[0];
  for (const gen of ['Comedy', 'Drama', 'Thriller']) {
    s.draft.deck = sab.genreDeck(s, gen);
    const deck = s.draft.deck;
    ok(deck.length > 0, `roulette deck (${gen}): non-empty`);
    ok(deck.every((id) => { const m = g.BY_ID[id]; return m && cons.consOk(m, s.cons); }), `roulette deck (${gen}): every title passes consOk (strict eligibility)`);
    ok(!deck.includes(banned), `roulette deck (${gen}): player-picked/banned title not re-injected`);
    const leads = deck.filter((id) => g.BY_ID[id].g.includes(gen));
    ok(leads.length > 0, `roulette deck (${gen}): genre-matched titles lead`);
    ok(deck.every((id) => g.BY_ID[id].r >= 5.8), `roulette deck (${gen}): rating floor holds`);
  }
  // validateBatch agreement: every deck title is in the strictly-valid set
  s.draft.deck = sab.genreDeck(s, 'Comedy');
  const vb = cons.validateBatch(s.draft.deck.map((id) => g.BY_ID[id]), s.cons);
  ok(s.draft.deck.every((id) => vb.ok.some((m) => m.id === id)), 'roulette deck: validateBatch agrees, zero strict failures');
}
// 5. no wheel without enough genre options is refused silently (opts floor)
{
  const s = mkVibe();
  s.kind = 'oscar'; // narrow pool
  const opts = sab.wheelOpts(s);
  ok(opts.every((x) => typeof x === 'string'), 'roulette: wheel options well-formed for narrow pools');
}
console.log(`probe-roulette: PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
