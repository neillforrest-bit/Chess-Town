// Duel + Discovery regression via API (post-pairs changes)
const BASE = 'http://localhost:3000';
const TEST_IP = '203.0.113.' + (1 + Math.floor(Math.random() * 250));
const failures = [];
const check = (n, ok, x = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + n + (x ? ' · ' + x : '')); if (!ok) failures.push(n); };
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function game(mode, genres) {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
  const t1 = hex(32), inv = hex(32), t2 = hex(32);
  let round = 0;
  const post = async (token, body) => {
    const r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': token, origin: BASE, 'x-forwarded-for': TEST_IP }, body: JSON.stringify({ round, actionId: hex(16), ...body }) });
    const j = await r.json();
    if (r.ok && j.v !== undefined) round = j.round;
    return { ok: r.ok, j };
  };
  const spec = async () => (await (await fetch(BASE + '/api/duo/' + code + '?spectate=1', { cache: 'no-store' })).json());
  let r = await post(t1, { type: 'create', name: 'Neill', invite: inv });
  if (!r.ok) return check(mode + ' create', false, JSON.stringify(r.j));
  r = await post(t2, { type: 'join', name: 'Jemma', invite: inv });
  r = await post(t1, { type: 'start' });
  r = await post(t1, { type: 'chooseMode', mode });
  check(mode + ' mode', r.ok && r.j.phase === 'genres');
  r = await post(t1, { type: 'chooseGenres', genres: genres[0] });
  check(mode + ' genres A', r.ok);
  r = await post(t2, { type: 'chooseGenres', genres: genres[1] });
  check(mode + ' genres B -> swipe', r.ok && r.j.phase === 'swipe' && r.j.shelf.length >= 4, r.ok ? 'shelf=' + r.j.shelf?.length + ' extras=' + (r.j.extras || []).length : JSON.stringify(r.j).slice(0, 200));
  if (!r.ok) return;
  const shelf = r.j.shelf;
  for (const [t, keepIdx] of [[t1, 4], [t2, 5]]) {
    for (let i = 0; i < shelf.length; i++) {
      const rr = await post(t, { type: 'opinion', id: shelf[i], op: i % 7 === 0 ? 'keep' : i % keepIdx === 0 ? 'seen' : 'pass' });
      if (!rr.ok) { check(mode + ' opinion', false, rr.j.error); return; }
    }
    r = await post(t, { type: 'finishSwipe' });
  }
  check(mode + ' reveal', r.ok && r.j.phase === 'reveal' && r.j.finalists.length >= 2, r.ok ? 'finalists=' + r.j.finalists?.length + ' sync=' + r.j.sync : JSON.stringify(r.j).slice(0, 200));
  if (mode === 'discovery') {
    const st = await spec();
    check('discovery spectate hides ops pre-reveal-ack', st.phase === 'reveal' && !!st.opsRevealed, 'opsRevealed=' + !!st.opsRevealed);
    return;
  }
  // duel: bout loop
  r = await post(t1, { type: 'ready' }); r = await post(t2, { type: 'ready' });
  check('duel bout 1', r.ok && r.j.phase === 'bout' && r.j.pair.length === 2);
  for (let g = 0; g < 12; g++) {
    const st = await spec();
    if (st.phase === 'confirm' || st.phase === 'done') break;
    if (st.phase === 'bout') {
      await post(t1, { type: 'pull', side: 0 }); await post(t2, { type: 'pull', side: 1 });
      await post(t1, { type: 'wild', kind: 'double' });
      await post(t1, { type: 'lockBout' });
      r = await post(t2, { type: 'lockBout' });
    } else if (st.phase === 'tie') {
      await post(t1, { type: 'tieChoose', id: -1 }); r = await post(t2, { type: 'tieChoose', id: -1 });
    } else if (st.phase === 'result') {
      await post(t1, { type: 'ready' }); r = await post(t2, { type: 'ready' });
    } else break;
    await sleep(200);
  }
  let st = await spec();
  check('duel reaches confirm', st.phase === 'confirm', 'phase=' + st.phase);
  await post(t1, { type: 'confirm' }); r = await post(t2, { type: 'confirm' });
  check('duel done with winner', r.ok && r.j.phase === 'done' && r.j.winner != null, r.ok ? 'winner=' + r.j.winner : JSON.stringify(r.j).slice(0, 150));
  st = await spec();
  check('spectate strips secrets', st.tvInvite === undefined && !st.inviteHash && st.seats.every((p) => p.hash === undefined));
}

await game('duel', [['Gripping'], ['Comfort']]);
await game('discovery', [['Comedy', 'Thriller'], ['Drama']]);
console.log(failures.length ? 'FAILURES: ' + failures.join(' | ') : 'ALL DUO REGRESSION PASSED');
process.exit(failures.length ? 1 : 0);