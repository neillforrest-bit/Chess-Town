const g = require('/tmp/mvout/lib/game.js');
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL:', n); } };
const PICKS = ['Slow-Burn Dread', 'Heist Chemistry', 'Doomed Romance'];
function room(code) {
  let s = g.newState(code);
  s = g.reduce(s, { t: 'join', pid: 'A', name: 'Ann' });
  s = g.reduce(s, { t: 'join', pid: 'B', name: 'Bob' });
  return s;
}
// 1. Cold Open handshake: direct tropes, no auto-start, taste from BOTH starts the draft (via discovery pend)
{
  let s = room('CO1');
  ok(s.phase === 'vibe', 'joined into vibe');
  s = g.reduce(s, { t: 'sliders', pid: 'A', v: [50, 50, 50], actors: 'Florence Pugh' });
  s = g.reduce(s, { t: 'sliders', pid: 'B', v: [60, 40, 70], actors: '' });
  ok(s.vibe.disc === 'req', 'both sliders in -> TMDB discovery requested');
  s = g.reduce(s, { t: 'tropes', pid: 'A', picks: PICKS });
  ok(!s.vibe.passed, 'one side tropes: not passed yet');
  s = g.reduce(s, { t: 'tropes', pid: 'B', picks: ['Neon-Soaked Nights', 'Mind-Bending Twists', 'Cosmic Awe'] });
  ok(s.vibe.passed, 'both tropes in -> passed');
  ok(s.phase === 'vibe', 'Cold Open: no auto-start without swiper lock');
  s = g.reduce(s, { t: 'taste', pid: 'A', tags: ['Horror', 'Thriller', 'Award winner'], nos: ['Musical'], actor: 'Florence Pugh' });
  ok(s.phase === 'vibe', 'one taste: draft not started');
  s = g.reduce(s, { t: 'taste', pid: 'B', tags: ['Sci-fi', 'Mystery'], nos: [], actor: '' });
  ok(s.phase === 'vibe' && s.vibe.pend, 'both tastes: waits for pending discovery');
  s = g.reduce(s, { t: 'extras', movies: [] });
  ok(s.phase === 'draft', 'discovery answered -> draft starts');
  ok(s.draft.deck.length > 0, `deck built (${s.draft.deck.length} cards)`);
  ok(s.vibe.actors.A === 'Florence Pugh', 'actor carried through');
  ok(s.vibe.tastes.A.includes('Award winner'), 'award tag carried through');
}
// 2. Backward compat: swiper rooms still auto-start without taste intents
{
  let s = room('CO2');
  s = g.reduce(s, { t: 'sliders', pid: 'A', v: [50, 50, 50] });
  s = g.reduce(s, { t: 'sliders', pid: 'B', v: [50, 50, 50] });
  const names = [...g.TROPE_NAMES];
  for (const n of names.slice(0, 3)) { s = g.reduce(s, { t: 'vswipe', pid: 'A', name: n, yes: true }); s = g.reduce(s, { t: 'vswipe', pid: 'B', name: n, yes: true }); }
  ok(s.vibe.passed && s.vibe.lock.length === 3, 'swiper: 3 shared locks -> passed');
  ok(s.phase === 'vibe' && s.vibe.pend, 'swiper: discovery pending as before');
  s = g.reduce(s, { t: 'extras', movies: [] });
  ok(s.phase === 'draft', 'swiper room auto-starts after discovery, no taste intents needed');
}
// 3. tropes validation: exactly 3 valid names
{
  let s = room('CO3');
  s = g.reduce(s, { t: 'tropes', pid: 'A', picks: ['Not A Trope', 'Slow-Burn Dread'] });
  ok(!s.vibe.tropes?.A, 'invalid/short trope picks rejected');
}
// 4. no discovery (docs mode or second slider missing): taste completes directly
{
  let s = room('CO4');
  s = g.reduce(s, { t: 'tropes', pid: 'A', picks: PICKS });
  s = g.reduce(s, { t: 'tropes', pid: 'B', picks: PICKS });
  ok(s.vibe.passed && s.vibe.disc === 'off', 'no sliders -> no discovery requested');
  s = g.reduce(s, { t: 'taste', pid: 'A', tags: ['Horror'], nos: [], actor: '' });
  s = g.reduce(s, { t: 'taste', pid: 'B', tags: ['Drama'], nos: [], actor: '' });
  ok(s.phase === 'draft', 'no discovery pending -> draft starts on second taste');
}
console.log(`PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
