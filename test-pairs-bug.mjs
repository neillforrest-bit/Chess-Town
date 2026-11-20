import { chromium } from 'playwright';
const BASE = 'https://movietime-tv.vercel.app';
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t0 = hex(32), t1 = hex(32), inv = hex(32);
const H = { 'content-type': 'application/json', origin: BASE };
let r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { ...H, 'x-wheel-seat': t0 }, body: JSON.stringify({ type: 'create', name: 'Neill', invite: inv, round: 0, actionId: hex(16) }) });
console.log('create', r.status);
r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { ...H, 'x-wheel-seat': t1 }, body: JSON.stringify({ type: 'join', name: 'Jemma', invite: inv, round: 0, actionId: hex(16) }) });
console.log('join', r.status);
r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { ...H, 'x-wheel-seat': t0 }, body: JSON.stringify({ type: 'start', mode: 'pairs', round: 0, actionId: hex(16) }) });
console.log('start pairs', r.status, (await r.json()).phase);

const browser = await chromium.launch();
// Jemma's phone = seat 1
const jem = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
jem.on('console', (m) => { if (m.type() === 'error') console.log('JEMMA CONSOLE ERROR:', m.text().slice(0, 200)); });
jem.on('pageerror', (e) => console.log('JEMMA PAGE ERROR:', String(e).slice(0, 300)));
await jem.goto(BASE + '/duo#room=' + code);
await jem.evaluate(([c, tok, i]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tok, invite: i })), [code, t1, inv]);
await jem.reload();
await jem.waitForFunction(() => /Search an actor/i.test(document.body.innerText) || document.querySelector('input[aria-label*="Actor"]'), null, { timeout: 25000 });
await jem.waitForTimeout(600);
await jem.fill('input[aria-label*="Actor"]', 'Streep');
await jem.waitForTimeout(1600);
await jem.screenshot({ path: 'shots/h14-jemma-actor-search.png' });
const hits = await jem.evaluate(() => Array.from(document.querySelectorAll('button')).filter((b) => /Streep/.test(b.textContent)).map((b) => b.textContent));
console.log('hit buttons:', JSON.stringify(hits));
// tap the first hit
await jem.click('button:has-text("Meryl Streep")').catch(async () => { const bs = await jem.$$('button'); for (const b of bs) { const t = await b.textContent(); if (/Streep/.test(t)) { await b.click(); break; } } });
await jem.waitForTimeout(2500);
await jem.screenshot({ path: 'shots/h15-jemma-after-pick.png' });
const state = await jem.evaluate(() => document.body.innerText.slice(0, 600));
console.log('--- after pick ---'); console.log(state);
await browser.close();
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
await fetch(env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '') + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } }).then((x) => console.log('cleanup', code, x.status));