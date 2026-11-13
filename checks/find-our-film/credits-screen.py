from playwright.sync_api import sync_playwright,expect
import subprocess,time,os,signal,json
ROOT='/home/sandbox/ct-film';server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-local.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  c=b.new_context(viewport={'width':320,'height':568});q=c.new_page()
  for n in range(40):
   try:q.goto('http://localhost:3011/find');break
   except:time.sleep(.2)
  q.get_by_role('button',name='ABOUT / CREDITS').click();dialog=q.get_by_role('dialog');dialog.locator('img').evaluate('(e)=>e.decode()');q.screenshot(path='/downloads/find-credits-320.png');dims=dialog.locator('>div').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight,w:e.scrollWidth,cw:e.clientWidth})');assert dims['s']<=dims['c']+1 and dims['w']<=dims['cw']+1;print('PASS credits screen no overflow320',dims);b.close()
finally:os.killpg(server.pid,signal.SIGTERM)
