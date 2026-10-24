const puppeteer = require('/tmp/ppx/node_modules/puppeteer-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const mk = async (w,h,match) => { const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({width:w,height:h,isMobile:true,hasTouch:true}); await p.goto(`http://localhost:4181/battle/${match}`, {waitUntil:'networkidle2',timeout:45000}); await sleep(2500); return p; };
  const M = 'p182f' + Date.now().toString(36);
  const A = await mk(390,700,M);
  await A.evaluate(() => { const inp = document.querySelector('#battle-name'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp,'ALPHA'); inp.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(200);
  await A.evaluate(() => document.querySelector('form.battle-nameform')?.requestSubmit());
  await sleep(800);
  const B = await mk(820,1000,M);
  await sleep(3500);
  await B.evaluate(() => document.querySelector('.battle-menubtn')?.click()); await sleep(500);
  await B.evaluate(() => { const inp = document.querySelector('#battle-name-menu'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp,'BRAVO'); inp.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(200);
  await B.evaluate(() => document.querySelector('form.battle-nameform--menu')?.requestSubmit());
  for (const t of [2000, 5000, 9000]) {
    await sleep(t === 2000 ? 2000 : t - (t === 5000 ? 2000 : 5000));
    const a = await A.evaluate(() => (document.body.innerText.match(/ALPHA|BRAVO|FIGHTER/g) || []));
    console.log('A sees after', t, JSON.stringify(a));
    if (a.includes('BRAVO')) break;
  }
  await browser.close(); console.log('done');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
