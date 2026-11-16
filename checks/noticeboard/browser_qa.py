from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,os,signal,time,json
out=Path('/downloads/noticeboard');out.mkdir(exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3014'],cwd='/home/sandbox/gametown-direction',stdout=open('/tmp/notice-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':375,'height':667});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));issues=[]
  def snap(n):
   page.screenshot(path=str(out/(n+'.png')))
   vals=page.evaluate('''()=>{let r=document.querySelector('main').getBoundingClientRect();return [...document.querySelectorAll('main button,main h2,main article,main footer,main p')].filter(e=>e.getBoundingClientRect().height>0).filter(e=>{let b=e.getBoundingClientRect();return b.bottom>r.bottom+2||b.top<r.top-2||b.right>innerWidth+1}).map(e=>e.innerText)}''');
   if vals:issues.append([n,vals])
  for i in range(30):
   try:page.goto('http://localhost:3014/noticeboard');page.get_by_role('button',name='NEXT NOTE').wait_for(timeout=1000);break
   except:time.sleep(.2)
  for i in range(4):
   if i==1:page.get_by_role('button',name='REVEAL ANSWER').click();assert '65 points' in page.inner_text('body')
   page.get_by_role('button',name='◇ USEFUL').click();snap('note-'+str(i));assert 'Saved privately' in page.inner_text('body')
   if i<3:page.get_by_role('button',name='NEXT NOTE').click()
  assert page.get_by_role('button',name='ALL CAUGHT UP').is_disabled();page.get_by_role('button',name='SCOPE & CORRECTIONS').click();snap('scope');assert 'No public posts' in page.inner_text('body')
  assert page.locator('textarea,input').count()==0
  print(json.dumps({'errors':errors,'overflow':issues,'flows':'all4cards/reveal/localfeedback/end/scope/no-input pass'}));b.close()
finally:os.killpg(server.pid,signal.SIGTERM);server.wait()
