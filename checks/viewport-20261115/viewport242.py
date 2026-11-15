import subprocess,time,requests,os,signal
from playwright.sync_api import sync_playwright
os.makedirs('/downloads/viewport242',exist_ok=True)
s=subprocess.Popen(['npm','run','start','--','-p','3122'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/viewport242-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3122/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(364,597),(390,680),(320,568),(430,740)]:
   q=b.new_page(viewport={'width':w,'height':h});q.route('**/api/chester*',lambda r:r.abort());q.goto('http://localhost:3122/play-chester?mode=1v1');q.wait_for_timeout(1500);
   if q.get_by_role('button',name='START FRIEND GAME').count():q.get_by_role('button',name='START FRIEND GAME').click()
   print('BODY',q.locator('body').inner_text()[:500],flush=True)
   for name in ['START FRIEND GAME','LET’S PLAY','LET\'S PLAY','PLAY','START GAME','ROOKIE']:
    bt=q.get_by_role('button',name=name,exact=True)
    if bt.count():bt.click();break
   q.wait_for_timeout(4500);print('AFTER',q.locator('body').inner_text()[:500],flush=True)
   q.screenshot(path=f'/downloads/viewport242/chess-{w}-{h}.png');print(q.evaluate("()=>[...document.querySelectorAll('.gt-shared-nav,.chester-game,.chester-game>.chester-hud,.chester-board-frame,.chester-teleprompter,.chester-bottom')].map(x=>({c:x.className,top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom,height:x.getBoundingClientRect().height}))"),flush=True)
   if q.get_by_role('button',name='Open match menu',exact=True).count():
    bt=q.get_by_role('button',name='Open match menu',exact=True);assert bt.bounding_box()['y']>=55;bt.click();q.screenshot(path=f'/downloads/viewport242/menu-{w}-{h}.png');print('MENU',q.locator('body').inner_text()[-500:],flush=True);q.get_by_role('button',name='Close',exact=True).click();q.get_by_role('button',name='Board layouts and pieces',exact=True).click();q.screenshot(path=f'/downloads/viewport242/style-{w}-{h}.png');q.get_by_role('button',name='FOREST board',exact=True).click();q.get_by_role('button',name='gothic pieces',exact=True).click();q.get_by_role('button',name='Close style picker',exact=True).click();q.screenshot(path=f'/downloads/viewport242/changed-{w}-{h}.png')
   q.close()
  b.close()
finally:os.killpg(os.getpgid(s.pid),signal.SIGTERM);s.wait()
