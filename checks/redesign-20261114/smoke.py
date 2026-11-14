from playwright.sync_api import sync_playwright
import json,os
base=os.environ.get('BASE','http://localhost:3017')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 for w,h in [(390,844),(320,568)]:
  q=b.new_page(viewport={'width':w,'height':h});q.set_default_timeout(16000);seen={};errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(base);q.get_by_role('button',name='Movies Pick a film together',exact=True).wait_for();q.screenshot(path=f'/downloads/redesign-final-landing-{w}.png')
  for town in ['chess','trivia','logic','movie','checkers']:
   q.goto(base+'/?choose=mode&town='+town,wait_until='networkidle');q.get_by_role('radiogroup').wait_for();found=[]
   def check(stage):
    for el in q.locator('button:visible,a:visible').all():
     r=el.bounding_box();assert r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(town,w,stage,el.inner_text(),r)
    assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
    radios=q.get_by_role('radio')
    for n in range(radios.count()):
     radios.nth(n).click();link=q.locator('a[data-launch]');found.append((link.get_attribute('data-launch'),link.get_attribute('href')));assert radios.nth(n).get_attribute('aria-checked')=='true'
   check('primary');q.screenshot(path=f'/downloads/redesign-final-{town}-{w}.png')
   more=q.get_by_role('button',name='More ways to play',exact=True)
   if more.count():
    more.click();check('more')
    for n in range(6):
     nxt=q.get_by_role('button',name='Next',exact=True)
     if not nxt.count() or not nxt.is_enabled():break
     nxt.click();check('page'+str(n))
   seen[town]=found;print('PASS all radio selection/link/bounds',w,town,len(found),flush=True)
  assert len(seen['chess'])==13 and len(seen['trivia'])==7 and len(seen['movie'])==4 and len(seen['checkers'])==3 and len(seen['logic'])==2
  # Open all same-origin launch destinations, not just their tiles.
  for town,modes in seen.items():
   for mode,href in modes:
    if 'host=1' in href or mode=='checkers-battle' or href=='/battle':continue # Avoid opening unneeded hosted test rooms.
    r=q.goto(base+href,wait_until='domcontentloaded');assert r.status==200,(mode,r.status);q.locator('nav.gt-shared-nav').wait_for();assert town in q.locator('nav.gt-shared-nav .gt-town-back').get_attribute('href'),mode
  q.goto(base+'/movie/find');q.frame_locator('iframe').get_by_label('Claim your Game Town username',exact=True).wait_for();q.screenshot(path=f'/downloads/redesign-final-film-entry-{w}.png');q.locator('nav .gt-town-back').click();q.get_by_role('radiogroup').wait_for();assert 'Movie Town' in q.locator('h1').inner_text();q.get_by_role('button',name='All games',exact=False).click();q.get_by_role('button',name='Movies Pick a film together',exact=True).wait_for();print('PASS embedded film host-entry + Movie Town + all-games return',w,flush=True)
  q.get_by_role('button',name='Settings',exact=True).click();q.get_by_label('Reduce motion').check();q.get_by_label('Close',exact=True).click();q.reload();q.get_by_role('button',name='Settings',exact=True).click();assert q.get_by_label('Reduce motion').is_checked();q.screenshot(path=f'/downloads/redesign-final-settings-{w}.png');q.get_by_label('Close',exact=True).click();q.get_by_role('button',name='About Chester & Game Town').click();q.screenshot(path=f'/downloads/redesign-final-about-{w}.png');q.get_by_label('Close',exact=True).click();q.goto(base+'/movie/find');q.get_by_role('button',name='About Chester',exact=True).click();assert q.locator('.gt-guide-stub').is_visible();assert not q.locator('.gt-guide-stub input').count();q.screenshot(path=f'/downloads/redesign-final-guide-{w}.png');print('PASS local guide and settings',w,flush=True)
  assert not errors,errors
  if w==390:open('/tmp/redesign-mode-links.json','w').write(json.dumps(seen,indent=2))
 b.close()
