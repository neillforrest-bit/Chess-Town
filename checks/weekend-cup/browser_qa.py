from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,os,signal,time,json
out=Path('/downloads/weekend-cup');out.mkdir(exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3013'],cwd='/home/sandbox/gametown-direction',stdout=open('/tmp/cup-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':375,'height':667});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));issues=[]
  def snap(n):
   page.screenshot(path=str(out/(n+'.png')))
   vals=page.evaluate('''()=>{let r=document.querySelector('main').getBoundingClientRect();return [...document.querySelectorAll('main button,main h2,main article,main footer,main p,main [role=status]')].filter(e=>e.getBoundingClientRect().height>0).filter(e=>{let b=e.getBoundingClientRect();return b.bottom>r.bottom+2||b.top<r.top-2||b.right>innerWidth+1}).map(e=>e.innerText)}''');
   if vals:issues.append([n,vals])
  for i in range(30):
   try:page.goto('http://localhost:3013/weekend-cup');page.get_by_role('button',name='WATCH IT RUN').wait_for(timeout=1000);break
   except:time.sleep(.2)
  snap('start')
  for i in range(8):page.get_by_role('button',name='STEP →').click()
  snap('resumed')
  page.get_by_role('button',name='WATCH IT RUN').click();page.wait_for_timeout(1450);page.get_by_role('button',name='PAUSE').click();snap('playing')
  page.get_by_role('button',name='JUMP TO FINAL').click();snap('final');assert page.locator('[class*=player]').count()==5;assert '60' in page.inner_text('body')
  page.get_by_role('button',name='TEST RECEIPTS',exact=True).click();snap('receipts');assert 'BLOCKED AS EXPECTED' in page.inner_text('body')
  page.get_by_role('button',name='WHAT IT PROVES',exact=True).click();snap('limits');assert 'server-validated answers still need building' in page.inner_text('body')
  page.get_by_role('button',name='RESET').click();assert '0/33' in page.inner_text('body')
  print(json.dumps({'errors':errors,'overflow':issues,'flows':'step/play/pause/final/receipts/rules/reset pass'}));b.close()
finally:os.killpg(server.pid,signal.SIGTERM);server.wait()
