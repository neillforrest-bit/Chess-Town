import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ['HUB_BASE'];out={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':390,'height':844});pg.goto(base+'/');pg.locator('#gt-game').wait_for();pg.screenshot(path='/downloads/hub-deployed-home390.png')
 for world in ['movie','trivia','logic','chess','checkers']:
  pg.goto(base+'/');pg.locator('#gt-game').select_option(world);pg.get_by_role('button',name='Enter ',exact=False).click();pg.locator('#gt-mode').wait_for();options=pg.locator('#gt-mode option').evaluate_all('(es)=>es.map(e=>({id:e.value,text:e.innerText}))');out[world]=[]
  for opt in options:
   pg.locator('#gt-mode').select_option(opt['id']);a=pg.locator('a[data-launch]');href=a.get_attribute('href');out[world].append({'id':opt['id'],'label':opt['text'],'href':href})
  pg.locator('#gt-mode').select_option('find' if world=='movie' else 'grammar' if world=='trivia' else options[0]['id']);pg.screenshot(path=f'/downloads/hub-deployed-{world}390.png');pg.get_by_role('button',name='Back to all games',exact=False).click();assert pg.locator('#gt-game').count()==1
 # Follow every same-origin route without making a move or model call. Test external modes separately too.
 for world,opts in out.items():
  for opt in opts:
   dest=opt['href'];q=b.new_page(viewport={'width':390,'height':844});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));response=q.goto(dest if dest.startswith('http') else base+dest);q.wait_for_timeout(350);text=q.locator('body').inner_text();assert response.status<400,(world,opt,response.status);assert 'This page could not be found' not in text,(world,opt);assert 'Application error' not in text,(world,opt)
   if not dest.startswith('http'):
    assert q.url.startswith(base),(world,opt,q.url);q.get_by_role('link',name='GAME TOWN',exact=True).click();q.wait_for_url(base+'/');q.locator('#gt-game').wait_for()
   elif opt['id']=='find':
    assert q.locator('body').inner_text();q.screenshot(path='/downloads/hub-deployed-film-launch390.png')
   print('PASS launch/back',world,opt['id'],dest,'errors',errors[:1],flush=True);q.close()
 Path('/tmp/hub-launch-map.json').write_text(json.dumps(out,indent=2));pg.close();b.close()
