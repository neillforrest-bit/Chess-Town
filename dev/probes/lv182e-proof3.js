const puppeteer = require('/tmp/ppx/node_modules/puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'https://chess-town-git-instinct-batch-15-recovered-neillo.vercel.app';
const log = (...a) => console.log(new Date().toISOString().slice(14,19), ...a);
const fenOf = (page) => page.evaluate(() => { const b = document.querySelector('.tapboard'); return b ? b.getAttribute('data-fen') || '' : ''; });
async function move(page, from, to) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await page.evaluate(() => [...document.querySelectorAll('.tapboard img')].length);
    await page.evaluate(([f]) => { const p = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').startsWith(f + ' ')); if (p) p.click(); }, [from]);
    await sleep(700);
    await page.evaluate(([t]) => { const d = [...document.querySelectorAll('button')].find(x => { const l = x.getAttribute('aria-label') || ''; return l === t || l.startsWith(t + ' '); }); if (d) d.click(); }, [to]);
    await sleep(1400);
    const moved = await page.evaluate(([f, t]) => { const p = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').startsWith(f + ' ')); const onF = p ? (p.getAttribute('aria-label') || '') : ''; const d = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || '').startsWith(t + ' ')); const onT = d ? (d.getAttribute('aria-label') || '') : ''; return { onF, onT }; }, [from, to]);
    // source square should be empty (label without piece letter) after a successful move
    if (/^[a-h][1-8]$/.test(moved.onF.trim()) || moved.onF.trim().length <= 2) { log(`move ${from}-${to} ok:`, JSON.stringify(moved)); return true; }
    log(`move ${from}-${to} attempt ${attempt} maybe failed:`, JSON.stringify(moved));
  }
  return false;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mk = async (w, h, match) => { const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true }); await p.goto(`${BASE}/battle/${match}`, { waitUntil: 'networkidle2', timeout: 45000 }); await sleep(2500); return p; };
  const M = 'prf3' + Date.now().toString(36);
  const A = await mk(390, 700, M);
  await A.evaluate(() => { const inp = document.querySelector('#battle-name'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp,'ALPHA'); inp.dispatchEvent(new Event('input',{bubbles:true})); });
  await A.evaluate(() => document.querySelector('form.battle-nameform')?.requestSubmit());
  await sleep(800);
  const B = await mk(820, 1000, M);
  await sleep(4000);
  await B.evaluate(() => document.querySelector('.battle-menubtn')?.click()); await sleep(500);
  await B.evaluate(() => { const inp = document.querySelector('#battle-name-menu'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp,'BRAVO'); inp.dispatchEvent(new Event('input',{bubbles:true})); });
  await B.evaluate(() => document.querySelector('form.battle-nameform--menu')?.requestSubmit());
  await sleep(2000);
  await B.evaluate(() => document.querySelector('.battle-menubtn')?.click()); await sleep(600);
  await move(A, 'e2', 'e4'); await move(B, 'd7', 'd5'); await move(A, 'e4', 'd5'); await sleep(2000);
  log('A mat badge:', await A.evaluate(() => document.querySelector('.fighthud__mat')?.textContent || 'none'), '| B mat badge:', await B.evaluate(() => document.querySelector('.fighthud__mat')?.textContent || 'none'));
  await A.screenshot({ path: '/tmp/proof3-phone-board.png' });
  await B.screenshot({ path: '/tmp/proof3-ipad-board.png' });
  await A.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /CHAT/.test(x.textContent) && (x.className||'').includes('battle-btn--chat')); if (b) b.click(); });
  await sleep(1000);
  try { await A.tap('.battle-chatdrawer textarea[aria-label="Message Chester"]'); } catch (e) { log('tap err', e.message); }
  await sleep(800);
  log('phone focus after tap:', await A.evaluate(() => ({ focused: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName), vvH: Math.round(window.visualViewport?.height || 0), innerH: innerHeight })));
  await A.screenshot({ path: '/tmp/proof3-phone-chat-focus.png' });
  await sleep(6000);
  await A.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /WHAT SHOULD I DO NEXT/.test(x.textContent)); if (b) b.click(); });
  await sleep(5000);
  log('phone chat answer:', (await A.evaluate(() => document.querySelector('.battle-chatdrawer')?.innerText || 'NO DRAWER')).replace(/\n/g, ' | ').slice(-250));
  await A.screenshot({ path: '/tmp/proof3-phone-chat-answer.png' });
  await browser.close(); log('done');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
