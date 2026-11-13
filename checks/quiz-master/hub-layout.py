import subprocess,time,requests,json
from playwright.sync_api import sync_playwright
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],stdout=open('/tmp/hub-dev.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(120):
  try:
   if requests.get('http://localhost:3103/').ok:break
  except:pass
  time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(320,568),(390,844),(768,1024)]:
   pg=b.new_page(viewport={'width':w,'height':h});pg.goto('http://localhost:3103/');pg.screenshot(path=f'/downloads/hub-new-home{w}.png');bad=[]
   for tab in ['Town guide','Get started']:
    pg.get_by_role('button',name=tab,exact=True).click();assert pg.locator('.good-together-hub').evaluate('(e)=>e.scrollHeight<=e.clientHeight+2')
   worlds=pg.locator('#gt-game option').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')
   for world in worlds:
    pg.goto('http://localhost:3103/');pg.locator('#gt-game').select_option(world);pg.get_by_role('button',name='Enter ',exact=False).click();pg.locator('#gt-mode').wait_for()
    options=pg.locator('#gt-mode option').evaluate_all('(es)=>es.map(e=>e.value)')
    for option in options:
     pg.locator('#gt-mode').select_option(option)
     r=pg.locator('.good-together-hub').evaluate('''e=>{let intro=e.querySelector('section[aria-live]'),f=e.querySelector('footer'),cta=e.querySelector('a[data-launch]');return {scroll:e.scrollHeight,client:e.clientHeight,introScroll:intro.scrollHeight,introClient:intro.clientHeight,ctaBottom:cta.getBoundingClientRect().bottom,footer:f.getBoundingClientRect().bottom}}''')
     if r['scroll']>r['client']+2 or r['introScroll']>r['introClient']+2 or r['footer']>h+1:bad.append([world,option,r])
    if world in ['movie','trivia','chess']:pg.locator('#gt-mode').select_option(options[0]);pg.screenshot(path=f'/downloads/hub-new-{world}{w}.png')
   print(w,'bad',json.dumps(bad),flush=True);pg.close()
  b.close()
finally:s.terminate();s.wait()
