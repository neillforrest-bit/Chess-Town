const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 19), ...a);
async function tapText(page, re) { const c = await page.evaluate((src) => { const rx = new RegExp(src, 'i'); const els = [...document.querySelectorAll('button, summary')].filter(x => rx.test(x.textContent) && x.offsetParent !== null); const b = els[els.length - 1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, re.source); if (!c) return null; await page.touchscreen.tap(c.x, c.y); return true; }
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
    await sleep(6000); await tapText(page, /Accept/); await sleep(300); await tapText(page, /GOT IT/);
    log('in game, baseline acc =', JSON.stringify(await acc(page)));
    // BLACK mover threw a search-confirmed forced mate into a draw: mover-relative mate +9, draw after = 0cp.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chester-coaching-pause', { detail: { kind: 'move', color: 'b', ply: 2, move: 'Qg4', classification: 'BLUNDER', evaluationBefore: null, evaluationMateBefore: 9, evaluationAfter: 0, evalDelta: null, fen: '7K/8/8/8/8/8/8/k6q w - - 0 1', fenBefore: '7K/8/6q1/8/8/8/8/k7 b - - 0 1', movePhrase: 'the queen from g6 to g4', bestMove: null, bestMovePhrase: null, captured: null, check: false, mate: false } })));
    await sleep(1500);
    log('after BLACK thrown mate: acc =', JSON.stringify(await acc(page)), '(expect YOU 100, CHESTER dropped hard)');
    await page.screenshot({ path: '/tmp/pp/p181-black.png' });
    await browser.close();
  } finally { srv.kill('SIGKILL'); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
