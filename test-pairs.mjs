// Star Pairs end-to-end: API-driven game + real browser screenshots
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const SHOTS = '/home/sandbox/movie-time/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' · ' + extra : '')); if (!ok) failures.push(name); };
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t1 = hex(32), inv = hex(32), t2 = hex(32);
let round = 0;
async function post(token, body) {
  const r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': token, origin: BASE }, body: JSON.stringify({ round, actionId: hex(16), ...body }) });
  const j = await r.json();
  if (r.ok && j.v !== undefined) round = j.round;
  return { ok: r.ok, status: r.status, j };
}
const spec = async () => (await (await fetch(BASE + '/api/duo/' + code + '?spectate=1', { cache: 'no-store' })).json());

let r = await post(t1, { type: 'create', name: 'Neill', invite: inv });
check('create', r.ok, code);
r = await post(t2, { type: 'join', name: 'Jemma', invite: inv });
check('join', r.ok);
r = await post(t1, { type: 'start' });
check('start', r.ok);
r = await post(t1, { type: 'chooseMode', mode: 'pairs' });
check('chooseMode pairs', r.ok && r.j.phase === 'actors');
// actor search smoke (live TMDB)
r = await post(t1, { type: 'pairFindActors', q: 'Tom Hanks' });
check('actor search', r.ok && r.j.results?.length > 0, (r.j.results || []).map((x) => x.name).join(', '));
r = await post(t1, { type: 'pairActor', personId: 31, personName: 'Tom Hanks' });
check('actor A', r.ok);
r = await post(t2, { type: 'pairActor', personId: 5064, personName: 'Meryl Streep' });
check('actor B', r.ok);
r = await post(t1, { type: 'pairFloor', floor: 50 });
check('floor', r.ok);
r = await post(t1, { type: 'pairDeal' });
check('deal', r.ok && r.j.phase === 'deal' && r.j.pairs.cards.length === 10, r.ok ? 'flip=' + r.j.pairs.flip : JSON.stringify(r.j));

// browser views for screenshots
const browser = await chromium.launch();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const tv4k = await (await browser.newContext({ viewport: { width: 3840, height: 2160 } })).newPage();
tv.on('pageerror', (e) => failures.push('TV pageerror: ' + e.message));
tv.on('console', (m) => { if (m.type() === 'error') console.log('TV console:', m.text().slice(0, 300)); });
const p1 = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
p1.on('pageerror', (e) => failures.push('P1 pageerror: ' + e.message));
await tv.goto(BASE + '/tv/duo/' + code);
await sleep(1500); await tv.screenshot({ path: SHOTS + '/p00-tv-debug.png' });
console.log('TV text:', (await tv.evaluate(() => document.body.innerText)).slice(0, 300));
await tv.waitForFunction((src) => document.body.innerText.includes(src), 'CARD 1/10', { timeout: 30000 });
await sleep(600);
await tv.screenshot({ path: SHOTS + '/p01-tv-deal.png' });
await p1.goto(BASE + '/duo#room=' + code);
await p1.evaluate(([c, tok]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tok, invite: 'x' })), [code, t1]);
await p1.reload();
await p1.waitForFunction(() => document.body.innerText.includes('CARD 1/10') || document.body.innerText.includes('CARD '), null, { timeout: 20000 });
await sleep(600);
await p1.screenshot({ path: SHOTS + '/p02-phone-deal.png' });

// play all 10 turns from spectate state
for (let guard = 0; guard < 40; guard++) {
  const st = await spec();
  if (st.phase === 'wager') break;
  if (st.phase !== 'deal') { await sleep(300); continue; }
  const i = st.pairs.turnIdx;
  if (st.pairs.pendingPass) {
    const responder = 1 - st.pairs.active;
    const rr = await post(responder === 0 ? t1 : t2, { type: 'pairRespond', pile: i % 3 === 2 ? -1 : i % 2 });
    if (!rr.ok) console.log('respond err', rr.j.error);
  } else {
    const active = st.pairs.active;
    const rr = await post(active === 0 ? t1 : t2, { type: 'pairAct', pile: i % 3 === 0 ? -1 : i % 2 });
    if (!rr.ok) console.log('act err', rr.j.error);
  }
}
let st = await spec();
check('wager phase reached', st.phase === 'wager', 'turnIdx=' + st.pairs?.turnIdx);
await tv4k.goto(BASE + '/tv/duo/' + code);
await tv4k.waitForFunction(() => document.body.innerText.includes('END WAGER'), null, { timeout: 20000 });
await sleep(600);
await tv4k.screenshot({ path: SHOTS + '/p03-tv4k-wager.png' });
await sleep(2500);
await p1.screenshot({ path: SHOTS + '/p04-phone-wager.png' });

r = await post(t1, { type: 'pairWager', amount: 3 });
check('wager A', r.ok);
r = await post(t2, { type: 'pairWager', amount: 5 });
check('wager B -> reveal', r.ok && r.j.phase === 'pReveal' && r.j.pairs.totals, r.ok ? 'totals=' + JSON.stringify(r.j.pairs?.totals) + ' pts=' + JSON.stringify(r.j.pairs?.points) : JSON.stringify(r.j));
await sleep(2600);
await tv.screenshot({ path: SHOTS + '/p05-tv-reveal.png' });
await tv4k.screenshot({ path: SHOTS + '/p06-tv4k-reveal.png' });
await sleep(2500);
await p1.screenshot({ path: SHOTS + '/p07-phone-reveal.png' });
r = await post(t1, { type: 'pairRevealDone' });
check('done', r.ok && r.j.phase === 'done');
await sleep(2600);
await tv.screenshot({ path: SHOTS + '/p08-tv-done.png' });
await sleep(2500);
await p1.screenshot({ path: SHOTS + '/p09-phone-done.png' });
check('no page errors', !failures.some((f) => f.includes('pageerror')), failures.filter((f) => f.includes('pageerror')).join(' | '));
console.log(failures.length ? 'FAILURES: ' + failures.join(' | ') : 'ALL PAIRS TESTS PASSED');
await browser.close();
process.exit(failures.length ? 1 : 0);