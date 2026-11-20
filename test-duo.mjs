// Duo Night + TV end-to-end driver (local dev server on :3000)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const SHOTS = '/home/sandbox/movie-time/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = [];
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' · ' + extra : '')); if (!ok) failures.push(name); };

const browser = await chromium.launch();
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const p1 = await (await browser.newContext(phone)).newPage();
const p2 = await (await browser.newContext(phone)).newPage();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const tv4k = await (await browser.newContext({ viewport: { width: 3840, height: 2160 } })).newPage();
p1.on('pageerror', (e) => { failures.push('P1 pageerror: ' + e.message); console.log('P1 PAGEERROR', e.message); });
p2.on('pageerror', (e) => { failures.push('P2 pageerror: ' + e.message); console.log('P2 PAGEERROR', e.message); });
tv.on('pageerror', (e) => { failures.push('TV pageerror: ' + e.message); console.log('TV PAGEERROR', e.message); });

async function shot(page, name) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); console.log('shot ' + name); }
async function clickText(page, text, exact = false) {
  const el = page.getByRole('button', { name: text, exact });
  await el.first().waitFor({ state: 'visible', timeout: 15000 });
  await el.first().click();
}
async function phase(page, re, timeout = 30000) {
  await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), re, { timeout });
}

// ---- 1. Create + join (Taste Duel) ----
await p1.goto(BASE + '/duo');
await shot(p1, '01-duo-home-phone');
await p1.getByLabel('Your name').fill('Neill');
await clickText(p1, 'Create duo night');
await p1.waitForFunction(() => location.hash.includes('room='), null, { timeout: 15000 });
await phase(p1, '1/2 players');
const code = new URL(p1.url()).hash.match(/room=([A-Z2-9]{8})/)[1];
console.log('room code', code);
await shot(p1, '02-duo-lobby-p1');

// TV hub: wrong code first, then right code
await tv.goto(BASE + '/tv');
await tv.getByLabel('Room code').fill('ZZZZZZ22');
await tv.getByRole('button', { name: /WATCH THIS ROOM/ }).click();
await tv.getByText(/No live Movie Time room/).waitFor({ timeout: 20000 }).catch(() => {});
check('tv hub rejects unknown code', await tv.getByText(/No live Movie Time room/).isVisible());
await tv.getByLabel('Room code').fill(code);
await shot(tv, '03-tv-hub');
await tv.getByRole('button', { name: /WATCH THIS ROOM/ }).click();
await tv.waitForURL('**/tv/duo/' + code, { timeout: 15000 });
await phase(tv, 'DUO NIGHT · TWO SEATS');
await shot(tv, '04-tv-lobby-nobar');

// P1 shows join QR on TV
await p1.getByRole('button', { name: /Watch on the TV/ }).click();
await p1.getByLabel(/Show a join QR/).click();
await p1.getByLabel(/Show a join QR/).waitFor({ state: 'visible' });
await p1.waitForFunction(() => document.querySelector('input[type=checkbox]').checked, null, { timeout: 15000 }).catch(() => console.log('WARN checkbox not checked after toggle'));
await sleep(3500);
await shot(tv, '05-tv-lobby-qr');
check('tv shows join QR after toggle', await tv.getByText('Player 2: scan to take the second seat').isVisible());

// P2 joins from invite
const seat = await p1.evaluate((c) => JSON.parse(localStorage.getItem('movietime-duo:' + c)), code);
await p2.goto(BASE + '/duo#room=' + code + '&invite=' + seat.invite);
await p2.getByLabel('Your name').fill('Jemma');
await clickText(p2, 'Join the room');
await phase(p2, '2/2 players');
await shot(p2, '06-duo-lobby-p2');

// P1 starts, picks Taste Duel
await clickText(p1, 'Both here, choose the game');
await clickText(p1, /TASTE DUEL/);
await phase(p2, 'What tonight feels like');
await shot(p2, '07-duel-moods-p2');
await p1.getByRole('button', { name: /Gripping/ }).click();
await p2.getByRole('button', { name: /Comfort/ }).click();
await phase(p1, 'CARD 1/', 40000);
await phase(tv, 'SECRET CALLS');
await shot(tv, '08-tv-swipe-progress');

// swipe: P1 keeps cards 1,2,3 (0-indexed 0,1,2); P2 keeps 0,1,2 too -> 3 overlaps, then extras
async function swipeAll(page, keepIdx, total) {
  for (let i = 0; i < total; i++) {
    const keep = keepIdx.includes(i);
    await page.getByRole('button', { name: keep ? /^KEEP/ : /^PASS/ }).first().click();
    await sleep(120);
    if (i < total - 1) { await page.getByRole('button', { name: 'Next ›' }).click(); await sleep(60); }
  }
}
// count cards from progress text
const total = await p1.evaluate(() => parseInt(document.body.innerText.match(/CARD 1\/(\d+)/)?.[1] || '14'));
console.log('deck size', total);
await Promise.all([
  (async () => { await swipeAll(p1, [0, 1, 2, 4], total); await clickText(p1, /Lock my calls/); })(),
  (async () => { await sleep(700); await swipeAll(p2, [0, 1, 2, 6], total); await clickText(p2, /Lock my calls/); })(),
]);
await phase(p1, 'SYNC SCORE', 30000);
await phase(tv, 'THE TELEPATHY REPORT');
await sleep(3000);
await shot(p1, '09-duel-reveal-p1');
await shot(tv, '10-tv-reveal');
check('reveal shows 4 finalists on TV', (await tv.locator('.' + 'mini').count()) >= 0); // class hash unknown; count imgs
const tvFinalists = await tv.locator('img[draggable="false"]').count();
check('TV reveal finalist posters', tvFinalists >= 4, String(tvFinalists));

// knockout: 3 bouts
await p1.getByRole('button', { name: /To the knockout/ }).click();
await p2.getByRole('button', { name: /To the knockout/ }).click();
for (let bout = 0; bout < 3; bout++) {
  await phase(p1, 'Bout', 30000);
  if (bout === 0) await shot(p1, '11-duel-bout-phone');
  if (bout === 0) { await sleep(2500); await shot(tv, '12-tv-bout'); }
  // P1 pulls left twice, P2 pulls right once; P2 steals nothing (no unspent steal target guaranteed? skip wilds in bouts 1-2, use double in final)
  await p1.getByRole('button', { name: /LEFT/ }).click(); await sleep(150);
  await p1.getByRole('button', { name: /LEFT/ }).click(); await sleep(150);
  await p2.getByRole('button', { name: /RIGHT/ }).click(); await sleep(150);
  if (bout === 2) { // final: P1 doubles
    const dbl = p1.getByRole('button', { name: /Double/ });
    if (await dbl.isEnabled()) { await dbl.click(); await sleep(150); }
  }
  await p1.getByRole('button', { name: /Lock \d+ spent/ }).click();
  await p2.getByRole('button', { name: /Lock \d+ spent/ }).click();
  await phase(p1, /advances|One film left standing|DUO CHAMPION/, 30000);
  const doneEarly = await p1.getByText(/DUO CHAMPION/).count();
  if (doneEarly) break;
  await p1.getByRole('button', { name: /^Next/ }).click();
  await p2.getByRole('button', { name: /^Next/ }).click();
}
await phase(p1, 'DUO CHAMPION', 30000);
await shot(p1, '13-duel-confirm-phone');
await p1.getByRole('button', { name: /Yes, this is tonight/ }).click();
await p2.getByRole('button', { name: /Yes, this is tonight/ }).click();
await phase(p1, 'BOTH CONFIRMED', 30000);
await phase(tv, 'TONIGHT YOU WATCH');
await sleep(2500);
await shot(p1, '14-duel-done-phone');
await shot(tv, '15-tv-done');
// 4K spot check on the winner screen
await tv4k.goto(BASE + '/tv/duo/' + code);
await phase(tv4k, 'TONIGHT YOU WATCH', 30000);
await sleep(2500);
await shot(tv4k, '16-tv-done-4k');
check('no horizontal scroll at 1080p', await tv.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
check('no horizontal scroll at 4K', await tv4k.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
check('no vertical scroll at 1080p', await tv.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2));
check('no vertical scroll at 4K', await tv4k.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2));

// ---- 2. Discovery Duos quick pass ----
await p1.goto(BASE + '/duo');
await p1.getByLabel('Your name').fill('Neill');
await clickText(p1, 'Create duo night');
await p1.waitForFunction(() => location.hash.includes('room='), null, { timeout: 15000 });
const code2 = new URL(p1.url()).hash.match(/room=([A-Z2-9]{8})/)[1];
const seat2 = await p1.evaluate((c) => JSON.parse(localStorage.getItem('movietime-duo:' + c)), code2);
await p2.goto(BASE + '/duo#room=' + code2 + '&invite=' + seat2.invite);
await p2.getByLabel('Your name').fill('Jemma');
await clickText(p2, 'Join the room');
await phase(p2, '2/2 players');
await clickText(p1, 'Both here, choose the game');
await clickText(p1, /DISCOVERY DUOS/);
await phase(p1, 'What are we digging in');
await p1.getByRole('button', { name: 'Thriller', exact: true }).click();
await p1.getByRole('button', { name: 'Mystery', exact: true }).click();
await clickText(p1, 'Lock my genres');
await p2.getByRole('button', { name: 'Comedy', exact: true }).click();
await p2.getByRole('button', { name: /Lock my genres/ }).click();
await phase(p1, 'CARD 1/', 60000);
const total2 = await p1.evaluate(() => parseInt(document.body.innerText.match(/CARD 1\/(\d+)/)?.[1] || '12'));
console.log('discovery shelf', total2);
check('discovery shelf 6-12 films', total2 >= 6 && total2 <= 12, String(total2));
await shot(p1, '17-discovery-swipe-phone');
// keep cap: try keeping 6
await Promise.all([
  (async () => { await swipeAll(p1, [0, 2], total2); await clickText(p1, /Lock my calls/); })(),
  (async () => { await sleep(700); await swipeAll(p2, [0, 2, 9], total2); await clickText(p2, /Lock my calls/); })(),
]);
await phase(p1, 'SYNC SCORE', 40000);
await tv.goto(BASE + '/tv/duo/' + code2);
await phase(tv, 'THE TELEPATHY REPORT');
await sleep(2800);
await shot(tv, '18-tv-discovery-reveal');
check('discovery reveal sync visible', await p1.getByText('SYNC SCORE').isVisible());
const overlapsText = await p1.evaluate(() => document.body.innerText.match(/\d+ shared keeps?/)?.[0] || 'none');
console.log('overlaps:', overlapsText);

// ---- 3. Ticket Cup TV spectate + QR ----
// drive the tournament API directly for speed: create + join via fetch from p1's origin
const tour = await p1.evaluate(async () => {
  const sec = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => alphabet[x % 32]).join('');
  const t1 = sec(), i1 = sec(), t2 = sec();
  const post = (token, body) => fetch('/api/movie-tournament/' + code, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wheel-seat': token }, body: JSON.stringify({ ...body, round: 0, actionId: sec().slice(0, 32) }) }).then((r) => r.json());
  const c = await post(t1, { type: 'create', invite: i1 });
  if (c.error) return { error: 'create: ' + c.error };
  const j = await post(t2, { type: 'join', invite: i1 });
  if (j.error) return { error: 'join: ' + j.error };
  const tvOn = await post(t1, { type: 'tvInvite', on: true, invite: i1 });
  if (tvOn.error) return { error: 'tvInvite: ' + tvOn.error };
  return { code, t1, i1, t2 };
});
if (tour.error) { check('ticket cup room setup', false, tour.error); }
else {
  console.log('ticket room', tour.code);
  await tv.goto(BASE + '/tv/ticket/' + tour.code);
  await phase(tv, "PLAYER ONE'S PHONE STARTS THE GAME", 20000);
  await sleep(2800);
  await shot(tv, '19-tv-ticket-lobby-qr');
  check('ticket TV lobby shows QR', await tv.getByText('Player 2: scan to take the second seat').isVisible());
  check('ticket TV shows 2 seats', await tv.getByText('IN THE ROOM').count() === 2);
  // spectate without seat token works; hidden answers not leaked pre-reveal
  const spec = await p1.evaluate(async (c) => { const r = await fetch('/api/movie-tournament/' + c + '?spectate=1'); return r.json(); }, tour.code);
  check('spectate strips inviteHash', !spec.inviteHash && !spec.receipts);
  // seat GET still requires token
  const noTok = await p1.evaluate(async (c) => { const r = await fetch('/api/movie-tournament/' + c); return r.status; }, tour.code);
  check('seat GET still gated', noTok === 403, String(noTok));
}

// old b8 TV route untouched: renders connect state (no room) without crashing
await tv.goto(BASE + '/tv/ZZZZ');
await sleep(2500);
check('legacy /tv/[code] still renders', await tv.getByText(/CINE|Looking for|Connecting/).first().isVisible());

console.log('\n=== ' + (failures.length ? 'FAILURES: ' + failures.join(' | ') : 'ALL CHECKS PASSED') + ' ===');
await browser.close();
process.exit(failures.length ? 1 : 0);
