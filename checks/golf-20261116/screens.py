import os,sys,json,pathlib
from playwright.sync_api import sync_playwright,expect
out=pathlib.Path(os.environ.get('GOLF_SCREENSHOTS','/tmp/cove-screenshots'));out.mkdir(exist_ok=True)
base=os.environ.get('GOLF_URL','http://localhost:3036')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 errors=[]
 for w,h in [(320,568),(390,664),(430,932),(1200,850)]:
  c=b.new_context(viewport={'width':w,'height':h});q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/golf');expect(q.get_by_role('button',name='✦ THE TREASURE TRAIL',exact=False)).to_be_visible(timeout=60000);q.screenshot(path=str(out/f'menu-{w}.png'))
  print('menu',w,q.evaluate('({doc:document.documentElement.scrollHeight,h:innerHeight})'))
  q.get_by_role('button',name='✦ THE TREASURE TRAIL',exact=False).click();q.get_by_label('Captain name',exact=True).fill('Forrest Ranger');q.get_by_role('button',name='TAKE THE FIRST PUTT',exact=True).click();expect(q.get_by_role('button',name='PUTT · 47% POWER',exact=True)).to_be_enabled();q.screenshot(path=str(out/f'quest-{w}.png'))
  print('course svg',w,q.locator('svg[aria-label^="Mini golf"]').bounding_box())
  if w==390:
   q.get_by_label('Shot power',exact=True).fill('41');q.get_by_role('button',name='PUTT · 41% POWER',exact=True).click();q.wait_for_selector('[data-animating=false]',timeout=10000);print('after putt',q.locator('[data-phase]').get_attribute('data-phase'));q.screenshot(path=str(out/'putt-390.png'))
   before=q.evaluate('JSON.parse(localStorage.getItem("captains-cove-v1"))');q.reload();q.get_by_role('button',name='RESUME YOUR QUEST',exact=False).click();after=q.evaluate('JSON.parse(localStorage.getItem("captains-cove-v1"))');assert before['state']['rev']==after['state']['rev'];q.screenshot(path=str(out/'resume-390.png'))
  c.close()
 assert not errors,errors
 print('PASS menus/quest/real putt/save-resume no page errors')
 b.close()
