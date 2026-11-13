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
  for w,h in [(320,480),(320,568),(375,548),(390,664),(390,844),(768,1024)]:
   state({'reset':True,'phase':'wheel','real':True});c=context(w,h,'A');q=c.new_page()
   for _ in range(30):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.2)
   q.get_by_label('Gold protection genre').wait_for();q.screenshot(path=f'/downloads/find-genres-protect-{w}-{h}.png')
   def fits(stage):
    for e in q.locator('main,section,section>div,[class*=wheelStage]').all():
     d=e.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert d[0]<=d[1]+2 and d[2]<=d[3]+2,(stage,w,h,d)
    for e in q.locator('[class*=wheelStage] > *').all():
     bounds=e.bounding_box();parent=q.locator('[class*=wheelStage]').bounding_box();assert bounds['y']>=parent['y']-2 and bounds['y']+bounds['height']<=parent['y']+parent['height']+2,(stage,w,h,bounds,parent)
   fits('protect');q.get_by_role('button',name='SKIP GOLD & LOCK',exact=True).click();state({'pid':'B','it':{'t':'protectGenre','id':None,'done':True}});q.reload();q.get_by_label('Genre to veto').wait_for();fits('veto');q.screenshot(path=f'/downloads/find-genres-veto-{w}-{h}.png');q.get_by_role('button',name='LOCK MY VETOES',exact=True).click();state({'pid':'B','it':{'t':'vetoGenres','ids':[],'done':True}});q.reload();q.get_by_role('button',name='SPIN ROUND 1').wait_for();fits('spin');q.get_by_role('button',name='SPIN ROUND 1').click();q.wait_for_timeout(8500);fits('result');q.screenshot(path=f'/downloads/find-genres-result-{w}-{h}.png');c.close()
   state({'reset':True,'phase':'brief','narrow':True});c=context(w,h,'A');q=c.new_page();q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('button',name='REVIEW MY SAVED BRIEF').wait_for();fits('narrow');q.screenshot(path=f'/downloads/find-genres-narrow-{w}-{h}.png');c.close();print('FIT all4 stages and narrow brief',w,h,flush=True)
  b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
