import { chromium } from 'playwright';
const BASE = 'https://movietime-tv.vercel.app';
const browser = await chromium.launch();
const tv = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await tv.goto(BASE + '/tv');
await tv.click('text=START A GAME ON THIS SCREEN');
await tv.waitForURL('**/tv/duo/**', { timeout: 20000 });
const code = tv.url().split('/').pop();
const join = async (name) => {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto(BASE + '/duo');
  await p.fill('input[aria-label="Room code from the TV"]', code);
  await p.click('text=Take a seat');
  await p.waitForFunction(() => /lobby|choose the game/i.test(document.body.innerText), null, { timeout: 25000 });
  return p;
};
const p1 = await join('Neill');
const p2 = await join('Jemma');
await p1.click('text=Both here, choose the game');
await p1.waitForFunction(() => /Taste Duel/i.test(document.body.innerText), null, { timeout: 25000 });
await p1.click('text=/Taste Duel/i');
await p1.waitForTimeout(2500);
// force a short viewport so content must scroll
await p1.setViewportSize({ width: 390, height: 500 });
await p1.waitForTimeout(600);
const scroll = await p1.evaluate(() => {
  const m = document.querySelector('main');
  const before = m.scrollTop;
  m.scrollTop = 400;
  return { scrollHeight: m.scrollHeight, clientHeight: m.clientHeight, after: m.scrollTop };
});
console.log('short-viewport scroll test:', JSON.stringify(scroll), 'PASS:', scroll.scrollHeight > scroll.clientHeight && scroll.after > 0);
await p1.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = m.scrollHeight; });
await p1.waitForTimeout(400);
await p1.screenshot({ path: 'shots/h13-scroll-bottom.png' });
// touch-scroll simulation (iOS-style): swipe up via touchscreen
await p1.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = 0; });
await p1.touchscreen.tap(195, 250).catch(() => {});
await p1.mouse.move(195, 400); await p1.mouse.down(); await p1.mouse.move(195, 100, { steps: 8 }); await p1.mouse.up();
await p1.waitForTimeout(400);
const afterSwipe = await p1.evaluate(() => document.querySelector('main').scrollTop);
console.log('drag-scroll moved page to:', afterSwipe, 'PASS:', afterSwipe > 0);
await browser.close();
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const del = await fetch(env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '') + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
console.log('cleanup', code, del.status);