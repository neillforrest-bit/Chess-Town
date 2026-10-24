const puppeteer = require('/tmp/ppx/node_modules/puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:4181';
const log = (...a) => console.log(new Date().toISOString().slice(14,19), ...a);
const setVal = (page, sel, name) => page.evaluate(([s, n]) => { const inp = document.querySelector(s); if (!inp) return false; const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(inp, n); inp.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [sel, name]);
const clickBtn = (page, re) => page.evaluate((r) => { const rx = new RegExp(r); const b = [...document.querySelectorAll('button')].find(x => rx.test(x.textContent)); if (b) { b.click(); return true; } return false; }, re.source);
async function openMenu(page) { await page.evaluate(() => document.querySelector('.battle-menubtn')?.click()); await sleep(500); }
async function themeProbe(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.tapboard img')].map(i => decodeURIComponent(i.src)).filter(s => s.startsWith('data:image'));
    const sample = imgs.join(' ');
    return { n: imgs.length, metallic: sample.includes('#8a93a3'), neon: sample.includes('#1c48b0'), ls: localStorage.getItem('ct-piece-theme') };
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mk = async (w, h, match) => {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}/battle/${match}`, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(2500);
    return page;
  };
  const M = 'p182e' + Date.now().toString(36);
  const aW = await mk(390, 700, M);           // first arrival: tunnel form
  log('A has tunnel form:', await aW.evaluate(() => !!document.querySelector('#battle-name')));
  await setVal(aW, '#battle-name', 'ALPHA'); await sleep(200);
  await aW.evaluate(() => { const f = document.querySelector('form.battle-nameform'); f?.requestSubmit(); });
  await sleep(800);
  const aB = await mk(820, 1000, M);          // second arrival: no tunnel
  log('B has tunnel form (want false):', await aB.evaluate(() => !!document.querySelector('#battle-name')));
  await sleep(3500);
  // metallic default on both
  log('A theme:', JSON.stringify(await themeProbe(aW)));
  log('B theme:', JSON.stringify(await themeProbe(aB)));
  await aW.screenshot({ path: '/tmp/p182d-A-metallic-phone.png' });
  await aB.screenshot({ path: '/tmp/p182d-B-metallic-ipad.png' });
  // B renames via MENU
  await openMenu(aB);
  log('B menu form:', await aB.evaluate(() => !!document.querySelector('#battle-name-menu')));
  await setVal(aB, '#battle-name-menu', 'BRAVO'); await sleep(200);
  await aB.evaluate(() => { document.querySelector('form.battle-nameform--menu')?.requestSubmit(); });
  await sleep(1500);
  const namesA = await aW.evaluate(() => document.body.innerText.match(/ALPHA|BRAVO|FIGHTER TWO/g));
  const namesB = await aB.evaluate(() => document.body.innerText.match(/ALPHA|BRAVO|FIGHTER TWO/g));
  log('A sees names:', JSON.stringify(namesA), '| B sees:', JSON.stringify(namesB));
  // toggle theme on B via menu (menu still open)
  await clickBtn(aB, /PIECES: METALLIC/); await sleep(1200);
  log('B theme after toggle:', JSON.stringify(await themeProbe(aB)));
  await aB.evaluate(() => document.querySelector('.battle-menubtn')?.click()); await sleep(400);
  await aB.screenshot({ path: '/tmp/p182d-B-neon-ipad.png' });
  // A (white) plays 1.e4 so analysis has a real best move
  await aW.evaluate(() => { const clk=(l)=>{const b=[...document.querySelectorAll('button')].find(x=>(x.getAttribute('aria-label')||'')===l);if(b)b.click();}; const p=[...document.querySelectorAll('button')].find(x=>(x.getAttribute('aria-label')||'').startsWith('e2 ')); if(p)p.click(); setTimeout(()=>clk('e4'),300); });
  await sleep(9000); // engine analysis lands on both clients
  // A (white, black to move) asks -> should say THEIR move, engine likes X for them
  await aW.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /CHAT/.test(x.textContent) && (x.className||'').includes('battle-btn--chat')); if (b) b.click(); });
  await sleep(700);
  await clickBtn(aW, /WHAT SHOULD I DO NEXT/); await sleep(4500);
  const chatA = await aW.evaluate(() => document.querySelector('.battle-chatdrawer')?.innerText.slice(0, 500) || 'NO DRAWER');
  log('A (white, black to move) chat:', chatA.replace(/\n/g, ' | ').slice(0, 280));
  // turn-aware fallback: B is BLACK, white to move first -> B asks
  await aB.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /CHAT/.test(x.textContent) && (x.className||'').includes('battle-btn--chat')); if (b) b.click(); });
  await sleep(700);
  await clickBtn(aB, /WHAT SHOULD I DO NEXT/); await sleep(4500);
  const chatB = await aB.evaluate(() => document.querySelector('.battle-chatdrawer')?.innerText.slice(0, 500) || 'NO DRAWER');
  log('B (black, white to move) chat:', chatB.replace(/\n/g, ' | ').slice(0, 280));
  await aB.screenshot({ path: '/tmp/p182d-B-chat-ipad.png' });
  // layering: fab + build badge vs bottom rows
  const lay = await aB.evaluate(() => {
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })() : null;
    const rows = [...document.querySelectorAll('button')].filter(x => /WILD CARD|CHAT|RESIGN/.test(x.textContent)).map(r);
    return { fab: r(document.querySelector('.chester-fab')), badge: r(document.querySelector('.build-badge')), rows, vh: innerHeight };
  });
  log('layering:', JSON.stringify(lay));
  const overlap = (a, b) => a && b && !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  log('fab overlaps row:', lay.rows.some(rr => overlap(lay.fab, rr)), '| badge overlaps row:', lay.rows.some(rr => overlap(lay.badge, rr)));
  await browser.close();
  log('done');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
