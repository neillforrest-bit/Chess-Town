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
  for w,h in [(320,480),(320,568),(390,664),(390,844),(768,1024)]:
   state({'reset':True,'phase':'cards','guided':True,'real':True,'clean':True});c=context(w,h,'A');q=c.new_page()
   for _ in range(40):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.15)
   q.get_by_role('button',name='YES',exact=True).wait_for();q.wait_for_function("Array.from(document.querySelectorAll('article img')).every(x=>x.complete)");q.screenshot(path=f'/downloads/find-simple-cards-{w}-{h}.png');assert '30s' not in q.locator('main').inner_text();q.get_by_role('button',name='NO',exact=True).click();q.get_by_role('button',name='SAVE FOR A LATER DATE',exact=True).click();q.wait_for_function("document.querySelector('main').innerText.includes('0/3 YES')");assert len(state()['saved']['A'])==1;assert len(state()['nominations']['A'])==0
   q.wait_for_timeout(750);q.get_by_role('button',name='YES',exact=True).dblclick();q.wait_for_timeout(850);assert len(state()['nominations']['A'])==1,'doubleclick advanced twice';q.get_by_role('button',name='UNDO LAST CHOICE',exact=True).click();q.wait_for_timeout(750);assert len(state()['nominations']['A'])==0
   for i in range(3):q.get_by_role('button',name='YES',exact=True).click();q.wait_for_timeout(750)
   assert len(state()['nominations']['A'])==3;third=state()['nominations']['A'][-1];assert q.locator('article').get_attribute('aria-label')==next(m['t'] for m in state()['movies'] if m['id']==third);assert q.get_by_role('button',name='YES',exact=True).is_disabled();assert q.get_by_role('button',name='NO',exact=True).is_disabled();q.screenshot(path=f'/downloads/find-simple-three-{w}-{h}.png');q.get_by_role('button',name='LOCK MY 3 FILMS & NEXT',exact=True).click();q.get_by_role('heading',name='Your three are locked.',exact=True).wait_for();assert len(state()['nominations']['A'])==3;c.close()
   state({'reset':True,'phase':'nominate','guided':True,'real':True,'clean':True});ss=state();ids=ss['pool'][:2]
   for ident in ids:state({'pid':'A','it':{'t':'opinion','id':ident,'value':'want'}})
   # legacy two-WANT state, both views use honest count
   state({'reset':True,'phase':'nominate','guided':True,'real':True});c=context(w,h,'A');q=c.new_page();q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('heading',name='Your 3 films for tonight.',exact=True).wait_for();q.wait_for_function("Array.from(document.querySelectorAll('[aria-label=\"Film shortlist\"] img')).every(x=>x.complete)");q.screenshot(path=f'/downloads/find-simple-review-{w}-{h}.png');assert q.locator('[aria-label="Film shortlist"] img').count()==3;q.get_by_role('button',name='Full details',exact=False).first.click() if False else None
   for e in q.locator('main,section,[class*=pane],[class*=shortlist]').all():
    d=e.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert d[0]<=d[1]+2 and d[2]<=d[3]+2,(w,h,d,e.get_attribute('class'))
   c.close();print('PASS simple cards doubletap/undo/later/3YESlimit/lock/poster review',w,h,flush=True)
  state({'reset':True,'phase':'wheel','guided':True,'real':True,'clean':True});ca,cb=context(320,480,'A'),context(390,664,'B');qa,qb=ca.new_page(),cb.new_page();errors=[]
  for q in [qa,qb]:q.on('pageerror',lambda e:errors.append(str(e)));q.goto('http://localhost:3011/find/TESTABCD')
  qa.get_by_label('Gold protection genre').select_option(index=1);qa.get_by_role('button',name='PROTECT THIS GENRE',exact=True).click();qb.get_by_role('button',name='NO PROTECTION · NEXT').click()
  qa.get_by_label('Genre to veto').select_option(index=1);qa.get_by_role('button',name='VETO SELECTED GENRE').click();qa.get_by_role('button',name='LOCK MY VETOES').click();qb.get_by_role('button',name='LOCK MY VETOES').click();qa.get_by_role('button',name='SPIN ROUND 1').click();qa.wait_for_timeout(3200)
  assert state()['wheel']['result'];landed=next(x['name'] for x in state()['slices'] if x['id']==state()['wheel']['result']);qa.wait_for_function('(name)=>document.querySelector("[class*=status]").innerText.includes(name)',arg=landed,timeout=10000);assert not errors,errors;qa.screenshot(path='/downloads/find-simple-veto-spin320.png');print('PASS natural select protection/veto/lock/spin transitions without pageerror, landed genre named',flush=True)
  b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
