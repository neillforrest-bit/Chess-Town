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
  state({'reset':True,'phase':'cards','clean':True});c=context(320,568,'A');q=c.new_page()
  for n in range(30):
   try:q.goto('http://localhost:3011/find/TESTABCD');break
   except:time.sleep(.2)
  q.get_by_role('button',name='WANT',exact=True).wait_for();q.get_by_role('button',name='WANT',exact=True).click();expect(q.get_by_role('button',name='SAVED ✓',exact=True)).to_be_visible()
  c.unroute('**/api/find-room/*');c.route('**/api/find-room/*',lambda r:r.abort())
  q.get_by_role('button',name='MAYBE',exact=True).click();expect(q.locator('section [role=alert]')).to_be_visible();q.screenshot(path='/downloads/find-reconnect-320.png')
  for name in ['FULL DETAILS','SAVE FOR LATER','SAVED ✓','CHOOSE MY NOMINEES']:
   control=q.get_by_role('button',name=name,exact=True)
   if control.count():
    box=control.bounding_box();assert box and box['y']+box['height']<550,(name,box)
  dims=q.locator('article').locator('..').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');assert dims['s']<=dims['c']+1,dims
  c.unroute('**/api/find-room/*');c.route('**/api/find-room/*',handler);q.get_by_role('button',name='Reconnect',exact=True).click();expect(q.locator('section [role=alert]')).not_to_be_visible();expect(q.get_by_role('button',name='SAVED ✓',exact=True)).to_be_visible();print('PASS network interruption retains save, reconnect no reset,320 card controls fit. Fixture backend only.');b.close()

finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
