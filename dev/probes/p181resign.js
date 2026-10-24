const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 19), ...a);
async function tapText(page, re) { const c = await page.evaluate((src) => { const rx = new RegExp(src, 'i'); const els = [...document.querySelectorAll('button, summary')].filter(x => rx.test(x.textContent) && x.offsetParent !== null); const b = els[els.length - 1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, re.source); if (!c) return null; await page.touchscreen.tap(c.x, c.y); return true; }
async function boardRect(page) { return page.evaluate(() => { let best = null; for (const el of document.querySelectorAll('canvas')) { const q = el.getBoundingClientRect(); if (q.width > 60 && (!best || q.width > best.width)) best = q; } return best ? { x: best.x, y: best.y, w: best.width } : null; }); }
async function playMove(page, from, to) { const pt = (r, s) => { const sq = r.w / 8; return { x: r.x + (s.charCodeAt(0) - 97 + 0.5) * sq, y: r.y + (8 - parseInt(s[1]) + 0.5) * sq }; }; let r = await boardRect(page); let a = pt(r, from); await page.touchscreen.tap(a.x, a.y); await sleep(600); r = await boardRect(page); const b = pt(r, to); await page.touchscreen.tap(b.x, b.y); }
async function dismiss(page) { await tapText(page, /Accept/); await sleep(200); await tapText(page, /GOT IT/); await sleep(250); }
async function loadFen(page, fen) { await dismiss(page); await page.evaluate((f) => window.dispatchEvent(new CustomEvent('load-puzzle', { detail: { mode: 'COACH_OPENING', fen: f } })), fen); await sleep(2500); await dismiss(page); }
async function gradedMove(page, from, to, sanRx) {
  for (let i = 0; i < 6; i++) {
    await dismiss(page);
    await playMove(page, from, to);
    for (let j = 0; j < 20; j++) {
      await sleep(250);
      const st = await page.evaluate(() => { const t = document.querySelector('.chester-teach'); const san = t?.querySelector('.chester-why__san')?.textContent || null; const grade = t?.querySelector('.chester-why__grade')?.textContent || document.querySelector('.chester-why__grade')?.textContent || null; return { san, grade }; });
      if (st.grade && !/GRADING/.test(st.grade) && st.san && sanRx.test(st.san)) return st.grade;
    }
    log('  retry', from + to, i);
  }
  return null;
}
async function acc(page) { return page.evaluate(() => { const t = document.body.innerText; const m = t.match(/MOVE ACCURACY[\s\S]{0,140}/); if (!m) return null; const seg = m[0]; const you = seg.match(/YOU\s*(\d+(?:\.\d+)?)\s*%/); const ch = seg.match(/CHESTER\s*(\d+(?:\.\d+)?)\s*%/); return { you: you ? +you[1] : null, chester: ch ? +ch[1] : null }; }); }
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
    await tapText(page, /MENU/); await sleep(800);
    log('menu buttons:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()).slice(0, 25))));
    const tappedResign = await tapText(page, /RESIGN/); await sleep(800);
    log('tapped resign:', tappedResign);
    log('after resign buttons:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()).slice(0, 25))));
    await tapText(page, /CONFIRM|YES|SURE/); await sleep(1500);
    const banner = await page.evaluate(() => document.querySelector('.chester-endbanner')?.textContent.replace(/\s+/g, ' ').trim() || null);
    log('RESIGN banner =', JSON.stringify(banner));
    await sleep(3000);
    log('persists:', await page.evaluate(() => !!document.querySelector('.chester-endbanner')));
    await page.screenshot({ path: '/tmp/pp/p181-resign.png' });
    await page.evaluate(() => document.querySelector('.chester-endbanner')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(1000);
    log('REPORT:', JSON.stringify(await page.evaluate(() => ({ open: !!document.querySelector('.chester-report-modal'), result: document.querySelector('.chester-report-card__result')?.textContent || null }))));
    await page.screenshot({ path: '/tmp/pp/p181-resign-report.png' });
    await browser.close();
  } finally { srv.kill('SIGKILL'); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
