from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,signal,time,json
OUT=Path('/downloads/townhall-v2');OUT.mkdir(exist_ok=True)
srv=subprocess.Popen(['npm','run','dev','--','-p','3016'],cwd='/home/sandbox/gametown-direction',stdout=open('/tmp/hall-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 import urllib.request
 for _ in range(60):
  try:urllib.request.urlopen('http://localhost:3016/');break
  except:time.sleep(.3)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(375,667),(390,844),(430,932)]:
   page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));bounds=[]
   def snap(n):
    page.screenshot(path=str(OUT/f'{n}-{w}.png'))
    issues=page.evaluate('''()=>[...document.querySelectorAll('main button,main h1,main h2,main p,main textarea,main nav')].filter(e=>e.getBoundingClientRect().height>0).filter(e=>{let r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight+2||r.right>innerWidth+1}).map(e=>e.innerText)''')
    if issues:bounds.append([n,issues])
   page.goto('http://localhost:3016/');page.get_by_role('link',name='TOWN HALL ·').wait_for();snap('home');page.get_by_role('link',name='Towns',exact=True).click();page.get_by_role('button',name='Dinner Choose').wait_for();snap('towns')
   page.goto('http://localhost:3016/dinner?door=order');page.get_by_label('Who is deciding?').select_option('1');page.get_by_role('button',name='DEAL 3 IDEAS').click();first=page.locator('article>b').all_text_contents()
   for article in page.locator('article').all():article.get_by_role('button',name='NOT TONIGHT').click()
   assert page.get_by_role('button',name='SKIPPED',exact=False).count()==3;snap('dinner-all-skipped');page.get_by_role('button',name='NONE OF THESE').click();second=page.locator('article>b').all_text_contents();assert not set(first)&set(second)
   page.get_by_role('button',name='NONE OF THESE').click();assert 'A fresh direction?' in page.inner_text('body');snap('dinner-exhausted');page.get_by_role('button',name='START AGAIN').click();assert page.locator('article').count()==3
   page.get_by_role('button',name='LOVE IT',exact=False).first.click();page.get_by_role('button',name='FIND OUR DINNER').click();assert 'DECISION: MADE' in page.inner_text('body')
   # Two diners can reject all options between them without an empty tie screen.
   page.goto('http://localhost:3016/dinner?door=out');page.get_by_role('button',name='DEAL 3 IDEAS').click();page.locator('article').nth(0).get_by_role('button',name='LOVE IT').click();page.locator('article').nth(1).get_by_role('button',name='NOT TONIGHT').click();page.locator('article').nth(2).get_by_role('button',name='NOT TONIGHT').click();page.get_by_role('button',name='LOCK IT').click();page.get_by_role('button',name="I'M DINER 2").click();page.locator('article').nth(1).get_by_role('button',name='LOVE IT').click();page.locator('article').nth(0).get_by_role('button',name='NOT TONIGHT').click();page.get_by_role('button',name='FIND OUR DINNER').click();assert 'No shared yes.' in page.inner_text('body');snap('dinner-no-shared-yes')
   page.goto('http://localhost:3016/noticeboard');page.get_by_role('button',name='All',exact=True).wait_for();snap('hall-list');assert page.locator('button').filter(has_text='READ POST').count()==3
   page.get_by_role('button',name='MORE POSTS').click();snap('hall-more');page.get_by_role('button',name='Food news',exact=True).click();assert page.locator('button').filter(has_text='READ POST').count()==1;snap('hall-food');page.get_by_role('button',name='READ POST',exact=False).click();snap('hall-post');page.get_by_role('button',name='♡ LIKE',exact=True).click();page.get_by_role('button',name='NOT FOR ME',exact=True).click();assert page.get_by_role('button',name='NOT FOR ME',exact=True).get_attribute('aria-pressed')=='true'
   page.get_by_role('button',name='COMMENT',exact=False).click();page.get_by_label('Your comment').fill('A thoughtful local test, not a public post.');snap('hall-composer');page.get_by_role('button',name='SAVE LOCAL COMMENT').click();assert 'A thoughtful local test' in page.inner_text('body');snap('hall-comment');page.get_by_role('button',name='FLAG DEMO AUTHOR',exact=False).click();snap('hall-flag');page.get_by_role('button',name='CONFIRM LOCAL FLAG').click();assert 'No report sent' in page.inner_text('body');snap('hall-flagged')
   page.reload();page.get_by_role('button',name='Food news',exact=True).click();page.get_by_role('button',name='READ POST',exact=False).click();assert 'A thoughtful local test' in page.inner_text('body');assert 'DEMO AUTHOR FLAGGED' in page.inner_text('body');page.get_by_role('button',name='THE TOWN CODE').click();snap('hall-code');assert 'Review owner: Forrest' in page.inner_text('body')
   print(json.dumps({'viewport':[w,h],'errors':errors,'bounds':bounds,'flows':'dinner rejectall/no-repeat/exhaust/restart/solo/pairconflict,hubtabs,hallpagination/filters/reactions/comments/flags/reload/code pass'}));page.close()
  b.close()
finally:os.killpg(srv.pid,signal.SIGTERM);srv.wait()
