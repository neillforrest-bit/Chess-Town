import subprocess,os,signal,time,requests,json
from playwright.sync_api import sync_playwright
server=subprocess.Popen(['npm','run','start','--','-p','3123'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/haywire242-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(80):
  try:
   if requests.get('http://localhost:3123/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);q=b.new_page(viewport={'width':320,'height':568});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto('http://localhost:3123/haywire');q.screenshot(path='/downloads/haywire242/desk320.png');q.get_by_label('Your name').fill('Solo QA');q.get_by_role('button',name='SOLO PRACTICE · LEARN THE LEVERS',exact=True).click();q.screenshot(path='/downloads/haywire242/lesson320.png');
  for i in range(3):
   q.screenshot(path=f'/downloads/haywire242/lesson{i+1}-320.png');q.get_by_role('button',name='NEXT',exact=True).click()
  q.screenshot(path='/downloads/haywire242/lesson4-320.png')
  q.get_by_role('button',name='START THE MACHINE',exact=True).click();q.wait_for_timeout(2200);before=q.evaluate('JSON.parse(localStorage.getItem("haywire-practice-v2")).remaining');q.reload();q.get_by_role('button',name='SOLO PRACTICE · LEARN THE LEVERS',exact=True).click();q.get_by_role('button',name=__import__('re').compile('LEVER A')).wait_for();after=q.evaluate('JSON.parse(localStorage.getItem("haywire-practice-v2")).remaining');assert abs(before-after)<1300,(before,after);print('PASS practice running clock restore',before,after,flush=True);q.screenshot(path='/downloads/haywire242/run320.png');print('RUN BODY',q.locator('main.hay').inner_text(),flush=True)
  def solve():
   s=q.evaluate('JSON.parse(localStorage.getItem("haywire-practice-v2"))');pairs=[[0,3],[1,4],[2,5]]
   for i,pair in enumerate(pairs):
    if any(not s['panels']['A'][n] for n in pair):q.get_by_role('button',name=__import__('re').compile('LEVER '+chr(65+i))).click();q.wait_for_timeout(220)
  solve();q.get_by_role('button',name='TAKE THE OTHER STATION',exact=True).wait_for();q.screenshot(path='/downloads/haywire242/swap320.png');q.get_by_role('button',name='TAKE THE OTHER STATION',exact=True).click();solve();q.get_by_role('button',name='ALL GREEN · TAP SEAL TOGETHER',exact=True).click();q.get_by_text('SEALED!',exact=True).wait_for();q.screenshot(path='/downloads/haywire242/result320.png');print('PASS actual practice solved,swap,new fault,sealed',flush=True)
  for w,h in [(390,844),(430,932)]:q.set_viewport_size({'width':w,'height':h});q.screenshot(path=f'/downloads/haywire242/result{w}.png');q.goto('http://localhost:3123/haywire');q.screenshot(path=f'/downloads/haywire242/desk{w}.png')
  q.get_by_role('button',name='SOLO PRACTICE · LEARN THE LEVERS',exact=True).click();q.get_by_text('SEALED!',exact=True).wait_for();print('PASS saved practice result fresh page,390/430 screens',flush=True);assert not errors,errors;b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
