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
  state({'reset':True,'phase':'cards','real':True});c=context(320,568,'A');q=c.new_page()
  for i in range(25):
   try:q.goto('http://localhost:3011/find/TESTABCD');break
   except:time.sleep(.2)
  q.get_by_role('button',name='WANT',exact=True).wait_for();q.evaluate("localStorage.setItem('cs-find-last',localStorage.getItem('cs-find-seat-TESTABCD'))")
  q.get_by_role('button',name='Leave',exact=True).click();q.get_by_role('button',name='LEAVE & SAVE MY SEAT',exact=True).click();expect(q.get_by_role('heading',name='Find our film.',exact=True)).to_be_visible();assert q.url.endswith('/find');assert q.locator('footer a').count()==0
  q.get_by_role('link',name='RESUME TESTABCD AS Forrest',exact=True).click();q.get_by_role('button',name='WANT',exact=True).wait_for();assert q.url.endswith('/find/TESTABCD')
  q.get_by_role('button',name='ABOUT / CREDITS').click();q.get_by_role('button',name='BACK TO THE GAME',exact=True).click();assert q.url.endswith('/find/TESTABCD');print('PASS Leave/save -> current entry -> same-seat Resume; credits Back stays current; no legacy footer link',flush=True)
  c2=b.new_context(viewport={'width':320,'height':568});c2.route('**/api/find-room/*',lambda r:r.fulfill(json={'code':'TESTABCD','host':'Forrest','guestJoined':False}));g=c2.new_page();g.goto('http://localhost:3011/find/TESTABCD#invite='+('c'*64));g.get_by_role('link',name='Back to Find our film',exact=True).click();expect(g.get_by_role('heading',name='Find our film.',exact=True)).to_be_visible();assert g.url.endswith('/find');print('PASS guest Back returns current entry, no legacy route',flush=True)
  b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
