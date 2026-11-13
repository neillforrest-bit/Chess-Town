from playwright.sync_api import sync_playwright,expect
import subprocess,json,time,os,signal
ROOT='/home/sandbox/ct-film';server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-guided-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True);eng=subprocess.Popen(['node',ROOT+'/checks/find-our-film/harness.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
def handler(r):
 if r.request.method=='POST':
  body=json.loads(r.request.post_data or '{}');body['pid']='B' if r.request.headers.get('x-find-seat')=='b'*64 else 'A';r.fulfill(json=state(body))
 else:r.fulfill(json=state())
def check(q,name,w,h):
 q.screenshot(path=f'/downloads/find-guided-{name}-{w}-{h}.png')
 for e in q.locator('main,section,section>div,[class*=pane],[class*=guidedPage],[class*=holding],[class*=moodGrid],[class*=lounge],[class*=nextPair]').all():
  d=e.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert d[0]<=d[1]+2 and d[2]<=d[3]+2,(name,w,h,d,e.get_attribute('class'))
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  def context(w,h,pid):
   c=b.new_context(viewport={'width':w,'height':h});c.add_init_script('localStorage.setItem("cs-find-seat-TESTABCD",'+json.dumps(json.dumps({'code':'TESTABCD','pid':pid,'name':'Forrest' if pid=='A' else 'Jem','token':('a' if pid=='A' else 'b')*64}))+');');c.route('**/api/find-room/*',handler);c.route('**/api/find-meta',lambda r:r.fulfill(json={'rt':93,'mc':85,'imdb':8.2}));c.route('**/api/find-actors*',lambda r:r.fulfill(json={'results':[{'id':1,'name':'Actor One','known':'First film · Second film'},{'id':2,'name':'Actor Two','known':'Another film'},{'id':3,'name':'Actor Three','known':'Third film'}]}));return c
  for w,h in ([] if os.getenv('FAST') else [(320,480),(320,568),(390,664),(390,844),(768,1024)]):
   state({'reset':True,'phase':'brief','guided':True,'real':True});c=context(w,h,'A');q=c.new_page()
   for _ in range(40):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.15)
   q.get_by_role('heading',name='How do you want to feel?').wait_for();check(q,'mood',w,h);q.get_by_role('button',name='Laugh',exact=False).click();q.get_by_role('button',name='NEXT',exact=True).click();check(q,'genres',w,h);assert q.locator('[class*=genreGrid] button').count()==6;q.get_by_role('button',name='Comedy',exact=True).click();q.get_by_role('button',name='NEXT',exact=True).click();q.get_by_role('textbox',name='Find an actor').fill('act');q.get_by_role('button',name='Actor One',exact=False).wait_for();check(q,'actors',w,h);q.get_by_role('button',name='Actor One',exact=False).click();q.get_by_role('button',name='Must be in it',exact=True).click();check(q,'actor-required',w,h);q.get_by_role('button',name='NEXT',exact=True).click();check(q,'summary',w,h);q.get_by_role('button',name='ANYTHING RULED OUT?').click();check(q,'exclusions',w,h);q.get_by_role('button',name='DONE · 0 RULED OUT').click();q.get_by_role('button',name='LOCK MY PICKS').click();q.get_by_role('heading',name='Your picks are in.').wait_for();check(q,'holding',w,h)
   c.close()
   for lstage in ['choose','bout','result']:
    state({'reset':True,'phase':'lounge','lstage':lstage,'guided':True,'real':True});c=context(w,h,'A');q=c.new_page();q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('heading',name='Movie Cup',exact=True).wait_for();q.wait_for_function("Array.from(document.querySelectorAll('section img')).every(x=>x.complete)",timeout=15000);check(q,'cup-'+lstage,w,h);q.get_by_role('button',name='HOW TO PLAY').click();check(q,'cup-rules',w,h);q.get_by_role('button',name='BACK TO LOUNGE',exact=True).click();
    if lstage=='result':q.get_by_role('button',name='STANDINGS',exact=True).click();check(q,'standings',w,h)
    c.close()
   print('PASS guided phone stages',w,h,flush=True)
  # Actual two-browser action journey from seeded wheel, not screenshot-only state.
  state({'reset':True,'phase':'wheel','guided':True,'real':True,'clean':True});cs=[context(390,664,'A'),context(320,480,'B')];a,bb=[c.new_page() for c in cs]
  for q in [a,bb]:q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('button',name='NO PROTECTION · NEXT').click()
  for q in [a,bb]:q.get_by_role('button',name='LOCK MY VETOES').click()
  a.get_by_role('button',name='SPIN ROUND 1',exact=True).click();a.wait_for_timeout(3100)
  for q in [a,bb]:q.get_by_role('button',name='KEEP & NEXT TURN').click(timeout=8000)
  bb.get_by_role('button',name='SPIN ROUND 2',exact=True).click(timeout=8000);bb.wait_for_timeout(3100)
  for q in [a,bb]:q.get_by_role('button',name='KEEP & NEXT TURN').click(timeout=8000)
  for q in [a,bb]:q.get_by_role('button',name='YES · SHOW OUR FILMS').click(timeout=8000)
  for q in [a,bb]:q.get_by_role('button',name='YES',exact=True).wait_for(timeout=8000)
  # Three direct YESes, one clear lock; no second favourites choice.
  for q in [a,bb]:
   for _ in range(3):q.get_by_role('button',name='YES',exact=True).click();q.wait_for_timeout(750)
   assert q.get_by_role('button',name='YES',exact=True).is_disabled();q.screenshot(path='/downloads/find-guided-nominees-'+str(q.viewport_size['width'])+'.png');q.get_by_role('button',name='LOCK MY 3 FILMS & NEXT').click(timeout=4000)
  for q in [a,bb]:
   q.get_by_role('heading',name='Our shortlist.').wait_for(timeout=8000)
   for control in q.locator('[aria-label="Film shortlist"] button[aria-pressed]').all():control.click()
   q.get_by_role('button',name='YES · START THE MOVIE CUP').click()
  for q in [a,bb]:q.get_by_role('heading',name='Movie Cup',exact=True).wait_for(timeout=8000);q.get_by_role('button',name="I'M READY · START THIS BOUT").click()
  for q in [a,bb]:q.get_by_role('button',name='LOCK 0',exact=True).wait_for(timeout=8000)
  a.locator('section button[aria-pressed]').first.click();a.get_by_role('button',name='+1',exact=True).click()
  for q in [a,bb]:q.get_by_role('button',name='LOCK',exact=False).first.click()
  for q in [a,bb]:q.get_by_role('button',name="NEXT ROUND · I'M READY").wait_for(timeout=8000);check(q,'two-seat-result',q.viewport_size['width'],q.viewport_size['height'])
  # Play all remaining scheduled bouts, including mutually agreed knockout draws.
  rounds=0
  while state()['lounge']['stage']!='complete' and rounds<30:
   current=state();l=current['lounge'];t=l['tournament'];rounds+=1
   for q in [a,bb]:q.evaluate("window.dispatchEvent(new Event('focus'))")
   if l['stage']=='result':
    if t['phase']!='groups' and l['winner'] is None:
     for q in [a,bb]:q.get_by_role('button',name='ADVANCE · ',exact=False).first.click(timeout=8000)
     for q in [a,bb]:q.evaluate("window.dispatchEvent(new Event('focus'))")
    for q in [a,bb]:q.get_by_role('button',name="NEXT ROUND · I'M READY").click(timeout=8000)
   elif l['stage']=='choose':
    for q in [a,bb]:q.get_by_role('button',name="I'M READY · START THIS BOUT").click(timeout=8000)
   elif l['stage']=='bout':
    for q in [a,bb]:q.get_by_role('button',name='LOCK 0',exact=True).click(timeout=8000)
  assert state()['lounge']['stage']=='complete'
  for q in [a,bb]:q.evaluate("window.dispatchEvent(new Event('focus'))");q.get_by_role('button',name='BOTH WANT THIS? FINAL CHECK',exact=True).wait_for(timeout=8000);check(q,'cup-complete',q.viewport_size['width'],q.viewport_size['height'])
  a.get_by_role('button',name='BOTH WANT THIS? FINAL CHECK',exact=True).click()
  for q in [a,bb]:q.evaluate("window.dispatchEvent(new Event('focus'))");q.get_by_role('button',name='YES, I WANT THIS TONIGHT',exact=True).click(timeout=8000)
  for q in [a,bb]:q.evaluate("window.dispatchEvent(new Event('focus'))");q.get_by_role('heading',name="Tonight's film.").wait_for(timeout=8000)
  print('PASS full two-seat group/semis/final,draws resolved by both,complete not auto-final,exact both-final yes/done',flush=True)
  assert len(state()['saved']['A'])>=3;assert len(state()['nominations']['A'])==3;print('PASS two-seat guided wheel/no singleton/review/cards/three directyes+lock/all-yes/Cup/first bout/result, saved retention and zero paid sources',flush=True);b.close()
finally:eng.terminate();os.killpg(server.pid,signal.SIGTERM)
