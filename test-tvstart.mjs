import { chromium } from 'playwright';
const BASE = 'https://movietime-tv.vercel.app';
const browser = await chromium.launch();
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await tv.goto(BASE + '/tv');
await tv.waitForTimeout(1200);
await tv.screenshot({ path: 'shots/h07-tv-hub-start.png' });
const hasBtn = await tv.evaluate(() => document.body.innerText.includes('START A GAME ON THIS SCREEN'));
console.log('hub has start button:', hasBtn);
await tv.click('text=START A GAME ON THIS SCREEN');
await tv.waitForURL('**/tv/duo/**', { timeout: 20000 });
const code = tv.url().split('/').pop();
console.log('TV created room:', code);
await tv.waitForFunction(() => document.body.innerText.toLowerCase().includes('scan') || document.body.innerText.includes('SEAT 1'), null, { timeout: 20000 });
await tv.waitForTimeout(1500);
await tv.screenshot({ path: 'shots/h08-tv-lobby-qr.png' });
const lobbyText = await tv.evaluate(() => document.body.innerText);
console.log('TV lobby shows code:', lobbyText.includes(code), '| scan copy:', lobbyText.toLowerCase().includes('scan'), '| seats waiting:', lobbyText.includes('SEAT 1') && lobbyText.includes('SEAT 2'));

// phone 1 joins by typing the code
const phone1 = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await phone1.goto(BASE + '/duo');
await phone1.fill('input[placeholder*="name" i], input[aria-label*="name" i]', 'Neill').catch(() => {});
await phone1.fill('input[aria-label="Room code from the TV"]', code);
await phone1.click('text=Take a seat');
await phone1.waitForFunction(() => document.body.innerText.includes('lobby') || document.body.innerText.includes('PICK THE GAME') || document.body.innerText.includes('pick the game'), null, { timeout: 25000 });
await phone1.waitForTimeout(800);
await phone1.screenshot({ path: 'shots/h09-phone1-joined.png' });

// phone 2 joins
const phone2 = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await phone2.goto(BASE + '/duo');
await phone2.fill('input[aria-label="Room code from the TV"]', code);
await phone2.click('text=Take a seat');
await phone2.waitForFunction(() => /lobby|game/i.test(document.body.innerText), null, { timeout: 25000 });

// TV shows both seats
await tv.waitForFunction(() => document.body.innerText.includes('NEILL'), null, { timeout: 25000 }).catch(() => {});
await tv.waitForTimeout(1200);
await tv.screenshot({ path: 'shots/h10-tv-both-seats.png' });
console.log('TV shows seat names:', await tv.evaluate(() => document.body.innerText.toUpperCase().includes('NEILL')));

// seat 0 starts Taste Duel; phone page tall; verify the page container scrolls
await phone1.click('text=Both here, choose the game');
await phone1.waitForFunction(() => /Taste Duel/i.test(document.body.innerText), null, { timeout: 25000 });
await phone1.click('text=/Taste Duel/i');
await phone1.waitForTimeout(2500);
await phone1.screenshot({ path: 'shots/h11-phone1-duel-start.png' });
const scroll = await phone1.evaluate(() => {
  const m = document.querySelector('main');
  if (!m) return { err: 'no main' };
  const before = m.scrollTop;
  m.scrollTop = 400;
  return { scrollHeight: m.scrollHeight, clientHeight: m.clientHeight, before, after: m.scrollTop };
});
console.log('scroll test:', JSON.stringify(scroll));
await phone1.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = m.scrollHeight; });
await phone1.waitForTimeout(400);
await phone1.screenshot({ path: 'shots/h12-phone1-scrolled.png' });
await browser.close();

// cleanup the QA room
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const del = await fetch(env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '') + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
console.log('cleanup', code, del.status);