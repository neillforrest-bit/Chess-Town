from playwright.sync_api import sync_playwright,expect
import subprocess,json,time,os,signal
ROOT='/home/sandbox/ct-film'
server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-local.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
eng=subprocess.Popen(['node',ROOT+'/checks/find-our-film/harness.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
def handler(r):
 if r.request.method=='POST':
  body=json.loads(r.request.post_data or '{}');body['pid']='B' if r.request.headers.get('x-find-seat')=='b'*64 else 'A';r.fulfill(json=state(body))
 else:r.fulfill(json=state())
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);errors=[];paid=[]
  def context(w,h,pid):
   c=b.new_context(viewport={'width':w,'height':h});token=('b' if pid=='B' else 'a')*64
   c.add_init_script('localStorage.setItem(\'cs-find-seat-TESTABCD\','+json.dumps(json.dumps({'code':'TESTABCD','pid':pid,'name':'Jem' if pid=='B' else 'Forrest','token':token,'invite':'c'*64}))+');')
   c.route('**/api/find-room/*',handler);c.route('**/api/find-meta',lambda r:r.fulfill(json={'rt':92,'mc':81,'imdb':8.1,'awards':'Won 1 Oscar.'}));c.route('**/api/orson',lambda r:(paid.append(r.request.url),r.fulfill(json={'error':'disabled'})))
   return c
  for w,h in [(390,844),(375,667),(320,568)]:
   state({'reset':True,'phase':'cards'});c=context(w,h,'A');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
   for i in range(25):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.2)
   q.get_by_role('button',name='WANT',exact=True).wait_for();q.screenshot(path=f'/downloads/find-cards-{w}.png');dims=q.locator('main').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight,w:e.scrollWidth,cw:e.clientWidth})');print('FIT',w,dims,flush=True);assert dims['s']<=dims['c']+1 and dims['w']<=dims['cw']+1
   control=q.get_by_role('button',name='FULL SYNOPSIS & DETAILS');box=control.bounding_box();assert box and box['y']+box['height']<h-15,(w,box);control.click();q.get_by_role('button',name='REVIEWS',exact=True).click();q.screenshot(path=f'/downloads/find-details-{w}.png');q.get_by_role('button',name='BACK TO THE CARD').click()
   q.get_by_role('button',name='WANT',exact=True).click();q.wait_for_timeout(500);assert state()['saved']['A'];q.reload();assert state()['saved']['A']
   q.get_by_role('button',name='Leave',exact=True).click();q.get_by_role('button',name='STAY IN GAME').click();c.close()
  state({'reset':True,'phase':'cards','clean':True});c=context(320,568,'A');q=c.new_page();q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('button',name='WANT',exact=True).wait_for()
  # No optimistic advance when a save fails.
  q.route('**/api/find-room/*',lambda r:r.fulfill(status=503,json={'error':'QA injected save failure'}) if r.request.method=='POST' else handler(r));before=q.locator('article h2').inner_text();q.get_by_role('button',name='WANT',exact=True).click();expect(q.get_by_role('alert').filter(has_text='QA injected')).to_be_visible();assert q.locator('article h2').inner_text()==before;q.unroute('**/api/find-room/*');q.route('**/api/find-room/*',handler)
  for i in range(12):
   q.get_by_role('button',name='WANT',exact=True).click()
   if i<11:expect(q.locator('article h2')).to_have_text('Film '+str(900001+i))
  expect(q.get_by_role('button',name='LOCK MY NOMINEES')).to_be_visible();assert len(state()['saved']['A'])==12;q.screenshot(path='/downloads/find-lastcard-nominate320.png');b.close();print('PASS failed-save no advance; all12 responses auto-advance; last card opens nominees and retains all12 Want films',flush=True)
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
