const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 19), ...a);
async function tapText(page, re) { const c = await page.evaluate((src) => { const rx = new RegExp(src, 'i'); const els = [...document.querySelectorAll('button, summary')].filter(x => rx.test(x.textContent) && x.offsetParent !== null); const b = els[els.length - 1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, re.source); if (!c) return null; await page.touchscreen.tap(c.x, c.y); return true; }
async function boardRect(page) { return page.evaluate(() => { let best = null; for (const el of document.querySelectorAll('canvas')) { const q = el.getBoundingClientRect(); if (q.width > 60 && (!best || q.width > best.width)) best = q; } return best ? { x: best.x, y: best.y, w: best.width } : null; }); }
async function playMove(page, from, to) { const r = await boardRect(page); const sq = r.w / 8; const pt = (s) => ({ x: r.x + (s.charCodeAt(0) - 97 + 0.5) * sq, y: r.y + (8 - parseInt(s[1]) + 0.5) * sq }); const a = pt(from), b = pt(to); await page.touchscreen.tap(a.x, a.y); await sleep(500); await page.touchscreen.tap(b.x, b.y); }
async function dismiss(page) { await tapText(page, /Accept/); await sleep(200); await tapText(page, /GOT IT/); await sleep(250); }
(async () => {
  const srv = spawn('npx', ['next', 'start', '-p', '4181'], { cwd: '/home/sandbox/ch', stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { const r = await fetch('http://127.0.0.1:4181/play-chester'); if (r.ok) break; } catch (e) {} await sleep(2000); }
    log('server up');
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 364, height: 612, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('ct-road-level-v1', '1'); } catch(e){} });
    await page.goto('http://127.0.0.1:4181/play-chester?road=1', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500); await tapText(page, /×/); await sleep(300);
    await tapText(page, /START/); await sleep(1000); await tapText(page, /PROVE IT/);
    await sleep(6000); await dismiss(page);
    log('in game');
    await dismiss(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode: 'COACH_OPENING', fen: 'k7/8/K7/8/8/8/1Q6/8 w - - 0 1' } })));
    await sleep(2500); await dismiss(page);
    let banner = null;
    for (let i = 0; i < 8 && !banner; i++) { await playMove(page, 'b2', 'b7'); for (let jj = 0; jj < 16; jj++) { await sleep(250); banner = await page.evaluate(() => document.querySelector('.chester-endbanner')?.textContent.replace(/\s+/g, ' ').trim() || null); if (banner) break; } }
    log('MATE banner =', JSON.stringify(banner));
    log('tug =', await page.evaluate(() => { const t = document.body.innerText.match(/YOU\s*(\d+)%[\s\S]{0,40}?(\d+)%/); return t ? [t[1], t[2]] : null; }));
    await sleep(1200);
    await page.screenshot({ path: '/tmp/pp/p181-mate.png' });
    await page.evaluate(() => document.querySelector('.chester-endbanner')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(1000);
    log('REPORT =', JSON.stringify(await page.evaluate(() => ({ open: !!document.querySelector('.chester-report-modal'), result: document.querySelector('.chester-report-card__result')?.textContent || null }))));
    await page.screenshot({ path: '/tmp/pp/p181-mate-report.png' });
    await browser.close();
  } finally { srv.kill('SIGKILL'); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
