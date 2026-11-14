import os,json,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('BASE','http://localhost:3181');out=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844});pg=c.new_page();pg.set_default_timeout(12000)
 for world in ['chess','trivia','logic','checkers','movie']:
  pg.goto(base+'/?town='+world+'&choose=mode');pg.locator('#gt-mode').wait_for();options=pg.locator('#gt-mode option').evaluate_all('(es)=>es.map(e=>({id:e.value,title:e.innerText}))')
  for opt in options:
   pg.locator('#gt-mode').select_option(opt['id']);href=pg.locator('a[data-launch]').get_attribute('href');q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.set_default_timeout(12000)
   try:
    r=q.goto(href if href.startswith('http') else base+href,wait_until='domcontentloaded',timeout=20000);q.wait_for_timeout(1100)
    x={'town':world,**opt,'href':href,'url':q.url,'http':r.status,'text':q.locator('body').inner_text(),'buttons':q.locator('button').all_text_contents(),'links':q.locator('a').evaluate_all('(es)=>es.map(e=>({text:e.innerText,href:e.href}))'),'errors':errors,'layout':q.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth,h:innerHeight,sh:document.documentElement.scrollHeight})')}
    path='/downloads/audit-'+world+'-'+opt['id']+'390.png';q.screenshot(path=path);x['screenshot']=path
    if not href.startswith('http'):
     q.get_by_role('link',name='GAME TOWN',exact=True).click();q.locator('#gt-game').wait_for();x['homeBack']=True
    else:x['homeBack']=any('town' in a['text'].lower() and 'game' in a['text'].lower() for a in x['links'])
    print(world,opt['id'],x['http'],'back',x['homeBack'],'errors',errors[:1],flush=True)
   except Exception as e:x={'town':world,**opt,'href':href,'error':str(e)};print('FAIL',world,opt['id'],str(e)[:180],flush=True)
   out.append(x);Path('/tmp/stage1-routes.json').write_text(json.dumps(out,indent=2));q.close()
  pg.get_by_role('button',name='Back to all games',exact=False).click();assert pg.locator('#gt-game').count()==1
 b.close()
