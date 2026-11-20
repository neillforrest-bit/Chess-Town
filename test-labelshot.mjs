import { chromium } from 'playwright';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const BASE = 'https://movietime-tv.vercel.app';
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t0 = hex(32), t1 = hex(32), inv = hex(32);
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, ''), SK = env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (x) => createHash('sha256').update(x).digest('hex');
const seat = (t, name) => ({ hash: sha(t), name, tokens: 0, earned: 0, side: null, spent: 0, locked: false, double: false, wild: [] });
const seed = { flow: 'movie-duo-v1', v: 0, round: 0, expires: Date.now() + 86400000, inviteHash: sha(inv), receipts: [], seats: [seat(t0, 'Neillo'), seat(t1, 'Jemma')], mode: null, phase: 'lobby', genres: [], picks: [[], []], genreLocked: [], mood: '', shelf: [], extras: [], ops: [{}, {}], swipeDone: [], sync: 0, overlaps: [], loners: [[], []], wilds: [], finalists: [], revealAck: [], queue: [], pair: [], stage: 0, advanced: [], history: [], tie: [], tieSpun: false, winner: null, confirmed: [], pairs: null, match: null, openJoin: true, line: 'Test.' };
await fetch(SB + '/rest/v1/find_rooms', { method: 'POST', headers: { apikey: SK, authorization: 'Bearer ' + SK, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ code, state: seed }) });
const act = async (type) => { const g = await fetch(BASE + '/api/duo/' + code, { headers: { 'x-wheel-seat': t0 } }); const j = await g.json(); const r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-wheel-seat': t0 }, body: JSON.stringify({ type, round: j.round, actionId: hex(16) }) }); console.log('act', type, r.status); };
await act('start');
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('PAGE-ERR', m.text().slice(0, 160)); });
p.on('pageerror', (e) => console.log('PAGE-EXC', String(e).slice(0, 160)));
await p.goto(BASE + '/duo#room=' + code);
await p.evaluate(([c, tk, i]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tk, invite: i })), [code, t0, inv]);
await p.reload();
try {
  await p.waitForFunction(() => /STAR PAIRS/.test(document.body.innerText), null, { timeout: 25000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/m12-picker-jemma.png' });
  console.log('labels:', await p.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => b.textContent).filter((t) => /STAR/.test(t)).join(' | ')));
} catch (e) {
  console.log('WAIT FAILED; body text head:', (await p.evaluate(() => document.body.innerText)).slice(0, 300));
  await p.screenshot({ path: 'shots/m12-fail.png' });
}
await browser.close();
await fetch(SB + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } }).then((x) => console.log('cleanup', x.status));