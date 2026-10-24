// Batch 182 live verification: two clients (phone + iPad), names, material badges, chat drawer.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'https://chess-town-git-instinct-batch-15-recovered-neillo.vercel.app';
const log = (...a) => console.log(new Date().toISOString().slice(14,19), ...a);
async function setName(page, name) {
  await page.evaluate((n) => { const inp = document.querySelector('#battle-name'); if (!inp) return; const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(inp, n); inp.dispatchEvent(new Event('input', { bubbles: true })); }, name);
  await sleep(200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'SAVE'); if (b) b.click(); });
}
async function move(page, from, to) {
  await page.evaluate(([f, t]) => {
    const clk = (label) => { const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '') === label); if (!b) return false; b.click(); return true; };
    const p = [...document.querySelectorAll('button')].find(x => { const l = x.getAttribute('aria-label') || ''; return l.startsWith(f + ' '); });
    if (p) p.click();
    setTimeout(() => { const d = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '') === t || (x.getAttribute('aria-label') || '').startsWith(t + ' ')); if (d) d.click(); }, 300);
  }, [from, to]);
  await sleep(900);
}
async function state(page) { return page.evaluate(() => { const t = document.body.innerText; const m = t.match(/WHITE([\s\S]{0,80}?)LIVE WIN ODDS/); return { hud: m ? m[1].replace(/\s+/g, ' ').trim() : '', clocks: [...document.querySelectorAll('.battle-clock span')].map(e => e.textContent) }; }); }
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mk = async (w, h, match, name) => {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}/battle/${match}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2500);
    await setName(page, name);
    await sleep(400);
    return page;
  };
  // MATCH A: phone = WHITE (first), iPad = BLACK. Line: 1.e4 d5 2.exd5 (WHITE +1)
  const A = 'p182a' + Date.now().toString(36);
  const aW = await mk(390, 700, A, 'PHONE WHITE');
  const aB = await mk(820, 1000, A, 'IPAD BLACK');
  await sleep(4000); // countdown + seat
  log('matchA seated');
  await move(aW, 'e2', 'e4'); await sleep(1200);
  await move(aB, 'd7', 'd5'); await sleep(1200);
  await move(aW, 'e4', 'd5'); await sleep(1500);
  log('matchA state white:', JSON.stringify(await state(aW)));
  log('matchA state black:', JSON.stringify(await state(aB)));
  await aB.screenshot({ path: '/tmp/p182-matchA-ipad.png' });
  // chat regression on phone: open, chip, type, close
  await aW.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /CHAT/.test(x.textContent) && x.className.includes('battle-btn--chat')); if (b) b.click(); });
  await sleep(800);
  await aW.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /WHAT SHOULD I DO NEXT/.test(x.textContent)); if (b) b.click(); });
  await sleep(6000);
  await aW.screenshot({ path: '/tmp/p182-matchA-phone-chat.png' });
  const chatText = await aW.evaluate(() => document.querySelector('.battle-chatdrawer')?.innerText.slice(0, 400) || 'NO DRAWER');
  log('matchA chat:', chatText.replace(/\n/g, ' | ').slice(0, 300));
  await aW.evaluate(() => { const b = document.querySelector('.battle-chatdrawer header button'); if (b) b.click(); });
  await sleep(600);
  const afterClose = await aW.evaluate(() => ({ drawer: !!document.querySelector('.battle-chatdrawer'), board: !!document.querySelector('.tapboard') }));
  log('matchA after close:', JSON.stringify(afterClose));
  await aW.screenshot({ path: '/tmp/p182-matchA-phone.png' });
  // MATCH B: BLACK wins a piece: 1.e4 e5 2.Nf3 Nc6 3.Nxe5 Nxe5 (BLACK +3)
  const B = 'p182b' + Date.now().toString(36);
  const bW = await mk(390, 700, B, 'DAN');
  const bB = await mk(390, 700, B, 'FORREST');
  await sleep(4000);
  log('matchB seated');
  await move(bW, 'e2', 'e4'); await sleep(1200);
  await move(bB, 'e7', 'e5'); await sleep(1200);
  await move(bW, 'g1', 'f3'); await sleep(1200);
  await move(bB, 'b8', 'c6'); await sleep(1200);
  await move(bW, 'f3', 'e5'); await sleep(1200);
  await move(bB, 'c6', 'e5'); await sleep(1500);
  log('matchB state black:', JSON.stringify(await state(bB)));
  await bB.screenshot({ path: '/tmp/p182-matchB-black.png' });
  await browser.close();
  log('done');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
