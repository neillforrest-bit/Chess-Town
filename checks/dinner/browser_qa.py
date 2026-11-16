from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,os,signal,time,json
out=Path('/downloads/dinner-town');out.mkdir(exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3012'],cwd='/home/sandbox/gametown-direction',stdout=open('/tmp/dinner-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':375,'height':667});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));issues=[]
  def snap(n):
   page.screenshot(path=str(out/(n+'.png')))
   vals=page.evaluate('''()=>{let r=document.querySelector('main').getBoundingClientRect();return [...document.querySelectorAll('main button,main select,main h2,main article,main footer')].filter(e=>e.getBoundingClientRect().height>0).filter(e=>{let b=e.getBoundingClientRect();return b.bottom>r.bottom+2||b.top<r.top-2||b.right>innerWidth+1}).map(e=>e.innerText)}''');
   if vals:issues.append([n,vals])
  for i in range(30):
   try:page.goto('http://localhost:3012/dinner');page.get_by_role('button',name='01 Cook').wait_for(timeout=1000);break
   except:time.sleep(.2)
  snap('home');page.get_by_role('button',name='01 Cook').click();snap('cook-setup');page.get_by_role('button',name='DEAL 3 IDEAS').click();snap('cook-vote')
  first=page.locator('article').first;first.get_by_role('button',name='LOVE IT').click();page.get_by_role('button',name='LOCK IT').click();snap('pass-phone');page.get_by_role('button',name="I'M DINER 2").click();page.locator('article').first.get_by_role('button',name='LOVE IT').click();page.get_by_role('button',name='FIND OUR DINNER').click();snap('cook-result');assert page.locator('input[type=checkbox]').count()>0
  page.locator('input[type=checkbox]').first.check();page.get_by_role('button',name="KEEP TONIGHT'S PLAN").click();assert 'Saved on this browser only' in page.inner_text('body')
  page.goto('http://localhost:3012/dinner?door=out');page.wait_for_selector('text=Set the mood.');snap('out-setup');page.get_by_label('Who is deciding?').select_option('1');page.get_by_role('button',name='DEAL 3 IDEAS').click();page.locator('article').first.get_by_role('button',name='LOVE IT').click();page.get_by_role('button',name='FIND OUR DINNER').click();snap('out-result');assert 'No restaurant or availability has been selected' in page.inner_text('body')
  # Force separate favourites so the explicit final choice is required.
  page.goto('http://localhost:3012/dinner?door=order');page.get_by_role('button',name='DEAL 3 IDEAS').click();page.locator('article').nth(0).get_by_role('button',name='LOVE IT').click();page.get_by_role('button',name='LOCK IT').click();page.get_by_role('button',name="I'M DINER 2").click();page.locator('article').nth(1).get_by_role('button',name='LOVE IT').click();page.get_by_role('button',name='FIND OUR DINNER').click();snap('tie-final');assert 'THE FINAL FORK' in page.inner_text('body')
  page.goto('http://localhost:3012/');page.get_by_role('button',name='Dinner One favourite',exact=False).wait_for();snap('town-home');page.get_by_role('button',name='Dinner One favourite',exact=False).click();snap('town-menu')
  print(json.dumps({'errors':errors,'overflow':issues,'flows':'cook/pair/save/order/tie/out/hub passed'}));b.close()
finally:os.killpg(server.pid,signal.SIGTERM);server.wait()
