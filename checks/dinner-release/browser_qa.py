from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,time,json,os,sys
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:3026'
OUT=Path('/downloads/dinner-live');OUT.mkdir(exist_ok=True)
srv=subprocess.Popen(['npm','run','start','--','-p','3026'],cwd='/home/sandbox/gametown-dinner-live',stdout=open('/tmp/dinner-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True) if 'localhost' in BASE else None
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(375,667),(390,844),(430,932)]:
   page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));bounds=[]
   def snap(n):
    page.screenshot(path=str(OUT/f'{n}-{w}.png'))
    issues=page.evaluate("""()=>[...document.querySelectorAll('main button,main h1,main h2,main p,main nav')].filter(e=>e.getBoundingClientRect().height>0).filter(e=>{let r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight+2||r.right>innerWidth+1}).map(e=>e.innerText)""")
    if issues:bounds.append([n,issues])
   for attempt in range(20):
    try:page.goto(BASE);break
    except:time.sleep(.5)
   page.get_by_role('button',name='Dinner Choose').wait_for();snap('home');assert page.get_by_role('button',name='Town Hall',exact=False).count()==0
   page.get_by_role('button',name='Dinner Choose').click();page.get_by_role('radio',name='Solo or one shared phone').wait_for();snap('dinner-modes');page.locator('[data-launch=dinner-cook]').click();page.get_by_label('Who is deciding?').wait_for();snap('cook-setup')
   page.goto(''+BASE+'/dinner?door=order');page.get_by_label('Who is deciding?').select_option('1');page.get_by_role('button',name='DEAL 3 IDEAS').click();first=page.locator('article>b').all_text_contents()
   for article in page.locator('article').all():article.get_by_role('button',name='NOT TONIGHT').click()
   assert page.get_by_role('button',name='SKIPPED',exact=False).count()==3;snap('dinner-all-skipped');page.get_by_role('button',name='NONE OF THESE').click();second=page.locator('article>b').all_text_contents();assert not set(first)&set(second)
   page.get_by_role('button',name='NONE OF THESE').click();assert 'A fresh direction?' in page.inner_text('body');snap('dinner-exhausted');page.get_by_role('button',name='START AGAIN').click();assert page.locator('article').count()==3
   page.get_by_role('button',name='LOVE IT',exact=False).first.click();page.get_by_role('button',name='FIND OUR DINNER').click();assert 'DECISION: MADE' in page.inner_text('body')
   # Two diners can reject all options between them without an empty tie screen.
   page.goto(''+BASE+'/dinner?door=out');page.get_by_role('button',name='DEAL 3 IDEAS').click();page.locator('article').nth(0).get_by_role('button',name='LOVE IT').click();page.locator('article').nth(1).get_by_role('button',name='NOT TONIGHT').click();page.locator('article').nth(2).get_by_role('button',name='NOT TONIGHT').click();page.get_by_role('button',name='LOCK IT').click();page.get_by_role('button',name="I'M DINER 2").click();page.locator('article').nth(1).get_by_role('button',name='LOVE IT').click();page.locator('article').nth(0).get_by_role('button',name='NOT TONIGHT').click();page.get_by_role('button',name='FIND OUR DINNER').click();assert 'No shared yes.' in page.inner_text('body');snap('dinner-no-shared-yes')
   assert not errors,errors
   assert not bounds,bounds
   print(json.dumps({'viewport':[w,h],'errors':errors,'bounds':bounds,'flows':'hub,modechooser,cook-setup,rejectall,no-repeat,exhaust,restart,solo,pairconflict pass'}));page.close()
  b.close()
finally:
 if srv:
  import signal
  os.killpg(srv.pid,signal.SIGTERM)
